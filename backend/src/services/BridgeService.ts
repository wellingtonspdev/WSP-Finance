import { prisma } from '../lib/prisma';
import { AccountRepository } from '../repositories/AccountRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditLogService } from './AuditLogService';

interface BridgeTransferDTO {
  fromWorkspaceId: number;
  toWorkspaceId: number;
  amount: number;
  description: string;
  date: Date;
}

import { AppError } from '../errors/AppError';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

export class BridgeService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
    this.categoryRepository = new CategoryRepository();
  }

  async executeTransfer(userId: number, dto: BridgeTransferDTO) {
    // 1. RBAC Integrado: Validação de Pertencimento em ambos os workspaces
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: { in: [dto.fromWorkspaceId, dto.toWorkspaceId] },
        role: { in: ['OWNER', 'ACCOUNTANT'] } // Contador também pode operar
      },
      include: { workspace: true }
    });

    const fromMembership = memberships.find(m => m.workspaceId === dto.fromWorkspaceId);
    const toMembership = memberships.find(m => m.workspaceId === dto.toWorkspaceId);

    if (!fromMembership || !toMembership) {
      throw new AppError('Permissão negada: Você deve ter nível OWNER ou ACCOUNTANT em ambos os workspaces para transferir.', 403);
    }

    // 1.5. Guardião de Período Fiscal (Duplo Check Atômico)
    const validateClosedUntil = (workspace: any, role: string, transferDate: Date) => {
      if (workspace.closedUntil) {
        const isAccountantBypass = role === 'ACCOUNTANT' && workspace.type === 'BUSINESS';
        const isTargetDateClosed = dayjs(transferDate).isSameOrBefore(dayjs(workspace.closedUntil), 'day');
        
        if (isTargetDateClosed && !isAccountantBypass) {
          throw new AppError(`Acesso negado: Transferência afeta um período fiscal já fechado no Workspace ID ${workspace.id}.`, 403);
        }
      }
    };

    const targetDate = dto.date || new Date();
    validateClosedUntil(fromMembership.workspace, fromMembership.role, targetDate);
    validateClosedUntil(toMembership.workspace, toMembership.role, targetDate);

    // 2. Validação de Contas e Saldo
    const fromAccount = await this.accountRepository.findDefaultByWorkspace(dto.fromWorkspaceId, fromMembership.workspace.type);
    if (!fromAccount) throw new AppError('Conta de origem inválida ou não pertence ao workspace.', 404);

    const toAccount = await this.accountRepository.findDefaultByWorkspace(dto.toWorkspaceId, toMembership.workspace.type);
    if (!toAccount) throw new AppError('Conta de destino inválida ou não pertence ao workspace.', 404);

    if (fromAccount.balance.toNumber() < dto.amount) {
      throw new AppError('Saldo insuficiente na conta de origem.', 400);
    }

    // 3. Auto-Category: Buscar categorias adequadas
    const fromCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.fromWorkspaceId }, { workspaceId: null }] }
    });
    const toCategory = await prisma.category.findFirst({
      where: { OR: [{ workspaceId: dto.toWorkspaceId }, { workspaceId: null }] }
    });

    if (!fromCategory || !toCategory) {
      throw new AppError('Não foi possível identificar categorias válidas para a transferência.', 400);
    }

    // 4. Transação Atômica com Auditoria de Snapshot
    return await prisma.$transaction(async (tx: any) => {
      const amountDecimal = new Decimal(dto.amount);
      const bridgeId = crypto.randomUUID(); // ID de correlação

      // A. Saída (Débito)
      const debitTx = await tx.transaction.create({
        data: {
          workspaceId: dto.fromWorkspaceId,
          accountId: fromAccount.id,
          categoryId: fromCategory.id,
          type: 'EXPENSE',
          amount: amountDecimal,
          description: dto.description || `Transferência para Workspace ${dto.toWorkspaceId}`,
          isPaid: true,
          date: dto.date || new Date(),
          fitid: `BRIDGE_OUT_${bridgeId}` // Rastreabilidade
        }
      });

      // B. Entrada (Crédito)
      const creditTx = await tx.transaction.create({
        data: {
          workspaceId: dto.toWorkspaceId,
          accountId: toAccount.id,
          categoryId: toCategory.id,
          type: 'INCOME',
          amount: amountDecimal,
          description: dto.description || `Recebimento do Workspace ${dto.fromWorkspaceId}`,
          isPaid: true,
          date: dto.date || new Date(),
          fitid: `BRIDGE_IN_${bridgeId}`
        }
      });

      // C. Atualização de Saldos
      const updatedFromAccount = await tx.account.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amountDecimal } }
      });

      const updatedToAccount = await tx.account.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amountDecimal } }
      });

      // D. Auditoria estruturada da partida dobrada: uma linha para cada perna da ponte.
      const fromBalanceBefore = new Decimal(fromAccount.balance.toString());
      const toBalanceBefore = new Decimal(toAccount.balance.toString());

      await AuditLogService.logSync({
        userId,
        workspaceId: dto.fromWorkspaceId,
        action: 'BRIDGE_TRANSFER',
        entity: 'Transaction',
        entityId: bridgeId,
        oldState: {
          bridgeId,
          leg: 'DEBIT',
          accountId: fromAccount.id,
          balance: fromBalanceBefore.toString(),
        },
        newState: {
          bridgeId,
          leg: 'DEBIT',
          transactionId: debitTx.id,
          amount: amountDecimal.toString(),
          balance: updatedFromAccount.balance.toString(),
        },
        balanceBefore: fromBalanceBefore,
        balanceAfter: updatedFromAccount.balance,
        delta: amountDecimal.negated(),
        fromAccount: fromAccount.id,
        toAccount: toAccount.id,
      }, tx);

      await AuditLogService.logSync({
        userId,
        workspaceId: dto.toWorkspaceId,
        action: 'BRIDGE_TRANSFER',
        entity: 'Transaction',
        entityId: bridgeId,
        oldState: {
          bridgeId,
          leg: 'CREDIT',
          accountId: toAccount.id,
          balance: toBalanceBefore.toString(),
        },
        newState: {
          bridgeId,
          leg: 'CREDIT',
          transactionId: creditTx.id,
          amount: amountDecimal.toString(),
          balance: updatedToAccount.balance.toString(),
        },
        balanceBefore: toBalanceBefore,
        balanceAfter: updatedToAccount.balance,
        delta: amountDecimal,
        fromAccount: fromAccount.id,
        toAccount: toAccount.id,
      }, tx);

      return { debitTx, creditTx };
    });
  }
}
