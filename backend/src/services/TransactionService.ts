import { prisma } from '../lib/prisma';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { Account, TransactionType, WorkspaceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { UploadService } from './UploadService';
import { AuditLogService } from './AuditLogService';
import { OutboxService } from './OutboxService';
import { AppError } from '../errors/AppError';
import { tenantContext } from '../lib/tenantContext';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

interface CreateTransactionDTO {
  userId: number;
  description: string;
  amount: number;
  date: Date;
  type: TransactionType;
  accountId?: number;
  categoryId: number;
  isPaid: boolean;
  workspaceId: number;
  grossAmount?: number;
  marketplaceFee?: number;
  shippingCost?: number;
  productCost?: number;
  platformFeeRate?: number;
  attachmentUrl?: string;
  attachmentSize?: number;
}

export class TransactionService {
  private transactionRepository: TransactionRepository;
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private outboxService: OutboxService;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.accountRepository = new AccountRepository();
    this.categoryRepository = new CategoryRepository();
    this.outboxService = new OutboxService();
  }

  private async resolveAccount(
    accountId: number | undefined,
    workspaceId: number,
    workspaceType: WorkspaceType
  ): Promise<Account> {
    const account = accountId
      ? await this.accountRepository.findByIdAndWorkspace(accountId, workspaceId)
      : await this.accountRepository.findDefaultByWorkspace(workspaceId, workspaceType);

    if (!account) throw new Error('Account not found or access denied');
    return account;
  }

  async create({
    userId,
    description,
    amount,
    date,
    type,
    accountId,
    categoryId,
    isPaid,
    workspaceId,
    grossAmount,
    marketplaceFee,
    shippingCost,
    productCost,
    platformFeeRate,
    attachmentUrl,
    attachmentSize
  }: CreateTransactionDTO) {
    const category = await this.categoryRepository.findByIdAndWorkspace(categoryId, workspaceId);
    if (!category) throw new Error('Category not found or access denied');

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new AppError('Workspace not found', 404);

    const resolvedAccount = await this.resolveAccount(accountId, workspaceId, workspace.type);

    if (workspace.closedUntil) {
      const store = tenantContext.getStore();
      const isAccountantBypass = store?.userRole === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
      const isTargetDateClosed = dayjs(date).isSameOrBefore(dayjs(workspace.closedUntil), 'day');

      if (isTargetDateClosed && !isAccountantBypass) {
        throw new AppError('Acesso negado: A data da transacao pertence a um periodo fiscal fechado.', 403);
      }
    }

    let finalAmount = new Decimal(amount);
    const calculatedGross = grossAmount !== undefined && grossAmount !== null ? new Decimal(grossAmount) : null;
    let calculatedFee = marketplaceFee !== undefined && marketplaceFee !== null ? new Decimal(marketplaceFee) : null;
    const calculatedShipping = shippingCost !== undefined && shippingCost !== null ? new Decimal(shippingCost) : null;
    const calculatedCost = productCost !== undefined && productCost !== null ? new Decimal(productCost) : null;
    const calculatedPlatformFeeRate = platformFeeRate !== undefined && platformFeeRate !== null ? new Decimal(platformFeeRate) : null;

    if (calculatedGross !== null) {
      let fee = new Decimal(0);
      if (calculatedPlatformFeeRate !== null) {
        fee = calculatedGross.mul(calculatedPlatformFeeRate.dividedBy(100));
        calculatedFee = fee;
      } else if (calculatedFee !== null) {
        fee = calculatedFee;
      }

      const shipping = calculatedShipping !== null ? calculatedShipping : new Decimal(0);
      finalAmount = calculatedGross.minus(fee).minus(shipping);
    }

    return await prisma.$transaction(async (tx: any) => {
      const transaction = await this.transactionRepository.create({
        description,
        amount: finalAmount,
        date,
        type,
        isPaid,
        grossAmount: calculatedGross,
        marketplaceFee: calculatedFee,
        shippingCost: calculatedShipping,
        productCost: calculatedCost,
        platformFeeRate: calculatedPlatformFeeRate,
        taxAmount: null,
        feeAmount: calculatedFee,
        netValue: null,
        attachmentUrl,
        attachmentSize,
        account: { connect: { id: resolvedAccount.id } },
        category: { connect: { id: categoryId } },
        workspace: { connect: { id: workspaceId } }
      }, tx);

      if (isPaid) {
        const balanceBefore = new Decimal(resolvedAccount.balance.toString());
        const balanceDelta = type === 'INCOME' ? finalAmount : finalAmount.negated();
        const updatedAccount = await this.accountRepository.updateBalance(resolvedAccount.id, balanceDelta, tx);

        await AuditLogService.logSync({
          userId,
          workspaceId,
          action: 'CREATE',
          entity: 'Transaction',
          entityId: transaction.id,
          newState: {
            transactionId: transaction.id,
            accountId: resolvedAccount.id,
            amount: finalAmount.toString(),
            type,
            isPaid,
          },
          balanceBefore,
          balanceAfter: updatedAccount.balance,
          delta: balanceDelta,
          fromAccount: resolvedAccount.id,
        }, tx);
      }

      if (type === 'EXPENSE') {
        await this.outboxService.enqueueInTransaction(tx, {
          workspaceId,
          eventType: 'TRANSACTION_EXPENSE_CREATED',
          payload: { transactionId: transaction.id },
        });
      }

      return transaction;
    });
  }

  async list(workspaceId: number, filters: any) {
    const limit = filters.limit || 20;
    const transactions = await this.transactionRepository.findManyByWorkspace(
      workspaceId,
      { ...filters, limit: limit + 1 }
    );

    const hasMore = transactions.length > limit;
    const data = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  }

  async listAllByUser(userId: number) {
    return await this.transactionRepository.findManyByUserId(userId);
  }

  async getById(id: string, workspaceId: number) {
    const transaction = await this.transactionRepository.findDetailByIdAndWorkspace(id, workspaceId);
    if (!transaction) throw new AppError('Transaction not found or access denied', 404);
    return transaction;
  }

  async delete(id: string, workspaceId: number, userId: number): Promise<void> {
    const transaction = await this.transactionRepository.findByIdAndWorkspace(id, workspaceId);
    if (!transaction) throw new AppError('Transaction not found or access denied', 404);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { closedUntil: true, type: true } });

    if (workspace?.closedUntil) {
      const store = tenantContext.getStore();
      const isAccountantBypass = store?.userRole === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
      const isTargetDateClosed = dayjs(transaction.date).isSameOrBefore(dayjs(workspace.closedUntil), 'day');

      if (isTargetDateClosed && !isAccountantBypass) {
        throw new AppError('Acesso negado: A transacao pertence a um periodo fiscal fechado e nao pode ser deletada.', 403);
      }
    }

    const account = await this.accountRepository.findByIdAndWorkspace(transaction.accountId, workspaceId);
    if (!account) throw new AppError('Account not found or access denied', 404);

    await prisma.$transaction(async (tx: any) => {
      if (transaction.isPaid && transaction.amount) {
        const balanceBefore = new Decimal(account.balance.toString());
        const amount = new Decimal(transaction.amount.toString());
        const balanceDelta = transaction.type === 'INCOME' ? amount.negated() : amount;
        const updatedAccount = await this.accountRepository.updateBalance(transaction.accountId, balanceDelta, tx);

        await AuditLogService.logSync({
          userId,
          workspaceId,
          action: 'DELETE',
          entity: 'Transaction',
          entityId: transaction.id,
          oldState: {
            transactionId: transaction.id,
            accountId: transaction.accountId,
            amount: amount.toString(),
            type: transaction.type,
            isPaid: transaction.isPaid,
          },
          newState: {
            deleted: true,
            transactionId: transaction.id,
          },
          balanceBefore,
          balanceAfter: updatedAccount.balance,
          delta: balanceDelta,
          fromAccount: transaction.accountId,
        }, tx);
      }
      await this.transactionRepository.delete(id, tx);
    });

    if (transaction.attachmentUrl && transaction.attachmentUrl.length > 5) {
      const uploadService = new UploadService();
      uploadService.deleteRemoteFile(transaction.attachmentUrl).catch((err) => {
        console.error('[R2 GC] Falha nao-bloqueante ao apagar arquivo S3 Atrelado:', err);
      });
    }
  }
}
