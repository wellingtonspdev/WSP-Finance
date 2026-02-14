import { prisma } from '../lib/prisma';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType, AuditAction } from '@prisma/client';

interface BridgeTransferDTO {
  fromWorkspaceId: number;
  toWorkspaceId: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description: string;
  date: Date;
}

export class BridgeService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.categoryRepository = new CategoryRepository();
  }

  async executeTransfer(userId: number, dto: BridgeTransferDTO) {
    // 1. RBAC Integrado: Validação de OWNER em ambos os workspaces
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: { in: [dto.fromWorkspaceId, dto.toWorkspaceId] },
        role: 'OWNER'
      }
    });

    if (memberships.length !== 2) {
      throw new Error('Permissão negada: Você deve ser OWNER de ambos os workspaces para realizar transferências.');
    }

    // 2. Validação de Contas e Saldo
    const fromAccount = await this.accountRepository.findByIdAndWorkspace(dto.fromAccountId, dto.fromWorkspaceId);
    if (!fromAccount) throw new Error('Conta de origem inválida ou não pertence ao workspace.');

    const toAccount = await this.accountRepository.findByIdAndWorkspace(dto.toAccountId, dto.toWorkspaceId);
    if (!toAccount) throw new Error('Conta de destino inválida ou não pertence ao workspace.');

    if (fromAccount.balance.toNumber() < dto.amount) {
      throw new Error('Saldo insuficiente na conta de origem.');
    }

    // 3. Auto-Category: Buscar categorias adequadas
    // Tenta achar categorias globais ou do workspace. 
    // Idealmente teríamos categorias específicas "Transferência", mas vamos pegar a primeira válida para não travar.
    const fromCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.fromWorkspaceId }, { workspaceId: null }] }
    });
    const toCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.toWorkspaceId }, { workspaceId: null }] }
    });

    if (!fromCategory || !toCategory) {
      throw new Error('Não foi possível identificar categorias válidas para a transferência.');
    }

    // 4. Transação Atômica com Auditoria de Snapshot
    return await prisma.$transaction(async (tx) => {
      const amountDecimal = new Decimal(dto.amount);
      const bridgeId = crypto.randomUUID(); // ID de correlação

      // A. Saída (Débito)
      const debitTx = await tx.transaction.create({
        data: {
          workspaceId: dto.fromWorkspaceId,
          accountId: dto.fromAccountId,
          categoryId: fromCategory.id,
          type: 'EXPENSE',
          amount: amountDecimal,
          description: dto.description || `Transferência para Workspace ${dto.toWorkspaceId}`,
          isPaid: true,
          fitid: `BRIDGE_OUT_${bridgeId}` // Rastreabilidade
        }
      });

      // B. Entrada (Crédito)
      const creditTx = await tx.transaction.create({
        data: {
          workspaceId: dto.toWorkspaceId,
          accountId: dto.toAccountId,
          categoryId: toCategory.id,
          type: 'INCOME',
          amount: amountDecimal,
          description: dto.description || `Recebimento do Workspace ${dto.fromWorkspaceId}`,
          isPaid: true,
          fitid: `BRIDGE_IN_${bridgeId}`
        }
      });

      // C. Atualização de Saldos
      await tx.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: amountDecimal } }
      });

      await tx.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: amountDecimal } }
      });

      // D. Auditoria de Snapshot (Antes e Depois)
      // Nota: O 'depois' é calculado, pois o banco só retorna após o commit.
      const fromBalanceBefore = fromAccount.balance.toNumber();
      const toBalanceBefore = toAccount.balance.toNumber();

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BRIDGE_TRANSFER',
          entity: 'Transaction',
          entityId: bridgeId, // Usamos o ID da ponte como referência
          oldState: {
            fromAccount: { id: dto.fromAccountId, balance: fromBalanceBefore },
            toAccount: { id: dto.toAccountId, balance: toBalanceBefore }
          },
          newState: {
            fromAccount: { id: dto.fromAccountId, balance: fromBalanceBefore - dto.amount },
            toAccount: { id: dto.toAccountId, balance: toBalanceBefore + dto.amount }
          },
          details: { bridgeId, amount: dto.amount }
        }
      });

      return { debitTx, creditTx };
    });
  }
}