import { prisma } from '../lib/prisma';
import { BankMovementRepository } from '../repositories/BankMovementRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { AppError } from '../errors/AppError';
import { TransactionType, MovementStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditLogService } from './AuditLogService';
import { tenantContext } from '../lib/tenantContext';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

interface ListPendingDTO {
  workspaceId: number;
  cursor?: string;
  limit?: number;
}

interface ListGlobalPendingDTO {
  userId: number;
  cursor?: string;
  limit?: number;
}

interface MergeDTO {
  keepId: string;
  discardIds: string[];
  workspaceId: number;
}

interface ApproveDTO {
  userId: number;
  movementId: string;
  workspaceId: number;
  categoryId: number;
}

export class BankMovementService {
  private movementRepo: BankMovementRepository;
  private transactionRepo: TransactionRepository;
  private accountRepo: AccountRepository;
  private categoryRepo: CategoryRepository;

  constructor() {
    this.movementRepo = new BankMovementRepository();
    this.transactionRepo = new TransactionRepository();
    this.accountRepo = new AccountRepository();
    this.categoryRepo = new CategoryRepository();
  }

  async listPending({ workspaceId, cursor, limit = 20 }: ListPendingDTO) {
    const movements = await this.movementRepo.findPendingByWorkspace(workspaceId, {
      cursor,
      limit,
    });

    const hasMore = movements.length > limit;
    const data = hasMore ? movements.slice(0, limit) : movements;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  }

  async listGlobalPending({ userId, cursor, limit = 20 }: ListGlobalPendingDTO) {
    const movements = await this.movementRepo.findGlobalPendingByAccountant(userId, {
      cursor,
      limit,
    });

    const hasMore = movements.length > limit;
    const data = hasMore ? movements.slice(0, limit) : movements;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  }

