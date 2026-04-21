import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { AccountantCacheService, RefreshCacheResult } from './AccountantCacheService';
import { sysPrisma } from '../lib/prisma';

export class CronService {
  private notificationRepository: NotificationRepository;
  private accountantCacheService: AccountantCacheService;
  private isCacheRefreshRunning = false;
  private isStarted = false;

  constructor(accountantCacheService?: AccountantCacheService) {
    this.notificationRepository = new NotificationRepository();
    this.accountantCacheService = accountantCacheService || new AccountantCacheService();
  }

  // Inicia os agendamentos
  start() {
    if (this.isStarted) {
      console.warn('⏰ Cron Service já foi iniciado. Ignorando dupla execução.');
      return;
    }
    this.isStarted = true;

    console.log('⏰ Cron Service iniciado...');

    // Executa todos os dias às 08:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('Running Daily Financial Health Check...');
      await this.checkFinancialHealth();
    });

    // Atualização de cache a cada 30 minutos
    cron.schedule('*/30 * * * *', async () => {
      console.log('[CronCache] Running Accountant Cache Refresh...');
      await this.refreshAccountantCaches();
    });
  }

  private CACHE_REFRESH_TIMEOUT_MS = 25000;

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  async refreshAccountantCaches() {
    if (this.isCacheRefreshRunning) {
      console.warn('[CronCache] Refresh already running, skipping this round.');
      return;
    }

    this.isCacheRefreshRunning = true;
    const startTime = Date.now();
    let successes = 0;
    let errors = 0;
    let timeouts = 0;

    try {
      let accountants;
      try {
        accountants = await sysPrisma.user.findMany({
          where: { type: 'ACCOUNTANT' },
          select: { id: true, name: true }
        });
      } catch (roundErr: any) {
        console.error(`[CronCache] CRITICAL ERROR: Accountant Cache refresh round failed entirely. Reason: ${roundErr?.message}`);
        return; // Exits to the finally block natively, skipping the summary logs
      }

      for (const accountant of accountants) {
        try {
          const result: RefreshCacheResult = await this.withTimeout(
            this.accountantCacheService.refreshCache(accountant.id),
            this.CACHE_REFRESH_TIMEOUT_MS
          );

          if (result && result.errors && result.errors.length > 0) {
            console.warn(`[CronCache] Partial success for accountant ${accountant.id}: ${result.errors.length} workspace(s) failed.`);
            errors++;
          } else {
            console.log(`[CronCache] Successfully refreshed cache for accountant ${accountant.id}`);
            successes++;
          }
        } catch (err: any) {
          if (err.message === 'TIMEOUT') {
            console.warn(`[CronCache] Timeout (${this.CACHE_REFRESH_TIMEOUT_MS}ms) refreshing cache for accountant ${accountant.id}`);
            timeouts++;
          } else {
            console.error(`[CronCache] Error refreshing cache for accountant ${accountant.id}: ${err?.message}`);
            errors++;
          }
        }
      }
      const duration = Date.now() - startTime;
      console.log(`[CronCache] Finished refresh round: ${duration}ms | ${successes} success, ${errors} errors, ${timeouts} timeouts`);
    } finally {
      this.isCacheRefreshRunning = false;
    }
  }

  // Lógica de Verificação
  async checkFinancialHealth() {
    // 1. Buscar membros OWNER e seus respectivos Workspaces
    // O sistema agora segue o modelo multi-tenant via WorkspaceMember
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