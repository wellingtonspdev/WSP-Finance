import { Decimal } from 'decimal.js';
import { sysPrisma } from '../lib/prisma';
import { AccountantCacheRepository } from '../repositories/AccountantCacheRepository';

export interface RefreshCacheResult {
  ok: boolean;
  workspacesProcessed: number;
  errors: { workspaceId: number; message: string }[];
}

type WorkspaceRefreshResult =
  | { ok: true; workspaceId: number }
  | { ok: false; workspaceId: number; message: string };

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
   * Workspace-level failures are returned to callers so orchestration can report
   * partial refreshes without treating them as full success.
   */
  async refreshCache(userId: number): Promise<RefreshCacheResult> {
    const memberships = await sysPrisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    if (memberships.length === 0) {
      await this.cacheRepo.deleteCacheForUser(userId);
      return { ok: true, workspacesProcessed: 0, errors: [] };
    }

    const workspaceIds = [...new Set(memberships.map((membership) => membership.workspaceId))];
    const errors: RefreshCacheResult['errors'] = [];
    let workspacesProcessed = 0;

    for (let i = 0; i < workspaceIds.length; i += AccountantCacheService.BATCH_SIZE) {
      const batch = workspaceIds.slice(i, i + AccountantCacheService.BATCH_SIZE);
      const results = await Promise.all(
        batch.map((workspaceId) => this.refreshWorkspace(userId, workspaceId))
      );

      for (const result of results) {
        if (result.ok) {
          workspacesProcessed++;
        } else {
          errors.push({ workspaceId: result.workspaceId, message: result.message });
        }
      }
    }

    if (errors.length === 0) {
      await this.cacheRepo.deleteStaleCacheEntries(userId, workspaceIds);
    }

    return { ok: true, workspacesProcessed, errors };
  }

  /**
   * Fast read path used during accountant login/session restore.
   */
  async getCachedDashboard(userId: number) {
    return this.cacheRepo.getCachedDashboard(userId);
  }

  private async refreshWorkspace(
    userId: number,
    workspaceId: number
  ): Promise<WorkspaceRefreshResult> {
    try {
      await this.aggregateWorkspace(userId, workspaceId);
      return { ok: true, workspaceId };
    } catch (error) {
      return {
        ok: false,
        workspaceId,
        message: getErrorMessage(error),
      };
    }
  }

  /**
   * Aggregates one workspace worth of dashboard data and persists it in cache.
   */
  private async aggregateWorkspace(userId: number, workspaceId: number): Promise<void> {
    const [, pendingMovements, missingAttachments, totalBalanceResult, workspaceResult] = await sysPrisma.$transaction([
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
      sysPrisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { certificateExpiresAt: true },
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
      certificateExpiresAt: workspaceResult?.certificateExpiresAt ?? null,
    });
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}
