import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';
import { TelegramLinkTokenService, GenerateTokenDTO } from './TelegramLinkTokenService';
import crypto from 'crypto';
import { AuditLogService } from './AuditLogService';
import { Prisma } from '@prisma/client';

export class TelegramLinkService {
  private tokenService: TelegramLinkTokenService;

  constructor() {
    this.tokenService = new TelegramLinkTokenService();
  }

  private hashIdentifier(identifier: string): string {
    const secret = process.env.TELEGRAM_IDENTIFIER_HASH_SECRET;
    if (!secret) {
      throw new AppError('TELEGRAM_IDENTIFIER_HASH_SECRET is not configured', 500);
    }
    return crypto.createHmac('sha256', secret).update(identifier).digest('hex');
  }

  /**
   * Gera link de pareamento user-first.
   * O vínculo é do usuário, não de um workspace específico.
   * Destino default é totalmente opcional.
   */
  public async generateLink(data: GenerateTokenDTO): Promise<{ pairingCode: string; botUsername: string; expiresAt: Date }> {
    // Se forneceu destino default, valida membership e consistência
    if (data.defaultWorkspaceId !== undefined) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: data.userId, workspaceId: data.defaultWorkspaceId } },
      });

      if (!membership) {
        throw new AppError('Usuário não é membro do workspace informado', 403);
      }

      if (data.defaultAccountId !== undefined) {
        const account = await prisma.account.findUnique({
          where: { id: data.defaultAccountId },
        });

        if (!account || account.workspaceId !== data.defaultWorkspaceId) {
          throw new AppError('Conta inválida ou não pertence ao workspace', 400);
        }
      }

      if (data.defaultExpenseCategoryId !== undefined) {
        const expenseCategory = await prisma.category.findUnique({
          where: { id: data.defaultExpenseCategoryId },
        });

        if (
          !expenseCategory ||
          (expenseCategory.workspaceId !== null && expenseCategory.workspaceId !== data.defaultWorkspaceId)
        ) {
          throw new AppError('Categoria de despesa inválida', 400);
        }
      }

      if (data.defaultIncomeCategoryId !== undefined) {
        const incomeCategory = await prisma.category.findUnique({
          where: { id: data.defaultIncomeCategoryId },
        });

        if (
          !incomeCategory ||
          (incomeCategory.workspaceId !== null && incomeCategory.workspaceId !== data.defaultWorkspaceId)
        ) {
          throw new AppError('Categoria de receita inválida', 400);
        }
      }
    }

    const { code, expiresAt } = await this.tokenService.generateToken(data);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      throw new AppError('TELEGRAM_BOT_USERNAME is not configured', 500);
    }

    return { pairingCode: code, botUsername, expiresAt };
  }

  /**
   * Processa o código numérico enviado para o bot.
   * Cria TelegramUserLink para o userId — não para o workspace.
   * Revoga vínculo ACTIVE anterior do mesmo chat de forma atômica.
   */
  public async consumeCode(
    code: string,
    chatId: string,
    telegramUserId?: string,
    telegramUsername?: string,
  ): Promise<boolean> {
    const payload = await this.tokenService.verifyAndConsumeToken(code);

    const telegramChatIdHash = this.hashIdentifier(chatId);
    const telegramUserIdHash = telegramUserId ? this.hashIdentifier(telegramUserId) : null;

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let hasDestination = false;
      // Revogar qualquer vínculo ACTIVE anterior do mesmo chat (1 chat = 1 vínculo ACTIVE)
      const activeLinks = await tx.telegramUserLink.findMany({
        where: { telegramChatIdHash, status: 'ACTIVE' },
      });

      for (const link of activeLinks) {
        await tx.telegramUserLink.update({
          where: { id: link.id },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });

        const linkMembership = await tx.workspaceMember.findFirst({
          where: { userId: link.userId },
        });

        if (linkMembership) {
          await AuditLogService.logSync({
            userId: link.userId,
            workspaceId: linkMembership.workspaceId,
            action: 'TELEGRAM_LINK_REVOKED' as any,
            entity: 'TelegramUserLink',
            entityId: link.id,
          }, tx);
        }
      }

      // Criar novo vínculo user-first
      const newLink = await tx.telegramUserLink.create({
        data: {
          telegramChatIdHash,
          telegramUserIdHash,
          telegramUsername,
          userId: payload.userId,
          status: 'ACTIVE',
        },
      });

      // Criar destino default se o token continha informações de destino
      if (payload.defaultWorkspaceId && payload.defaultAccountId) {
        const dest = await tx.telegramDestination.create({
          data: {
            telegramUserLinkId: newLink.id,
            userId: payload.userId,
            workspaceId: payload.defaultWorkspaceId,
            accountId: payload.defaultAccountId,
            defaultExpenseCategoryId: payload.defaultExpenseCategoryId,
            defaultIncomeCategoryId: payload.defaultIncomeCategoryId,
            isDefault: true,
            status: 'ACTIVE',
          },
        });

        await tx.telegramUserLink.update({
          where: { id: newLink.id },
          data: { activeDestinationId: dest.id },
        });

        hasDestination = true;
      }

      const firstMembership = await tx.workspaceMember.findFirst({
        where: { userId: payload.userId },
      });
      const logWorkspaceId = payload.defaultWorkspaceId || firstMembership?.workspaceId;

      if (logWorkspaceId) {
        await AuditLogService.logSync({
          userId: payload.userId,
          workspaceId: logWorkspaceId,
          action: 'TELEGRAM_LINK_CREATED' as any,
          entity: 'TelegramUserLink',
          entityId: newLink.id,
        }, tx);
      }

      // Check if user already has any active destinations, even if not created here
      // But wait, this is a new link, so destinations are tied to the link.
      // We just created it, so there are no other destinations.
      return hasDestination;
    });
  }

  /**
   * Revoga um TelegramUserLink pelo id.
   * Valida que o link pertence ao userId autenticado.
   */
  public async revokeLink(id: string, userId: number): Promise<void> {
    const link = await prisma.telegramUserLink.findUnique({
      where: { id },
    });

    if (!link || link.userId !== userId) {
      throw new AppError('Vínculo não encontrado', 404);
    }

    if (link.status === 'REVOKED') {
      return; // Idempotent
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.telegramUserLink.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      // Revogar também os destinos ativos do vínculo
      await tx.telegramDestination.updateMany({
        where: { telegramUserLinkId: id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      const firstMembership = await tx.workspaceMember.findFirst({
        where: { userId },
      });

      if (firstMembership) {
        await AuditLogService.logSync({
          userId,
          workspaceId: firstMembership.workspaceId,
          action: 'TELEGRAM_LINK_REVOKED' as any,
          entity: 'TelegramUserLink',
          entityId: id,
        }, tx);
      }
    });
  }

  /**
   * Retorna o vínculo ativo do usuário autenticado com destinos, usando userId.
   */
  public async getStatusForUser(userId: number): Promise<{
    link: {
      id: string;
      status: string;
      telegramUsername: string | null;
      createdAt: Date;
      revokedAt: Date | null;
    } | null;
    destinations: Array<{
      id: string;
      workspaceId: number;
      accountId: number;
      defaultExpenseCategoryId: number | null;
      defaultIncomeCategoryId: number | null;
      label: string | null;
      isDefault: boolean;
      status: string;
    }>;
  }> {
    const activeLink = await prisma.telegramUserLink.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        telegramUsername: true,
        createdAt: true,
        revokedAt: true,
        activeDestinationId: true,
      },
    });

    return this.getDestinationsForLink(activeLink);
  }

  /**
   * Retorna o vínculo ativo usando o chatId (para uso do bot).
   */
  public async getStatusByChatId(chatId: string): Promise<{
    link: {
      id: string;
      userId: number;
      status: string;
      telegramUsername: string | null;
      createdAt: Date;
      revokedAt: Date | null;
    } | null;
    destinations: Array<{
      id: string;
      workspaceId: number;
      accountId: number;
      defaultExpenseCategoryId: number | null;
      defaultIncomeCategoryId: number | null;
      label: string | null;
      isDefault: boolean;
      status: string;
    }>;
  }> {
    const telegramChatIdHash = this.hashIdentifier(chatId);
    const activeLink = await prisma.telegramUserLink.findFirst({
      where: { telegramChatIdHash, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        telegramUsername: true,
        createdAt: true,
        revokedAt: true,
        activeDestinationId: true,
      },
    });

    return this.getDestinationsForLink(activeLink);
  }

  private async getDestinationsForLink(activeLink: any) {
    if (!activeLink) {
      return { link: null, destinations: [] };
    }

    const destinations = await prisma.telegramDestination.findMany({
      where: { telegramUserLinkId: activeLink.id, status: 'ACTIVE' },
      select: {
        id: true,
        workspaceId: true,
        accountId: true,
        defaultExpenseCategoryId: true,
        defaultIncomeCategoryId: true,
        label: true,
        isDefault: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const mappedDestinations = destinations.map(d => ({
      ...d,
      isDefault: activeLink.activeDestinationId === d.id,
    }));

    return {
      link: {
        id: activeLink.id,
        userId: activeLink.userId,
        status: activeLink.status,
        telegramUsername: activeLink.telegramUsername,
        createdAt: activeLink.createdAt,
        revokedAt: activeLink.revokedAt,
      },
      destinations: mappedDestinations
    };
  }

  /**
   * Cria um novo destino para um vínculo ativo do usuário.
   */
  public async createDestination(
    userId: number,
    data: {
      workspaceId: number;
      accountId: number;
      defaultExpenseCategoryId?: number;
      defaultIncomeCategoryId?: number;
      label?: string;
      isDefault?: boolean;
    }
  ): Promise<{ id: string }> {
    const activeLink = await prisma.telegramUserLink.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!activeLink) {
      throw new AppError('Nenhum vínculo Telegram ativo encontrado', 404);
    }

    // Validar membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: data.workspaceId } },
    });

    if (!membership) {
      throw new AppError('Usuário não é membro do workspace informado', 403);
    }

    // Validar account
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account || account.workspaceId !== data.workspaceId) {
      throw new AppError('Conta inválida ou não pertence ao workspace', 400);
    }

    // Validar category
    if (data.defaultExpenseCategoryId) {
      const expenseCategory = await prisma.category.findUnique({
        where: { id: data.defaultExpenseCategoryId },
      });
      if (!expenseCategory || (expenseCategory.workspaceId !== null && expenseCategory.workspaceId !== data.workspaceId)) {
        throw new AppError('Categoria de despesa inválida', 400);
      }
    }
    if (data.defaultIncomeCategoryId) {
      const incomeCategory = await prisma.category.findUnique({
        where: { id: data.defaultIncomeCategoryId },
      });
      if (!incomeCategory || (incomeCategory.workspaceId !== null && incomeCategory.workspaceId !== data.workspaceId)) {
        throw new AppError('Categoria de receita inválida', 400);
      }
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Se isDefault for true, limpa o isDefault dos outros destinos deste link?
      // Pelo schema, isDefault é bool na destination E activeDestinationId no TelegramUserLink.
      // A lógica antiga atualiza o activeDestinationId no link.

      const dest = await tx.telegramDestination.create({
        data: {
          telegramUserLinkId: activeLink.id,
          userId,
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          defaultExpenseCategoryId: data.defaultExpenseCategoryId,
          defaultIncomeCategoryId: data.defaultIncomeCategoryId,
          label: data.label,
          status: 'ACTIVE',
        },
      });

      // Se explicitly marked as default OR if there's no activeDestinationId
      if (data.isDefault || !activeLink.activeDestinationId) {
        await tx.telegramUserLink.update({
          where: { id: activeLink.id },
          data: { activeDestinationId: dest.id },
        });
      }

      await AuditLogService.logSync({
        userId,
        workspaceId: data.workspaceId,
        action: 'UPDATE' as any,
        entity: 'TelegramDestination',
        entityId: dest.id,
      }, tx);

      return { id: dest.id };
    });
  }
}
