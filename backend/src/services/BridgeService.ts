import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
import { tenantContext } from '../lib/tenantContext';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { AuditLogService } from './AuditLogService';

dayjs.extend(isSameOrBefore);

interface BridgeTransferDTO {
  fromWorkspaceId: number;
  toWorkspaceId: number;
  amount: number;
  description: string;
  date: Date;
  bridgeId?: string;
}

export class BridgeService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.categoryRepository = new CategoryRepository();
  }

  private async runInWorkspace<T>(workspaceId: number, callback: () => Promise<T>) {
    const store = tenantContext.getStore();
    return tenantContext.run({ ...store, currentWorkspaceId: workspaceId }, async () => {
      return await callback();
    });
  }

  private async setWorkspaceInTransaction(client: any, workspaceId: number) {
    await client.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`;
  }

  private validateExistingTransfer(debitTx: any, creditTx: any) {
    if (debitTx && creditTx) {
      return { debitTx, creditTx };
    }

    if (debitTx || creditTx) {
      throw new AppError('Transferencia bridge inconsistente para a chave de idempotencia informada.', 409);
    }

    return null;
  }

  private async findExistingTransfer(dto: BridgeTransferDTO, bridgeId: string) {
    const [debitTx, creditTx] = await Promise.all([
      this.runInWorkspace(dto.fromWorkspaceId, () => prisma.transaction.findFirst({
        where: { workspaceId: dto.fromWorkspaceId, fitid: `BRIDGE_OUT_${bridgeId}` },
      })),
      this.runInWorkspace(dto.toWorkspaceId, () => prisma.transaction.findFirst({
        where: { workspaceId: dto.toWorkspaceId, fitid: `BRIDGE_IN_${bridgeId}` },
      })),
    ]);

    return this.validateExistingTransfer(debitTx, creditTx);
  }

  private async findExistingTransferInTransaction(client: any, dto: BridgeTransferDTO, bridgeId: string) {
    await this.setWorkspaceInTransaction(client, dto.fromWorkspaceId);
    const debitTx = await client.transaction.findFirst({
      where: { workspaceId: dto.fromWorkspaceId, fitid: `BRIDGE_OUT_${bridgeId}` },
    });

    await this.setWorkspaceInTransaction(client, dto.toWorkspaceId);
    const creditTx = await client.transaction.findFirst({
      where: { workspaceId: dto.toWorkspaceId, fitid: `BRIDGE_IN_${bridgeId}` },
    });

    return this.validateExistingTransfer(debitTx, creditTx);
  }

  private isUniqueConstraintError(err: any) {
    return err?.code === 'P2002';
  }

  private normalizeWorkspaceId(value: unknown, fieldName: string) {
    const normalized = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new AppError(`Workspace ${fieldName} invalido para transferencia.`, 400);
    }
    return normalized;
  }

  private normalizeAmount(value: unknown) {
    const normalized = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new AppError('O valor da transferencia deve ser positivo.', 400);
    }
    return normalized;
  }

  async executeTransfer(userId: number, dto: BridgeTransferDTO) {
    const normalizedDto = {
      ...dto,
      fromWorkspaceId: this.normalizeWorkspaceId(dto.fromWorkspaceId, 'de origem'),
      toWorkspaceId: this.normalizeWorkspaceId(dto.toWorkspaceId, 'de destino'),
      amount: this.normalizeAmount(dto.amount),
      date: dto.date || new Date(),
    };

    if (normalizedDto.fromWorkspaceId === normalizedDto.toWorkspaceId) {
      throw new AppError('A transferencia deve ser entre workspaces diferentes.', 400);
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: { in: [normalizedDto.fromWorkspaceId, normalizedDto.toWorkspaceId] },
        role: { in: ['OWNER', 'ACCOUNTANT'] },
      },
      include: { workspace: true },
    });

    const fromMembership = memberships.find((m) => m.workspaceId === normalizedDto.fromWorkspaceId);
    const toMembership = memberships.find((m) => m.workspaceId === normalizedDto.toWorkspaceId);

    if (!fromMembership || !toMembership) {
      throw new AppError('Permissao negada: voce deve ter nivel OWNER ou ACCOUNTANT em ambos os workspaces para transferir.', 403);
    }

    const validateClosedUntil = (workspace: any, role: string, transferDate: Date) => {
      if (workspace.closedUntil) {
        const isAccountantBypass = role === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
        const isTargetDateClosed = dayjs(transferDate).isSameOrBefore(dayjs(workspace.closedUntil), 'day');

        if (isTargetDateClosed && !isAccountantBypass) {
          throw new AppError(`Acesso negado: transferencia afeta um periodo fiscal ja fechado no Workspace ID ${workspace.id}.`, 403);
        }
      }
    };

    const targetDate = normalizedDto.date;
    validateClosedUntil(fromMembership.workspace, fromMembership.role, targetDate);
    validateClosedUntil(toMembership.workspace, toMembership.role, targetDate);

    const bridgeId = normalizedDto.bridgeId || crypto.randomUUID();
    if (normalizedDto.bridgeId) {
      const existingTransfer = await this.findExistingTransfer(normalizedDto, bridgeId);
      if (existingTransfer) {
        return existingTransfer;
      }
    }

    const fromAccount = await this.runInWorkspace(normalizedDto.fromWorkspaceId, () => (
      this.accountRepository.findDefaultByWorkspace(normalizedDto.fromWorkspaceId, fromMembership.workspace.type)
    ));
    if (!fromAccount) throw new AppError('Conta de origem invalida ou nao pertence ao workspace.', 404);

    const toAccount = await this.runInWorkspace(normalizedDto.toWorkspaceId, () => (
      this.accountRepository.findDefaultByWorkspace(normalizedDto.toWorkspaceId, toMembership.workspace.type)
    ));
    if (!toAccount) throw new AppError('Conta de destino invalida ou nao pertence ao workspace.', 404);

    if (fromAccount.balance.toNumber() < normalizedDto.amount) {
      throw new AppError('Saldo insuficiente na conta de origem.', 400);
    }

    const fromCategory = await this.runInWorkspace(normalizedDto.fromWorkspaceId, () => prisma.category.findFirst({
      where: { workspaceId: normalizedDto.fromWorkspaceId },
    }));
    const toCategory = await this.runInWorkspace(normalizedDto.toWorkspaceId, () => prisma.category.findFirst({
      where: { workspaceId: normalizedDto.toWorkspaceId },
    }));

    if (!fromCategory || !toCategory) {
      throw new AppError('Nao foi possivel identificar categorias do workspace para a transferencia.', 400);
    }

    try {
      return await prisma.$transaction(async (tx: any) => {
        if (normalizedDto.bridgeId) {
          const existingTransfer = await this.findExistingTransferInTransaction(tx, normalizedDto, bridgeId);
          if (existingTransfer) {
            return existingTransfer;
          }
        }

        const amountDecimal = new Decimal(normalizedDto.amount);

        await this.setWorkspaceInTransaction(tx, normalizedDto.fromWorkspaceId);
        const debitTx = await tx.transaction.create({
          data: {
            workspaceId: normalizedDto.fromWorkspaceId,
            accountId: fromAccount.id,
            categoryId: fromCategory.id,
            type: 'EXPENSE',
            amount: amountDecimal,
            description: normalizedDto.description || `Transferencia para Workspace ${normalizedDto.toWorkspaceId}`,
            isPaid: true,
            date: normalizedDto.date,
            fitid: `BRIDGE_OUT_${bridgeId}`,
          },
        });

        const updatedFromAccount = await tx.account.update({
          where: { id: fromAccount.id },
          data: { balance: { decrement: amountDecimal } },
        });

        const fromBalanceBefore = new Decimal(fromAccount.balance.toString());

        await AuditLogService.logSync({
          userId,
          workspaceId: normalizedDto.fromWorkspaceId,
          action: 'BRIDGE_TRANSFER',
          entity: 'Transaction',
          entityId: bridgeId,
          oldState: {
            bridgeId,
            leg: 'DEBIT',
            accountId: fromAccount.id,
            balance: fromBalanceBefore.toString(),
          },
          newState: {
            bridgeId,
            leg: 'DEBIT',
            transactionId: debitTx.id,
            amount: amountDecimal.toString(),
            balance: updatedFromAccount.balance.toString(),
          },
          balanceBefore: fromBalanceBefore,
          balanceAfter: updatedFromAccount.balance,
          delta: amountDecimal.negated(),
          fromAccount: fromAccount.id,
          toAccount: toAccount.id,
        }, tx);

        await this.setWorkspaceInTransaction(tx, normalizedDto.toWorkspaceId);
        const creditTx = await tx.transaction.create({
          data: {
            workspaceId: normalizedDto.toWorkspaceId,
            accountId: toAccount.id,
            categoryId: toCategory.id,
            type: 'INCOME',
            amount: amountDecimal,
            description: normalizedDto.description || `Recebimento do Workspace ${normalizedDto.fromWorkspaceId}`,
            isPaid: true,
            date: normalizedDto.date,
            fitid: `BRIDGE_IN_${bridgeId}`,
          },
        });

        const updatedToAccount = await tx.account.update({
          where: { id: toAccount.id },
          data: { balance: { increment: amountDecimal } },
        });

        const toBalanceBefore = new Decimal(toAccount.balance.toString());

        await AuditLogService.logSync({
          userId,
          workspaceId: normalizedDto.toWorkspaceId,
          action: 'BRIDGE_TRANSFER',
          entity: 'Transaction',
          entityId: bridgeId,
          oldState: {
            bridgeId,
            leg: 'CREDIT',
            accountId: toAccount.id,
            balance: toBalanceBefore.toString(),
          },
          newState: {
            bridgeId,
            leg: 'CREDIT',
            transactionId: creditTx.id,
            amount: amountDecimal.toString(),
            balance: updatedToAccount.balance.toString(),
          },
          balanceBefore: toBalanceBefore,
          balanceAfter: updatedToAccount.balance,
          delta: amountDecimal,
          fromAccount: fromAccount.id,
          toAccount: toAccount.id,
        }, tx);

        return { debitTx, creditTx };
      });
    } catch (err: any) {
      if (normalizedDto.bridgeId && this.isUniqueConstraintError(err)) {
        const existingTransfer = await this.findExistingTransfer(normalizedDto, bridgeId);
        if (existingTransfer) {
          return existingTransfer;
        }
      }
      throw err;
    }
  }
}
