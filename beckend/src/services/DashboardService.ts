import { DashboardRepository } from '../repositories/DashboardRepository';
import { startOfMonth, endOfMonth } from 'date-fns';

export class DashboardService {
  private dashboardRepository: DashboardRepository;

  constructor() {
    this.dashboardRepository = new DashboardRepository();
  }

  async getSummary(workspaceId: number, month?: number, year?: number) {
    // Definir o intervalo de datas (Mês atual ou solicitado)
    const now = new Date();
    const targetMonth = month ? month - 1 : now.getMonth(); // JS Date começa em 0
    const targetYear = year || now.getFullYear();

    const startDate = startOfMonth(new Date(targetYear, targetMonth));
    const endDate = endOfMonth(new Date(targetYear, targetMonth));

    // Executar queries em paralelo para performance
    const [totalBalance, monthlyFlow, fixedExpenses] = await Promise.all([
      this.dashboardRepository.getTotalBalance(workspaceId),
      this.dashboardRepository.getMonthlyFlow(workspaceId, startDate, endDate),
      this.dashboardRepository.getFixedExpenses(workspaceId)
    ]);

    // Cálculo de Indicadores PACT
    const result = monthlyFlow.INCOME - monthlyFlow.EXPENSE;
    
    // Ponto de Equilíbrio: Quanto falta para cobrir as despesas fixas?
    // Se Receita < Fixas, o breakEven é o valor das fixas.
    // Se Receita > Fixas, já atingiu.
    // Mas o PACT define como "Quanto preciso faturar". Então é o valor das fixas.
    const breakEvenPoint = fixedExpenses;

    return {
      period: {
        month: targetMonth + 1,
        year: targetYear
      },
      balance: {
        total: totalBalance,
        label: "Saldo Disponível"
      },
      flow: {
        income: monthlyFlow.INCOME,
        expense: monthlyFlow.EXPENSE,
        result: result,
        label: result >= 0 ? "Lucro do Mês" : "Prejuízo do Mês"
      },
      metrics: {
        fixedExpenses: fixedExpenses,
        breakEvenPoint: breakEvenPoint,
        coverageRatio: fixedExpenses > 0 ? (monthlyFlow.INCOME / fixedExpenses) * 100 : 0 // % das fixas pagas
      }
    };
  }
}