  /**
   * Merge: Combina rawPayload dos movimentos envolvidos no keepId,
   * marca discardIds como MERGED, e deleta os descartados.
   * Tudo dentro de prisma.$transaction para atomicidade.
   */
  async merge({ keepId, discardIds, workspaceId }: MergeDTO) {
    if (discardIds.includes(keepId)) {
      throw new AppError('keepId não pode estar em discardIds', 400);
    }

    const allIds = [keepId, ...discardIds];
    const movements = await this.movementRepo.findManyByIds(allIds, workspaceId);

    if (movements.length !== allIds.length) {
      throw new AppError('Um ou mais movimentos não encontrados neste workspace', 404);
    }

    const nonPending = movements.filter(m => m.status !== 'PENDING');
    if (nonPending.length > 0) {
      throw new AppError('Todos os movimentos envolvidos no merge devem estar PENDING', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const keepMovement = movements.find(m => m.id === keepId)!;
      const mergedPayload = {
        merged: true,
        mergedAt: new Date().toISOString(),
        mergedCount: allIds.length,
        primary: keepMovement.rawPayload,
        sources: discardIds.map(id => {
          const m = movements.find(mv => mv.id === id)!;
          return { id: m.id, source: m.source, payload: m.rawPayload };
        }),
      };

      await this.movementRepo.updateRawPayload(keepId, mergedPayload, tx);

      for (const discardId of discardIds) {
        await this.movementRepo.updateStatus(discardId, MovementStatus.MERGED, tx);
      }
      await this.movementRepo.deleteMany(discardIds, tx);

      return tx.bankMovement.findUnique({ where: { id: keepId } });
    }, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: 'Serializable',
    });
  }

  /**
   * Aprovar: Converte BankMovement PENDING em Transaction real.
   * 
   * Fluxo:
   * 1. Busca movement + verifica existência
   * 2. IDEMPOTÊNCIA: se já APPROVED → retorna 200 sem re-criar
   * 3. Valida status PENDING
   * 4. GUARDIÃO closedUntil (ANTES da transaction)
   * 5. Valida pertencimento Account + Category
   * 6. prisma.$transaction { criar Transaction + atualizar saldo + marcar APPROVED }
   */
  async approve({ userId, movementId, workspaceId, categoryId }: ApproveDTO) {
    // 1. Buscar movement
    const movement = await this.movementRepo.findByIdAndWorkspace(movementId, workspaceId);
    if (!movement) throw new AppError('Movimento não encontrado', 404);

    // 2. Idempotência: já aprovado → retorna transaction existente
    if (movement.status === 'APPROVED') {
      const existingTx = await prisma.transaction.findFirst({
        where: {
          workspaceId,
          accountId: movement.accountId,
          description: movement.description,
          date: movement.date,
        },
        orderBy: { createdAt: 'desc' },
      });
      return { ...existingTx, alreadyApproved: true };
    }

    // 3. Status deve ser PENDING
    if (movement.status !== 'PENDING') {
      throw new AppError('Movimento não está pendente', 400);
    }

    // 4. Guardião closedUntil (ANTES da transação para fail-fast)
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { closedUntil: true, type: true },
    });

    if (workspace?.closedUntil) {
      const store = tenantContext.getStore();
      const isAccountantBypass = store?.userRole === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
      const isDateClosed = dayjs(movement.date).isSameOrBefore(dayjs(workspace.closedUntil), 'day');

      if (isDateClosed && !isAccountantBypass) {
        throw new AppError('Acesso negado: A data da transação pertence a um período fiscal fechado.', 403);
      }
    }

    // 5. Validar pertencimento Account + Category ao workspace
    const account = await this.accountRepo.findByIdAndWorkspace(movement.accountId, workspaceId);
    if (!account) throw new AppError('Conta não encontrada ou acesso negado', 404);

    const category = await this.categoryRepo.findByIdAndWorkspace(categoryId, workspaceId);
    if (!category) throw new AppError('Categoria não encontrada ou acesso negado', 404);

    // 6. Bloco atômico (mínimo possível dentro da transação)
    return await prisma.$transaction(async (tx) => {
      const amount = new Decimal(movement.amount.toString());
      const type: TransactionType = amount.greaterThanOrEqualTo(0) ? 'INCOME' : 'EXPENSE';
      const absAmount = amount.abs();

      // A. Criar Transaction
      const transaction = await this.transactionRepo.create({
        description: movement.description,
        amount: absAmount,
        date: movement.date,
        type,
        isPaid: true,
        account: { connect: { id: movement.accountId } },
        category: { connect: { id: categoryId } },
        workspace: { connect: { id: workspaceId } },
      }, tx);

      // B. Atualizar saldo (increment/decrement atômico do Prisma)
      const balanceBefore = new Decimal(account.balance.toString());
      const balanceDelta = type === 'INCOME' ? absAmount : absAmount.negated();
      const updatedAccount = await this.accountRepo.updateBalance(movement.accountId, balanceDelta, tx);

      await AuditLogService.logSync({
        userId,
        workspaceId,
        action: 'CREATE',
        entity: 'Transaction',
        entityId: transaction.id,
        newState: {
          transactionId: transaction.id,
          bankMovementId: movement.id,
          accountId: movement.accountId,
          amount: absAmount.toString(),
          type,
          isPaid: true,
        },
        balanceBefore,
        balanceAfter: updatedAccount.balance,
        delta: balanceDelta,
        fromAccount: movement.accountId,
      }, tx);

      // C. Marcar movimento como APPROVED
      await this.movementRepo.updateStatus(movementId, MovementStatus.APPROVED, tx);

      return transaction;
    }, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: 'Serializable',
    });
  }

  /**
   * Rejeitar: Descarta o movimento sem criar Transaction.
   */
  async reject(movementId: string, workspaceId: number) {
    const movement = await this.movementRepo.findByIdAndWorkspace(movementId, workspaceId);
    if (!movement) throw new AppError('Movimento não encontrado', 404);
    if (movement.status !== 'PENDING') throw new AppError('Movimento não está pendente', 400);

    return this.movementRepo.updateStatus(movementId, MovementStatus.REJECTED);
  }
}
