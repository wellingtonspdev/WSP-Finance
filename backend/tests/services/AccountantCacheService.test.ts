import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sysPrisma } from '../../src/lib/prisma';
import { AccountantCacheService } from '../../src/services/AccountantCacheService';

vi.mock('../../src/lib/prisma', () => ({
  sysPrisma: {
    $executeRaw: vi.fn(),
    $transaction: vi.fn(async (queries) => {
      const results = [];
      for (const query of queries) {
        results.push(await query);
      }
      return results;
    }),
    workspaceMember: {
      findMany: vi.fn(),
    },
    bankMovement: {
      count: vi.fn(),
    },
    transaction: {
      count: vi.fn(),
    },
    account: {
      aggregate: vi.fn(),
    },
    accountantDashboardCache: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('AccountantCacheService', () => {
  let service: AccountantCacheService;

  beforeEach(() => {
    service = new AccountantCacheService();
    vi.clearAllMocks();
  });

  it('processes workspaces in batches of 5', async () => {
    const mockMemberships = Array.from({ length: 12 }, (_, index) => ({
      workspaceId: index + 1,
    }));

    vi.mocked(sysPrisma.workspaceMember.findMany).mockResolvedValue(mockMemberships as any);
    vi.mocked(sysPrisma.bankMovement.count).mockResolvedValue(3);
    vi.mocked(sysPrisma.transaction.count).mockResolvedValue(1);
    vi.mocked(sysPrisma.account.aggregate).mockResolvedValue({
      _sum: { balance: { toString: () => '10000.50' } },
      _count: null as any,
      _avg: null as any,
      _min: null as any,
      _max: null as any,
    } as any);
    vi.mocked(sysPrisma.accountantDashboardCache.upsert).mockResolvedValue({} as any);
    vi.mocked(sysPrisma.accountantDashboardCache.deleteMany).mockResolvedValue({ count: 0 } as any);

    const result = await service.refreshCache(1);

    expect(result).toEqual({ ok: true, workspacesProcessed: 12, errors: [] });
    expect(sysPrisma.accountantDashboardCache.upsert).toHaveBeenCalledTimes(12);
    expect(sysPrisma.accountantDashboardCache.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        workspaceId: {
          notIn: mockMemberships.map((membership) => membership.workspaceId),
        },
      },
    });

    const firstCall = vi.mocked(sysPrisma.accountantDashboardCache.upsert).mock.calls[0][0];
    expect(firstCall.create).toMatchObject({
      userId: 1,
      pendingMovements: 3,
      missingAttachments: 1,
      cashRiskAlert: false,
      totalBalance: 10000.5,
    });
  });

  it('marks cashRiskAlert=true when total balance is negative', async () => {
    vi.mocked(sysPrisma.workspaceMember.findMany).mockResolvedValue([
      { workspaceId: 99 },
    ] as any);
    vi.mocked(sysPrisma.bankMovement.count).mockResolvedValue(0);
    vi.mocked(sysPrisma.transaction.count).mockResolvedValue(0);
    vi.mocked(sysPrisma.account.aggregate).mockResolvedValue({
      _sum: { balance: { toString: () => '-500.00' } },
      _count: null as any,
      _avg: null as any,
      _min: null as any,
      _max: null as any,
    } as any);
    vi.mocked(sysPrisma.accountantDashboardCache.upsert).mockResolvedValue({} as any);
    vi.mocked(sysPrisma.accountantDashboardCache.deleteMany).mockResolvedValue({ count: 0 } as any);

    await service.refreshCache(1);

    const call = vi.mocked(sysPrisma.accountantDashboardCache.upsert).mock.calls[0][0];
    expect(call.create.cashRiskAlert).toBe(true);
    expect(call.create.totalBalance).toBe(-500);
  });

  it('cleans legacy cache when the accountant no longer has workspaces', async () => {
    vi.mocked(sysPrisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(sysPrisma.accountantDashboardCache.deleteMany).mockResolvedValue({ count: 2 } as any);

    const result = await service.refreshCache(999);

    expect(result).toEqual({ ok: true, workspacesProcessed: 0, errors: [] });
    expect(sysPrisma.accountantDashboardCache.upsert).not.toHaveBeenCalled();
    expect(sysPrisma.accountantDashboardCache.deleteMany).toHaveBeenCalledWith({
      where: { userId: 999 },
    });
  });

  it('returns workspace errors without throwing when one workspace refresh fails', async () => {
    vi.mocked(sysPrisma.workspaceMember.findMany).mockResolvedValue([
      { workspaceId: 1 },
      { workspaceId: 2 },
    ] as any);
    vi.mocked(sysPrisma.bankMovement.count).mockImplementation((args: any) => {
      if (args.where.workspaceId === 2) {
        return Promise.reject(new Error('workspace read failed'));
      }

      return Promise.resolve(3);
    });
    vi.mocked(sysPrisma.transaction.count).mockResolvedValue(1);
    vi.mocked(sysPrisma.account.aggregate).mockResolvedValue({
      _sum: { balance: { toString: () => '100.00' } },
      _count: null as any,
      _avg: null as any,
      _min: null as any,
      _max: null as any,
    } as any);
    vi.mocked(sysPrisma.accountantDashboardCache.upsert).mockResolvedValue({} as any);

    const result = await service.refreshCache(7);

    expect(result).toEqual({
      ok: true,
      workspacesProcessed: 1,
      errors: [{ workspaceId: 2, message: 'workspace read failed' }],
    });
    expect(sysPrisma.accountantDashboardCache.deleteMany).not.toHaveBeenCalled();
  });

  it('reads from cache without triggering heavy queries', async () => {
    const mockCache = [
      {
        id: 1,
        userId: 1,
        workspaceId: 1,
        pendingMovements: 5,
        missingAttachments: 2,
        cashRiskAlert: false,
        totalBalance: 30000,
        updatedAt: new Date(),
      },
    ];

    vi.mocked(sysPrisma.accountantDashboardCache.findMany).mockResolvedValue(mockCache as any);

    const result = await service.getCachedDashboard(1);

    expect(result).toEqual(mockCache);
    expect(sysPrisma.accountantDashboardCache.findMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('lets Prisma manage updatedAt and uses zero when aggregate balance is null', async () => {
    vi.mocked(sysPrisma.workspaceMember.findMany).mockResolvedValue([
      { workspaceId: 1 },
    ] as any);
    vi.mocked(sysPrisma.bankMovement.count).mockResolvedValue(0);
    vi.mocked(sysPrisma.transaction.count).mockResolvedValue(0);
    vi.mocked(sysPrisma.account.aggregate).mockResolvedValue({
      _sum: { balance: null },
      _count: null as any,
      _avg: null as any,
      _min: null as any,
      _max: null as any,
    } as any);
    vi.mocked(sysPrisma.accountantDashboardCache.upsert).mockResolvedValue({} as any);
    vi.mocked(sysPrisma.accountantDashboardCache.deleteMany).mockResolvedValue({ count: 0 } as any);

    await service.refreshCache(1);

    const call = vi.mocked(sysPrisma.accountantDashboardCache.upsert).mock.calls[0][0];
    expect(call.create.totalBalance).toBe(0);
    expect(call.create).not.toHaveProperty('updatedAt');
  });
});
