import { prisma, ExtendedTransactionClient } from '../lib/prisma';
import { Account, Prisma, WorkspaceType } from '@prisma/client';
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

  async findByIdAndWorkspace(id: number, workspaceId: number): Promise<Account | null> {
    return await prisma.account.findFirst({
      where: { id, workspaceId }
    });
  }

  async findDefaultByWorkspace(
    workspaceId: number,
    workspaceType: WorkspaceType,
    client: ExtendedTransactionClient = prisma
  ): Promise<Account | null> {
    const defaultName = workspaceType === 'PERSONAL' ? 'Conta PF Principal' : 'Conta PJ Principal';

    const namedAccount = await client.account.findFirst({
      where: { workspaceId, name: defaultName }
    });
    if (namedAccount) return namedAccount;

    const checkingAccount = await client.account.findFirst({
      where: { workspaceId, type: 'CHECKING' },
      orderBy: { name: 'asc' }
    });
    if (checkingAccount) return checkingAccount;

    return await client.account.findFirst({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    });
  }

  async update(id: number, data: Prisma.AccountUpdateInput): Promise<Account> {
    return await prisma.account.update({
      where: { id },
      data
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.account.delete({ where: { id } });
  }

  async updateBalance(
    accountId: number,
    amountDelta: Decimal | number,
    tx: ExtendedTransactionClient = prisma
  ): Promise<Account> {
    return await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: amountDelta
        }
      }
    });
  }
}
