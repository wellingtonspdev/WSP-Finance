import { Prisma, BankMovement, MovementStatus } from '@prisma/client';
import { prisma, ExtendedTransactionClient } from '../lib/prisma';

export class BankMovementRepository {
  /**
   * Insere um lote de movimentos bancários em uma única transação no banco.
   * Utiliza createMany envolto no contexto de transação para garantir que a
   * falha em um lote não deixe registros parciais (naquele lote específico).
   */
  async createBatch(
    movements: Prisma.BankMovementCreateManyInput[],
    tx: ExtendedTransactionClient = prisma
  ) {
    return tx.bankMovement.createMany({
      data: movements,
      skipDuplicates: true,
    });
  }

  async findPendingByWorkspace(
    workspaceId: number,
    options?: { cursor?: string; limit?: number }
  ): Promise<BankMovement[]> {
    const limit = options?.limit || 20;

    return prisma.bankMovement.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
      },
      take: limit + 1,
      ...(options?.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { date: 'desc' },
      include: {
        account: { select: { name: true } },
      },
    });
  }

  async findByIdAndWorkspace(id: string, workspaceId: number): Promise<BankMovement | null> {
    return prisma.bankMovement.findFirst({
      where: { id, workspaceId },
    });
  }

  async findManyByIds(ids: string[], workspaceId: number): Promise<BankMovement[]> {
    return prisma.bankMovement.findMany({
      where: {
        id: { in: ids },
        workspaceId,
      },
    });
  }

  async updateStatus(
    id: string,
    status: MovementStatus,
    tx: ExtendedTransactionClient = prisma
  ): Promise<BankMovement> {
    return tx.bankMovement.update({
      where: { id },
      data: { status },
    });
  }

  async deleteMany(ids: string[], tx: ExtendedTransactionClient = prisma): Promise<void> {
    await tx.bankMovement.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async updateRawPayload(
    id: string,
    rawPayload: any,
    tx: ExtendedTransactionClient = prisma
  ): Promise<BankMovement> {
    return tx.bankMovement.update({
      where: { id },
      data: { rawPayload },
    });
  }
}
