import { prisma } from '../lib/prisma';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { UploadService } from './UploadService';

interface CreateTransactionDTO {
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

    // Recupera o Workspace para obter o Linter Fiscal (taxRate)
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace not found');

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
        const balanceDelta = type === 'INCOME' ? finalAmount : finalAmount.negated();
        await this.accountRepository.updateBalance(accountId, balanceDelta, tx);
      }

      return transaction;
    });
  }

  async list(workspaceId: number, filters: any) {
    return await this.transactionRepository.findManyByWorkspace(workspaceId, filters);
  }

  async listAllByUser(userId: number) {
    return await this.transactionRepository.findManyByUserId(userId);
  }

  async delete(id: string, workspaceId: number): Promise<void> {
    const transaction = await this.transactionRepository.findByIdAndWorkspace(id, workspaceId);
    if (!transaction) throw new Error('Transaction not found or access denied');

    // 1. Transação Atômica (Reembolsar Saldo + Apagar Registro)
    await prisma.$transaction(async (tx) => {
      if (transaction.isPaid && transaction.amount) {
        // Reverter saldo (Se era ganho, o saldo decresce; se era gasto, retorna ao caixa)
        const balanceDelta = transaction.type === 'INCOME' ? Number(transaction.amount) * -1 : Number(transaction.amount);
        await this.accountRepository.updateBalance(transaction.accountId, new Decimal(balanceDelta), tx);
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