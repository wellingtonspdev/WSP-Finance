import { AccountRepository } from '../repositories/AccountRepository';
import { AccountType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class AccountService {
  private accountRepository: AccountRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
  }

  async create(name: string, type: AccountType, initialBalance: number, isIncludedInTotal: boolean, workspaceId: number) {
    if (!name) throw new Error('Name is required');

    const account = await this.accountRepository.create({
      name,
      type,
      balance: new Decimal(initialBalance),
      isIncludedInTotal,
      workspace: { connect: { id: workspaceId } }
    });

    return account;
  }

  async list(workspaceId: number) {
    return await this.accountRepository.findManyByWorkspace(workspaceId);
  }

  async update(id: number, name: string, type: AccountType, isIncludedInTotal: boolean, workspaceId: number) { // MUDANÇA: id number
    return this.updatePartial(id, { name, type, isIncludedInTotal }, workspaceId);
  }

  async updatePartial(id: number, data: Prisma.AccountUpdateInput, workspaceId: number) { // MUDANÇA: id number
    const existingAccount = await this.accountRepository.findByIdAndWorkspace(id, workspaceId);
    if (!existingAccount) {
      throw new Error('Account not found');
    }

    return await this.accountRepository.update(id, data);
  }

  async delete(id: number, workspaceId: number) { // MUDANÇA: id number
    const existingAccount = await this.accountRepository.findByIdAndWorkspace(id, workspaceId);
    if (!existingAccount) {
      throw new Error('Account not found');
    }
    
    await this.accountRepository.delete(id);
  }
}