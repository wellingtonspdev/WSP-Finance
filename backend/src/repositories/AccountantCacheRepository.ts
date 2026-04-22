import { sysPrisma } from '../lib/prisma';

export class AccountantCacheRepository {
  /**
   * Upsert do cache para um workspace específico do contador.
   * Usa a constraint @@unique([userId, workspaceId]) para idempotência.
   */
  async upsertCache(data: {
    userId: number;
    workspaceId: number;
    pendingMovements: number;
    missingAttachments: number;
    cashRiskAlert: boolean;
    totalBalance: number;
    certificateExpiresAt: Date | null;
  }) {
    return sysPrisma.accountantDashboardCache.upsert({
      where: {
        userId_workspaceId: {
          userId: data.userId,
          workspaceId: data.workspaceId,
        },
      },
      update: {
        pendingMovements: data.pendingMovements,
        missingAttachments: data.missingAttachments,
        cashRiskAlert: data.cashRiskAlert,
        totalBalance: data.totalBalance,
        certificateExpiresAt: data.certificateExpiresAt,
      },
      create: data,
    });
  }

  async getCachedDashboard(userId: number) {
    return sysPrisma.accountantDashboardCache.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteStaleCacheEntries(userId: number, workspaceIds: number[]) {
    return sysPrisma.accountantDashboardCache.deleteMany({
      where: {
        userId,
        workspaceId: {
          notIn: workspaceIds,
        },
      },
    });
  }

  async deleteCacheForUser(userId: number) {
    return sysPrisma.accountantDashboardCache.deleteMany({
      where: { userId },
    });
  }
}
