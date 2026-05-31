import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';
import crypto from 'crypto';

/**
 * Contexto resolvido para processar um recibo OCR.
 * Inclui workspace/conta de destino e o usuário vinculado.
 */
export interface TelegramChatContext {
  workspaceId: number;
  accountId: number;
  userId: number;
  defaultExpenseCategoryId: number | null;
  defaultIncomeCategoryId: number | null;
  telegramUserLinkId: string;
}

/**
 * Quando há múltiplos destinos sem padrão definido,
 * o bot deve apresentar opções ao usuário antes de processar.
 */
export interface TelegramDestinationChoice {
  requiresChoice: true;
  userId: number;
  telegramUserLinkId: string;
  destinations: Array<{
    id: string;
    label: string | null;
    workspaceId: number;
    accountId: number;
  }>;
}

export type TelegramResolveResult = TelegramChatContext | TelegramDestinationChoice;

export function isDestinationChoice(result: TelegramResolveResult): result is TelegramDestinationChoice {
  return (result as TelegramDestinationChoice).requiresChoice === true;
}

export class TelegramContextResolver {
  public hashIdentifier(identifier: string): string {
    const secret = process.env.TELEGRAM_IDENTIFIER_HASH_SECRET;
    if (!secret) {
      throw new AppError('TELEGRAM_IDENTIFIER_HASH_SECRET is not configured', 500);
    }
    return crypto.createHmac('sha256', secret).update(identifier).digest('hex');
  }

  /**
   * Resolve o contexto de destino para um chatId.
   *
   * Fluxo:
   * 1. Localiza TelegramUserLink ACTIVE pelo hash do chatId
   * 2. Carrega destinos ACTIVE do vínculo
   * 3. Se activeDestinationId está definido e corresponde a um destino -> retorna contexto
   * 4. Se há exatamente 1 destino -> retorna contexto
   * 5. Se há múltiplos sem activeDestinationId -> retorna TelegramDestinationChoice (bot pede escolha)
   * 6. Se não há destino -> lança erro orientativo para o usuário
   * 7. Se não há vínculo -> fail-closed (403)
   */
  async resolve(chatId: string): Promise<TelegramResolveResult> {
    const telegramChatIdHash = this.hashIdentifier(chatId);

    const activeLink = await prisma.telegramUserLink.findFirst({
      where: { telegramChatIdHash, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        activeDestinationId: true,
      },
    });

    if (!activeLink) {
      throw new AppError('Chat não autorizado. Use /start com seu link de pareamento.', 403);
    }

    const destinations = await prisma.telegramDestination.findMany({
      where: { telegramUserLinkId: activeLink.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        workspaceId: true,
        accountId: true,
        defaultExpenseCategoryId: true,
        defaultIncomeCategoryId: true,
        label: true,
      },
    });

    if (destinations.length === 0) {
      throw new AppError(
        'Nenhum destino configurado. Configure empresa ou conta pessoal no aplicativo.',
        403,
      );
    }

    let targetDestination = null;
    if (activeLink.activeDestinationId) {
      targetDestination = destinations.find(d => d.id === activeLink.activeDestinationId) ?? null;
    }

    if (!targetDestination && destinations.length === 1) {
      targetDestination = destinations[0];
    }

    if (targetDestination) {
      // Validação de integridade: membership ainda está ativo
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: activeLink.userId,
            workspaceId: targetDestination.workspaceId,
          },
        },
      });

      if (!membership) {
        throw new AppError('Destino inválido: usuário não pertence mais ao workspace configurado.', 403);
      }

      return {
        workspaceId: targetDestination.workspaceId,
        accountId: targetDestination.accountId,
        userId: activeLink.userId,
        defaultExpenseCategoryId: targetDestination.defaultExpenseCategoryId,
        defaultIncomeCategoryId: targetDestination.defaultIncomeCategoryId,
        telegramUserLinkId: activeLink.id,
      };
    }

    // Múltiplos destinos sem padrão definido -> bot apresenta botões de escolha
    return {
      requiresChoice: true,
      userId: activeLink.userId,
      telegramUserLinkId: activeLink.id,
      destinations: destinations.map((d) => ({
        id: d.id,
        label: d.label,
        workspaceId: d.workspaceId,
        accountId: d.accountId,
      })),
    };
  }

  /**
   * Resolve o contexto diretamente pelo id de um TelegramDestination.
   * Usado quando o bot recebe a resposta do usuário após a escolha de destino.
   */
  async resolveByDestinationId(destinationId: string, userId: number): Promise<TelegramChatContext> {
    const destination = await prisma.telegramDestination.findUnique({
      where: { id: destinationId },
      select: {
        id: true,
        workspaceId: true,
        accountId: true,
        defaultExpenseCategoryId: true,
        defaultIncomeCategoryId: true,
        status: true,
        userId: true,
        telegramUserLinkId: true,
      },
    });

    if (!destination || destination.status !== 'ACTIVE' || destination.userId !== userId) {
      throw new AppError('Destino não encontrado ou inválido.', 403);
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: destination.workspaceId },
      },
    });

    if (!membership) {
      throw new AppError('Usuário não pertence ao workspace do destino selecionado.', 403);
    }

    return {
      workspaceId: destination.workspaceId,
      accountId: destination.accountId,
      userId,
      defaultExpenseCategoryId: destination.defaultExpenseCategoryId,
      defaultIncomeCategoryId: destination.defaultIncomeCategoryId,
      telegramUserLinkId: destination.telegramUserLinkId,
    };
  }

  /**
   * Define um destino como ativo baseado em uma palavra-chave (ex: "pessoal" ou "empresa").
   * Útil para comandos como /usar_pessoal ou /usar_empresa.
   */
  async setDefaultDestinationByKeyword(chatId: string, keyword: string): Promise<string> {
    const telegramChatIdHash = this.hashIdentifier(chatId);

    const activeLink = await prisma.telegramUserLink.findFirst({
      where: { telegramChatIdHash, status: 'ACTIVE' },
      select: { id: true, userId: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeLink) {
      throw new AppError('Chat não autorizado. Use /vincular_conta com seu código de pareamento.', 403);
    }

    const destinations = await prisma.telegramDestination.findMany({
      where: { telegramUserLinkId: activeLink.id, status: 'ACTIVE' },
    });

    if (destinations.length === 0) {
      throw new AppError('Nenhum destino configurado.', 404);
    }

    const match = destinations.find((d) => d.label?.toLowerCase().includes(keyword.toLowerCase()));

    if (!match) {
      throw new AppError(`Destino com a palavra "${keyword}" não encontrado.`, 404);
    }

    await prisma.telegramUserLink.update({
      where: { id: activeLink.id },
      data: { activeDestinationId: match.id },
    });

    return match.label || keyword;
  }
}
