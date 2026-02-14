import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export class CronService {
  private notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  // Inicia os agendamentos
  start() {
    console.log('⏰ Cron Service iniciado...');

    // Executa todos os dias às 08:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('Running Daily Financial Health Check...');
      await this.checkFinancialHealth();
    });
  }

  // Lógica de Verificação
  async checkFinancialHealth() {
    // Buscar todos os usuários (em produção, faríamos em lotes/paginado)
    const users = await prisma.user.findMany({
      include: { workspaces: true } // Traz os workspaces onde ele é dono (via relação antiga ou nova?)
      // ATENÇÃO: Com a mudança para WorkspaceMember, precisamos ajustar a query.
      // Vamos buscar usuários e seus memberships OWNER.
    });

    // Ajuste para o novo schema: Buscar usuários e seus workspaces onde são OWNER
    const owners = await prisma.workspaceMember.findMany({
      where: { role: 'OWNER' },
      include: { user: true, workspace: true }
    });

    // Agrupar por usuário para não mandar notificação duplicada
    const userWorkspaces = new Map<number, number[]>();
    owners.forEach(member => {
      const list = userWorkspaces.get(member.userId) || [];
      list.push(member.workspaceId);
      userWorkspaces.set(member.userId, list);
    });

    for (const [userId, workspaceIds] of userWorkspaces.entries()) {
      await this.analyzeUserRisk(userId, workspaceIds);
    }
  }

  private async analyzeUserRisk(userId: number, workspaceIds: number[]) {
    const today = startOfDay(new Date());
    const next5Days = endOfDay(addDays(today, 5));

    // 1. Contas a Pagar (Vencendo hoje ou próximos 5 dias)
    const dueTransactions = await prisma.transaction.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        type: 'EXPENSE',
        isPaid: false,
        dueDate: {
          gte: today,
          lte: next5Days
        }
      }
    });

    if (dueTransactions.length > 0) {
      const totalDue = dueTransactions.reduce((acc, tx) => acc + tx.amount.toNumber(), 0);
      await this.notificationRepository.create({
        title: 'Contas a Pagar Próximas',
        message: `Você tem ${dueTransactions.length} contas vencendo em breve, totalizando R$ ${totalDue.toFixed(2)}.`,
        user: { connect: { id: userId } }
      });
    }

    // 2. Risco de Caixa (Saldo Atual + Receitas Previstas - Despesas Previstas)
    // Calcular saldo atual de todas as contas
    const accounts = await prisma.account.findMany({
      where: { workspaceId: { in: workspaceIds }, isIncludedInTotal: true }
    });
    const currentBalance = accounts.reduce((acc, accObj) => acc + accObj.balance.toNumber(), 0);

    // Calcular fluxo previsto (5 dias)
    const futureFlow = await prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        workspaceId: { in: workspaceIds },
        isPaid: false, // Apenas o que AINDA vai acontecer
        dueDate: { gte: today, lte: next5Days }
      }
    });

    let projectedIncome = 0;
    let projectedExpense = 0;

    futureFlow.forEach(f => {
      if (f.type === 'INCOME') projectedIncome = f._sum.amount?.toNumber() || 0;
      if (f.type === 'EXPENSE') projectedExpense = f._sum.amount?.toNumber() || 0;
    });

    const projectedBalance = currentBalance + projectedIncome - projectedExpense;

    if (projectedBalance < 0) {
      await this.notificationRepository.create({
        title: '⚠️ Risco de Caixa Detectado',
        message: `Atenção! Seu saldo projetado para daqui a 5 dias é negativo (R$ ${projectedBalance.toFixed(2)}). Revise suas contas.`,
        user: { connect: { id: userId } }
      });
    }
  }
}