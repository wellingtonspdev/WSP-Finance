import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class BankMovementRepository {
  /**
   * Insere um lote de movimentos bancários em uma única transação no banco.
   * Utiliza createMany envolto no contexto de transação para garantir que a
   * falha em um lote não deixe registros parciais (naquele lote específico).
   */
  async createBatch(
    movements: Prisma.BankMovementCreateManyInput[],
    tx: Prisma.TransactionClient = prisma
  ) {
    return tx.bankMovement.createMany({
      data: movements,
      skipDuplicates: true, // Garante resiliência (ignora caso o DB emita Unique Constraint de fitid ou hashDeduplication)
    });
  }
}
