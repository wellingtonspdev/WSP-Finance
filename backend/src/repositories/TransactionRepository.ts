import { prisma, ExtendedTransactionClient } from '../lib/prisma';
import { Prisma, Transaction } from '@prisma/client';

export class TransactionRepository {
  async create(
    data: Prisma.TransactionCreateInput,
    tx: ExtendedTransactionClient = prisma
  ): Promise<Transaction> {
    return await tx.transaction.create({ data });
  }

  async findManyByWorkspace(
    workspaceId: number,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      accountId?: number;
      categoryId?: number;
      type?: 'INCOME' | 'EXPENSE';
      cursor?: string;
      limit?: number;
    }
  ): Promise<Transaction[]> {
    const where: Prisma.TransactionWhereInput = {
      workspaceId,
    };

    if (filters) {
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }
      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.type) where.type = filters.type;
    }

    return await prisma.transaction.findMany({
      where,
      take: filters?.limit || 21,
      ...(filters?.cursor && {
        cursor: { id: filters.cursor },
        skip: 1,
      }),
      orderBy: { date: 'desc' },
      include: {
        category: { select: { name: true, icon: true, color: true } },
        account: { select: { name: true } }
      }
    });
  }

  async findManyByUserId(userId: number): Promise<Transaction[]> {
    return await prisma.transaction.findMany({
      where: {
        workspace: {
          members: {
            some: {
              userId: userId
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      include: {
        workspace: { select: { name: true } },
        category: { select: { name: true, icon: true, color: true } },
        account: { select: { name: true } }
      }
    });
  }

  async findByIdAndWorkspace(id: string, workspaceId: number): Promise<Transaction | null> {
    return await prisma.transaction.findFirst({
      where: { id, workspaceId }
    });
  }

  async delete(id: string, tx: ExtendedTransactionClient = prisma): Promise<void> {
    await tx.transaction.delete({ where: { id } });
  }
}