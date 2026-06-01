import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppError } from '../errors/AppError';
import { prisma } from '../lib/prisma';
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

  private async findExistingTransfer(client: any, dto: BridgeTransferDTO, bridgeId: string) {
    const [debitTx, creditTx] = await Promise.all([
      client.transaction.findFirst({
        where: { workspaceId: dto.fromWorkspaceId, fitid: `BRIDGE_OUT_${bridgeId}` },
      }),
      client.transaction.findFirst({
        where: { workspaceId: dto.toWorkspaceId, fitid: `BRIDGE_IN_${bridgeId}` },
      }),
    ]);

    if (debitTx && creditTx) {
      return { debitTx, creditTx };
    }

    if (debitTx || creditTx) {
      throw new AppError('Transferencia bridge inconsistente para a chave de idempotencia informada.', 409);
    }

    return null;
  }

  private isUniqueConstraintError(err: any) {
    return err?.code === 'P2002';
  }

  async executeTransfer(userId: number, dto: BridgeTransferDTO) {
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: { in: [dto.fromWorkspaceId, dto.toWorkspaceId] },
        role: { in: ['OWNER', 'ACCOUNTANT'] },
      },
      include: { workspace: true },
    });

    const fromMembership = memberships.find((m) => m.workspaceId === dto.fromWorkspaceId);
    const toMembership = memberships.find((m) => m.workspaceId === dto.toWorkspaceId);

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

    const targetDate = dto.date || new Date();
    validateClosedUntil(fromMembership.workspace, fromMembership.role, targetDate);
    validateClosedUntil(toMembership.workspace, toMembership.role, targetDate);

    const bridgeId = dto.bridgeId || crypto.randomUUID();
    if (dto.bridgeId) {
      const existingTransfer = await this.findExistingTransfer(prisma, dto, bridgeId);
      if (existingTransfer) {
        return existingTransfer;
      }
    }

    const fromAccount = await this.accountRepository.findDefaultByWorkspace(dto.fromWorkspaceId, fromMembership.workspace.type);
    if (!fromAccount) throw new AppError('Conta de origem invalida ou nao pertence ao workspace.', 404);

    const toAccount = await this.accountRepository.findDefaultByWorkspace(dto.toWorkspaceId, toMembership.workspace.type);
    if (!toAccount) throw new AppError('Conta de destino invalida ou nao pertence ao workspace.', 404);

    if (fromAccount.balance.toNumber() < dto.amount) {
      throw new AppError('Saldo insuficiente na conta de origem.', 400);
    }

    const fromCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.fromWorkspaceId }, { workspaceId: null }] },
    });
    const toCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.toWorkspaceId }, { workspaceId: null }] },
    });

    if (!fromCategory || !toCategory) {
      throw new AppError('Nao foi possivel identificar categorias validas para a transferencia.', 400);
    }

    try {
      return await prisma.$transaction(async (tx: any) => {
        if (dto.bridgeId) {
          const existingTransfer = await this.findExistingTransfer(tx, dto, bridgeId);
          if (existingTransfer) {
            return existingTransfer;
          }
        }

        const amountDecimal = new Decimal(dto.amount);

        const debitTx = await tx.transaction.create({
          data: {
            workspaceId: dto.fromWorkspaceId,
            accountId: fromAccount.id,
            categoryId: fromCategory.id,
            type: 'EXPENSE',
            amount: amountDecimal,
            description: dto.description || `Transferencia para Workspace ${dto.toWorkspaceId}`,
            isPaid: true,
            date: dto.date || new Date(),
            fitid: `BRIDGE_OUT_${bridgeId}`,
          },
        });

        const creditTx = await tx.transaction.create({
          data: {
            workspaceId: dto.toWorkspaceId,
            accountId: toAccount.id,
            categoryId: toCategory.id,
            type: 'INCOME',
            amount: amountDecimal,
            description: dto.description || `Recebimento do Workspace ${dto.fromWorkspaceId}`,
            isPaid: true,
            date: dto.date || new Date(),
            fitid: `BRIDGE_IN_${bridgeId}`,
          },
        });

        const updatedFromAccount = await tx.account.update({
          where: { id: fromAccount.id },
          data: { balance: { decrement: amountDecimal } },
        });

        const updatedToAccount = await tx.account.update({
          where: { id: toAccount.id },
          data: { balance: { increment: amountDecimal } },
        });

        const fromBalanceBefore = new Decimal(fromAccount.balance.toString());
        const toBalanceBefore = new Decimal(toAccount.balance.toString());

        await AuditLogService.logSync({
          userId,
          workspaceId: dto.fromWorkspaceId,
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

        await AuditLogService.logSync({
          userId,
          workspaceId: dto.toWorkspaceId,
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
      if (dto.bridgeId && this.isUniqueConstraintError(err)) {
        const existingTransfer = await this.findExistingTransfer(prisma, dto, bridgeId);
        if (existingTransfer) {
          return existingTransfer;
        }
      }
      throw err;
    }
  }
}
