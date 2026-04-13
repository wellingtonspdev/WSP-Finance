import { prisma } from '../lib/prisma';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { UploadService } from './UploadService';
import { AuditLogService } from './AuditLogService';
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
  accountId: number;
  categoryId: number;
  isPaid: boolean;
  workspaceId: number;
  // Campos Opcionais de Marketplace (PACT)
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

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.accountRepository = new AccountRepository();
    this.categoryRepository = new CategoryRepository();
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
    // 1. Validações de Pertencimento (Segurança)
    const account = await this.accountRepository.findByIdAndWorkspace(accountId, workspaceId);
    if (!account) throw new Error('Account not found or access denied');

    const category = await this.categoryRepository.findByIdAndWorkspace(categoryId, workspaceId);
    if (!category) throw new Error('Category not found or access denied');

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new AppError('Workspace not found', 404);

    // Guardião de Período Fiscal (closedUntil)
    if (workspace.closedUntil) {
      const store = tenantContext.getStore();
      const isAccountantBypass = store?.userRole === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
      const isTargetDateClosed = dayjs(date).isSameOrBefore(dayjs(workspace.closedUntil), 'day');
      
      if (isTargetDateClosed && !isAccountantBypass) {
        throw new AppError('Acesso negado: A data da transação pertence a um período fiscal fechado.', 403);
      }
    }

    const taxRate = workspace.taxRate; // Prisma lida como Decimal

    // 2. Motor de Cálculo Financeiro: Provisões Tributárias e Plataforma
    let finalAmount = new Decimal(amount);
    let calculatedGross = grossAmount !== undefined && grossAmount !== null ? new Decimal(grossAmount) : null;
    let calculatedFee = marketplaceFee !== undefined && marketplaceFee !== null ? new Decimal(marketplaceFee) : null;
    let calculatedShipping = shippingCost !== undefined && shippingCost !== null ? new Decimal(shippingCost) : null;
    let calculatedCost = productCost !== undefined && productCost !== null ? new Decimal(productCost) : null;
    let calculatedPlatformFeeRate = platformFeeRate !== undefined && platformFeeRate !== null ? new Decimal(platformFeeRate) : null;

    let computedTaxAmount: Decimal | null = null;
    let computedNetValue: Decimal | null = null;

    // CENÁRIO A: É uma venda detalhada com Gross Amount (MercadoLivre / Shopee)
    if (calculatedGross !== null) {
      // 1. Resolvemos a Fee da plataforma (Se vier Rate, calcula; senão, usa a fixa)
      let fee = new Decimal(0);
      if (calculatedPlatformFeeRate !== null) {
        fee = calculatedGross.mul(calculatedPlatformFeeRate.dividedBy(100));
        calculatedFee = fee;
      } else if (calculatedFee !== null) {
        fee = calculatedFee;
      }

      const shipping = calculatedShipping !== null ? calculatedShipping : new Decimal(0);

      // 2. Calcula Imposto (DAS incide sobre Faturamento Bruto)
      computedTaxAmount = calculatedGross.mul(taxRate.dividedBy(100));

      // 3. Calcula o Valor Líquido Real (Recebido - Imposto Retido)
      computedNetValue = calculatedGross.minus(fee).minus(computedTaxAmount);

      // 4. Saldo Bancário Final (O que fisicamente entra na conta: Bruto - Taxas - Frete)
      finalAmount = calculatedGross.minus(fee).minus(shipping);
    }
    // CENÁRIO B: Entrada manual simples sem Gross (Ex: Honorário direto)
    else {
      if (type === 'INCOME') {
        computedTaxAmount = finalAmount.mul(taxRate.dividedBy(100));
        computedNetValue = finalAmount.minus(computedTaxAmount);
      }
    }

    // 3. Transação Atômica (Cria Transação + Atualiza Saldo)
    return await prisma.$transaction(async (tx) => {
      // A. Criar o registro da transação
      const transaction = await this.transactionRepository.create({
        description,
        amount: finalAmount, // Valor calculado ou original
        date,
        type,
        isPaid,
        grossAmount: calculatedGross,
        marketplaceFee: calculatedFee,
        shippingCost: calculatedShipping,
        productCost: calculatedCost,
        platformFeeRate: calculatedPlatformFeeRate,
        taxAmount: computedTaxAmount,
        feeAmount: calculatedFee,
        netValue: computedNetValue,
        attachmentUrl,
        attachmentSize,
        account: { connect: { id: accountId } },
        category: { connect: { id: categoryId } },
        workspace: { connect: { id: workspaceId } }
      }, tx);

      // B. Atualizar o saldo da conta (SE estiver pago)
      if (isPaid) {
        const balanceBefore = new Decimal(account.balance.toString());
        const balanceDelta = type === 'INCOME' ? finalAmount : finalAmount.negated();
        const updatedAccount = await this.accountRepository.updateBalance(accountId, balanceDelta, tx);

        await AuditLogService.logSync({
          userId,
          workspaceId,
          action: 'CREATE',
          entity: 'Transaction',
          entityId: transaction.id,
          newState: {
            transactionId: transaction.id,
            accountId,
            amount: finalAmount.toString(),
            type,
            isPaid,
          },
          balanceBefore,
          balanceAfter: updatedAccount.balance,
          delta: balanceDelta,
          fromAccount: accountId,
        }, tx);
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

  async delete(id: string, workspaceId: number, userId: number): Promise<void> {
    const transaction = await this.transactionRepository.findByIdAndWorkspace(id, workspaceId);
    if (!transaction) throw new AppError('Transaction not found or access denied', 404);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { closedUntil: true, type: true } });
    
    // Guardião de Período Fiscal (closedUntil)
    if (workspace?.closedUntil) {
      const store = tenantContext.getStore();
      const isAccountantBypass = store?.userRole === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
      const isTargetDateClosed = dayjs(transaction.date).isSameOrBefore(dayjs(workspace.closedUntil), 'day');
      
      if (isTargetDateClosed && !isAccountantBypass) {
        throw new AppError('Acesso negado: A transação pertence a um período fiscal fechado e não pode ser deletada.', 403);
      }
    }

    // 1. Transação Atômica (Reembolsar Saldo + Apagar Registro)
    const account = await this.accountRepository.findByIdAndWorkspace(transaction.accountId, workspaceId);
    if (!account) throw new AppError('Account not found or access denied', 404);

    await prisma.$transaction(async (tx) => {
      if (transaction.isPaid && transaction.amount) {
        // Reverter saldo (Se era ganho, o saldo decresce; se era gasto, retorna ao caixa)
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

    // 2. V3.8 Expurgo Zumbi S3 (Asynchronous e Fora da Trasaction DB para não bloqueio)
    if (transaction.attachmentUrl && transaction.attachmentUrl.length > 5) {
      const uploadService = new UploadService();
      uploadService.deleteRemoteFile(transaction.attachmentUrl).catch((err) => {
        console.error('[R2 GC] Falha não-bloqueante ao apagar arquivo S3 Atrelado:', err);
      });
    }
  }
}
