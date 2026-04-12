import { prisma } from '../lib/prisma';
import { BankMovementRepository } from '../repositories/BankMovementRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { AppError } from '../errors/AppError';
import { TransactionType, MovementStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ListPendingDTO {
  workspaceId: number;
  cursor?: string;
  limit?: number;
}

interface MergeDTO {
  keepId: string;
  discardIds: string[];
  workspaceId: number;
}

interface ApproveDTO {
  movementId: string;
  workspaceId: number;
  accountId: number;
  categoryId: number;
}

export class BankMovementService {
  private movementRepo: BankMovementRepository;
  private transactionRepo: TransactionRepository;
  private accountRepo: AccountRepository;

  constructor() {
    this.movementRepo = new BankMovementRepository();
    this.transactionRepo = new TransactionRepository();
    this.accountRepo = new AccountRepository();
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
      // 1. Construir payload de aglutinação com lastro de evidência (Regra 5)
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

      // 2. Atualizar o rawPayload do "vencedor" (primary nunca é sobrescrito)
      await this.movementRepo.updateRawPayload(keepId, mergedPayload, tx);

      // 3. Marcar discardIds como MERGED e depois deletar
      for (const discardId of discardIds) {
        await this.movementRepo.updateStatus(discardId, MovementStatus.MERGED, tx);
      }
      await this.movementRepo.deleteMany(discardIds, tx);

      // 4. Retornar o movimento atualizado
      return tx.bankMovement.findUnique({ where: { id: keepId } });
    }, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: 'Serializable',
    });
  }

  /**
   * Aprovar: Converte BankMovement PENDING em Transaction real.
   */
  async approve({ movementId, workspaceId, accountId, categoryId }: ApproveDTO) {
    const movement = await this.movementRepo.findByIdAndWorkspace(movementId, workspaceId);
    if (!movement) throw new AppError('Movimento não encontrado', 404);
    if (movement.status !== 'PENDING') throw new AppError('Movimento não está pendente', 400);

    return await prisma.$transaction(async (tx) => {
      const amount = new Decimal(movement.amount.toString());
      const type: TransactionType = amount.greaterThanOrEqualTo(0) ? 'INCOME' : 'EXPENSE';
      const absAmount = amount.abs();

      // 1. Criar Transaction
      const transaction = await this.transactionRepo.create({
        description: movement.description,
        amount: absAmount,
        date: movement.date,
        type,
        isPaid: true,
        account: { connect: { id: accountId } },
        category: { connect: { id: categoryId } },
        workspace: { connect: { id: workspaceId } },
      }, tx);

      // 2. Atualizar saldo da conta
      const balanceDelta = type === 'INCOME' ? absAmount : absAmount.negated();
      await this.accountRepo.updateBalance(accountId, balanceDelta, tx);

      // 3. Marcar movimento como APPROVED
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
