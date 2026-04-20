import { Decimal } from 'decimal.js';
import { sysPrisma } from '../lib/prisma';
import { AccountantCacheRepository } from '../repositories/AccountantCacheRepository';

/**
 * Materializes accountant KPIs per workspace so login does not trigger
 * multiple heavy dashboard queries at once.
 *
 * Batches stay at 5 to avoid saturating the Supabase Free connection pool.
 */
export class AccountantCacheService {
  private cacheRepo: AccountantCacheRepository;
  private static readonly BATCH_SIZE = 5;

  constructor() {
    this.cacheRepo = new AccountantCacheRepository();
  }

  /**
   * Refreshes cache rows for every workspace currently assigned to the accountant.
   * Stale rows are pruned only after a successful refresh of the current set.
   */
  async refreshCache(userId: number): Promise<void> {
    const memberships = await sysPrisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    if (memberships.length === 0) {
      await this.cacheRepo.deleteCacheForUser(userId);
      return;
    }

    const workspaceIds = [...new Set(memberships.map((membership) => membership.workspaceId))];

    for (let i = 0; i < workspaceIds.length; i += AccountantCacheService.BATCH_SIZE) {
      const batch = workspaceIds.slice(i, i + AccountantCacheService.BATCH_SIZE);
      await Promise.all(batch.map((workspaceId) => this.aggregateWorkspace(userId, workspaceId)));
    }

    await this.cacheRepo.deleteStaleCacheEntries(userId, workspaceIds);
  }

  /**
   * Aggregates one workspace worth of dashboard data and persists it in cache.
   */
  private async aggregateWorkspace(userId: number, workspaceId: number): Promise<void> {
    const [, pendingMovements, missingAttachments, totalBalanceResult] = await sysPrisma.$transaction([
      sysPrisma.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`,
      sysPrisma.bankMovement.count({
        where: { workspaceId, status: 'PENDING' },
      }),
      sysPrisma.transaction.count({
        where: {
          workspaceId,
          deletedAt: null,
          attachmentUrl: null,
        },
      }),
      sysPrisma.account.aggregate({
        where: { workspaceId, isIncludedInTotal: true },
        _sum: { balance: true },
      }),
    ]);

    const totalBalance = totalBalanceResult._sum.balance
      ? new Decimal(totalBalanceResult._sum.balance.toString()).toNumber()
      : 0;

    const cashRiskAlert = totalBalance < 0;

    await this.cacheRepo.upsertCache({
      userId,
      workspaceId,
      pendingMovements,
      missingAttachments,
      cashRiskAlert,
      totalBalance,
    });
  }

  /**
   * Fast read path used during accountant login/session restore.
   */
  async getCachedDashboard(userId: number) {
    return this.cacheRepo.getCachedDashboard(userId);
  }
}
