import { Prisma, BankMovement, MovementStatus } from '@prisma/client';
import { prisma, sysPrisma, ExtendedTransactionClient } from '../lib/prisma';

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

  async findGlobalPendingByAccountant(
    userId: number,
    options?: { cursor?: string; limit?: number }
  ): Promise<BankMovement[]> {
    const limit = options?.limit || 20;

    // 1. Achar a quais workspaces o accountant tem acesso
    const memberships = await sysPrisma.workspaceMember.findMany({
      where: { userId, role: 'ACCOUNTANT', workspace: { type: 'BUSINESS' } },
      select: { workspaceId: true }
    });

    if (memberships.length === 0) return [];
    
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;

    if (options?.cursor) {
      cursorId = options.cursor;
      for (const m of memberships) {
        // Encontrar os dados do cursor isolando o RLS de cada workspace
        const found = await sysPrisma.$transaction(async (tx: any) => {
          await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${m.workspaceId.toString()}, true)`;
          return tx.bankMovement.findUnique({
            where: { id: options!.cursor }
          });
        });

        if (found) {
          cursorDate = found.date;
          break;
        }
      }
    }

    // 2. Fazer o pull (em paralelo) de cada tenant, forçando RLS explícito sem depender da extensão
    const promises = memberships.map(m => {
      return sysPrisma.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${m.workspaceId.toString()}, true)`;
        return tx.bankMovement.findMany({
          where: {
            status: 'PENDING',
            ...(cursorDate && cursorId ? {
              OR: [
                { date: { lt: cursorDate } },
                { date: cursorDate, id: { lt: cursorId } }
              ]
            } : {})
          },
          take: limit + 1,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          include: {
            account: { select: { name: true } },
            workspace: { select: { name: true, document: true } }
          },
        });
      });
    });

    const results = await Promise.all(promises);
    
    // 3. Unificar, ordenar e paginar globalmente
    const allMovements = results.flat();
    allMovements.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    return allMovements.slice(0, limit + 1);
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
