import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class DashboardRepository {
  // 1. Saldo Total Consolidado (Soma de todas as contas do workspace)
  async getTotalBalance(workspaceId: number): Promise<number> {
    const result = await prisma.account.aggregate({
      _sum: {
        balance: true
      },
      where: {
        workspaceId,
        isIncludedInTotal: true // Apenas contas marcadas para somar
      }
    });

    return result._sum.balance ? result._sum.balance.toNumber() : 0;
  }

  // 2. Fluxo de Caixa do Mês (Receitas vs Despesas)
  async getMonthlyFlow(workspaceId: number, startDate: Date, endDate: Date) {
    const result = await prisma.transaction.groupBy({
      by: ['type'],
      _sum: {
        amount: true
      },
      where: {
        workspaceId,
        date: {
          gte: startDate,
          lte: endDate
        },
        isPaid: true // Apenas efetivadas contam para o fluxo realizado
      }
    });

    // Formata o retorno para { INCOME: 100, EXPENSE: 50 }
    const flow = {
      INCOME: 0,
      EXPENSE: 0
    };

    result.forEach(item => {
      if (item.type === 'INCOME' && item._sum.amount) {
        flow.INCOME = item._sum.amount.toNumber();
      } else if (item.type === 'EXPENSE' && item._sum.amount) {
        flow.EXPENSE = item._sum.amount.toNumber();
      }
    });

    return flow;
  }

  // 3. Despesas Fixas (Custo de Vida / Burn Rate)
  async getFixedExpenses(workspaceId: number): Promise<number> {
    const result = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      },
      where: {
        workspaceId,
        type: 'EXPENSE',
        isFixed: true,
        // Pegamos as fixas ativas. Como não temos "status", assumimos que
        // se existe uma transação fixa no mês atual ou futuro, ela conta.
        // Simplificação PACT: Soma das despesas fixas do mês atual.
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
      }
    });

    return result._sum.amount ? result._sum.amount.toNumber() : 0;
  }
}