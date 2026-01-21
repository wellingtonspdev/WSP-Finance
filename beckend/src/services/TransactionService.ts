import { prisma } from '../lib/prisma';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateTransactionDTO {
  description: string;
  amount: number;
  date: Date;
  type: TransactionType;
  accountId: string;
  categoryId: number;
  isPaid: boolean;
  workspaceId: number;
  // Campos Opcionais de Marketplace (PACT)
  grossAmount?: number;
  marketplaceFee?: number;
  shippingCost?: number;
  productCost?: number;
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
    productCost
  }: CreateTransactionDTO) {
    // 1. Validações de Pertencimento (Segurança)
    const account = await this.accountRepository.findByIdAndWorkspace(accountId, workspaceId);
    if (!account) throw new Error('Account not found or access denied');

    const category = await this.categoryRepository.findByIdAndWorkspace(categoryId, workspaceId);
    if (!category) throw new Error('Category not found or access denied');

    // 2. Lógica de Cálculo de Marketplace (PACT)
    let finalAmount = new Decimal(amount);
    let calculatedGross = grossAmount ? new Decimal(grossAmount) : null;
    let calculatedFee = marketplaceFee ? new Decimal(marketplaceFee) : null;
    let calculatedShipping = shippingCost ? new Decimal(shippingCost) : null;
    let calculatedCost = productCost ? new Decimal(productCost) : null;

    // Se for uma venda de marketplace (tem valor bruto), calculamos o líquido
    if (grossAmount !== undefined && grossAmount !== null) {
      const gross = new Decimal(grossAmount);
      const fee = marketplaceFee ? new Decimal(marketplaceFee) : new Decimal(0);
      const shipping = shippingCost ? new Decimal(shippingCost) : new Decimal(0);
      const cost = productCost ? new Decimal(productCost) : new Decimal(0);

      // Fórmula: Líquido = Bruto - (Taxas + Frete + Custo)
      // Nota: O custo do produto (CMV) reduz o lucro contábil, mas para fluxo de caixa
      // o que entra na conta é Bruto - (Taxas + Frete).
      // Se quisermos o "Lucro Líquido Real" no relatório, salvamos o custo.
      // Mas o saldo da conta aumenta pelo que a plataforma paga (Bruto - Taxas - Frete).
      
      // Ajuste PACT: O saldo da conta deve refletir o que "caiu na conta".
      // O productCost é informativo para análise de margem, mas geralmente já foi pago antes.
      // Vamos assumir que amount = Bruto - Taxas - Frete.
      
      finalAmount = gross.minus(fee).minus(shipping);
      
      // Se o usuário mandou um 'amount' explícito que difere do cálculo,
      // priorizamos o cálculo para garantir consistência, ou usamos o amount como override?
      // Pela regra de negócio, o cálculo deve prevalecer se os dados brutos forem enviados.
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
}