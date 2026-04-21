import { sysPrisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const LOG_PREFIX = '[AccountantCache]';
const CASH_RISK_PROJECTION_DAYS = 5;

export interface RefreshCacheResult {
  ok: boolean;
  workspacesProcessed: number;
  errors: { workspaceId: number; message: string }[];
}

export class AccountantCacheService {
  async refreshCache(userId: number): Promise<RefreshCacheResult> {
    const errors: { workspaceId: number; message: string }[] = [];
    let workspacesProcessed = 0;

    const memberships = await sysPrisma.workspaceMember.findMany({
      where: { userId, role: 'ACCOUNTANT' },
      select: { workspaceId: true },
    });

    const activeWsIds = memberships.map((m: { workspaceId: number }) => m.workspaceId);

    if (activeWsIds.length === 0) {
      console.log(`${LOG_PREFIX} userId=${userId} | sem memberships ACCOUNTANT, pulando`);
      return { ok: true, workspacesProcessed: 0, errors: [] };
    }

    // Prune stale rows
    await sysPrisma.accountantDashboardCache.deleteMany({
      where: {
        userId,
        workspaceId: { notIn: activeWsIds },
      },
    });

    console.log(`${LOG_PREFIX} userId=${userId} | ${activeWsIds.length} workspaces para processar`);

    for (const workspaceId of activeWsIds) {
      try {
        // LEITURA — dentro de $transaction com set_config RLS
        const cacheData = await sysPrisma.$transaction(async (tx: any) => {
          await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`;

          const balanceResult = await tx.account.aggregate({
            _sum: { balance: true },
            where: { workspaceId, isIncludedInTotal: true },
          });
          const totalBalance = balanceResult._sum.balance ?? new Decimal(0);

          const pendingMovements = await tx.bankMovement.count({
            where: { workspaceId, status: 'PENDING' },
          });

          const missingAttachments = await tx.transaction.count({
            where: {
              workspaceId,
              isPaid: true,
              OR: [
                { attachmentUrl: null },
                { attachmentUrl: '' },
              ],
            },
          });

          const cashRiskAlert = await this.calculateCashRisk(tx, workspaceId, totalBalance);

          return { totalBalance, pendingMovements, missingAttachments, cashRiskAlert };
        });

        // ESCRITA — upsert FORA da transaction RLS
        await sysPrisma.accountantDashboardCache.upsert({
          where: { userId_workspaceId: { userId, workspaceId } },
          create: {
            userId,
            workspaceId,
            totalBalance: cacheData.totalBalance,
            pendingMovements: cacheData.pendingMovements,
            missingAttachments: cacheData.missingAttachments,
            cashRiskAlert: cacheData.cashRiskAlert,
            certificateExpiresAt: null,
          },
          update: {
            totalBalance: cacheData.totalBalance,
            pendingMovements: cacheData.pendingMovements,
            missingAttachments: cacheData.missingAttachments,
            cashRiskAlert: cacheData.cashRiskAlert,
          },
        });

        workspacesProcessed++;
      } catch (err: any) {
        console.warn(`${LOG_PREFIX} ❌ userId=${userId} wsId=${workspaceId} | ${err?.message}`);
        errors.push({
          workspaceId,
          message: err?.message ?? 'Unknown error',
        });
      }
    }

    console.log(`${LOG_PREFIX} userId=${userId} | ${workspacesProcessed} ok, ${errors.length} erros`);
    return { ok: true, workspacesProcessed, errors };
  }

  private async calculateCashRisk(tx: any, workspaceId: number, totalBalance: Decimal | number): Promise<boolean> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + CASH_RISK_PROJECTION_DAYS);

    const futureFlow = await tx.transaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        workspaceId,
        isPaid: false,
        dueDate: { gte: today, lte: futureDate },
      },
    });

    let projectedIncome = 0;
    let projectedExpense = 0;
    for (const f of futureFlow) {
      if (f.type === 'INCOME') projectedIncome = f._sum.amount?.toNumber() ?? 0;
      if (f.type === 'EXPENSE') projectedExpense = f._sum.amount?.toNumber() ?? 0;
    }

    const currentBalance = totalBalance instanceof Decimal
      ? totalBalance.toNumber()
      : Number(totalBalance);

    return (currentBalance + projectedIncome - projectedExpense) < 0;
  }
}
