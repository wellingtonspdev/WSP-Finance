import { prisma, ExtendedTransactionClient } from '../lib/prisma';
import { Account, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class AccountRepository {
  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return await prisma.account.create({ data });
  }

  async findManyByWorkspace(workspaceId: number): Promise<Account[]> {
    return await prisma.account.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    });
  }

  async findByIdAndWorkspace(id: number, workspaceId: number): Promise<Account | null> { // MUDANÇA: id number
    return await prisma.account.findFirst({
      where: { id, workspaceId }
    });
  }

  async update(id: number, data: Prisma.AccountUpdateInput): Promise<Account> { // MUDANÇA: id number
    return await prisma.account.update({
      where: { id },
      data
    });
  }

  async delete(id: number): Promise<void> { // MUDANÇA: id number
    await prisma.account.delete({ where: { id } });
  }

  async updateBalance(
    accountId: number, // MUDANÇA: id number
    amountDelta: Decimal | number,
    tx: ExtendedTransactionClient = prisma
  ): Promise<void> {
    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: amountDelta
        }
      }
    });
  }
}