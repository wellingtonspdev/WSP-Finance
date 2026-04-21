import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// --- Mocks hoisted (padrão do projeto) ---
const mocks = vi.hoisted(() => ({
  findManyMembers: vi.fn(),
  deleteManyCache: vi.fn(),
  upsertCache: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  sysPrisma: {
    workspaceMember: { findMany: mocks.findManyMembers },
    accountantDashboardCache: {
      deleteMany: mocks.deleteManyCache,
      upsert: mocks.upsertCache,
    },
    $transaction: mocks.transaction,
  },
}));

import { AccountantCacheService } from '../../src/services/AccountantCacheService';

// --- Helpers ---
function setupTransactionMock(overrides: {
  totalBalance?: number;
  pendingMovements?: number;
  missingAttachments?: number;
  projectedIncome?: number;
  projectedExpense?: number;
} = {}) {
  const {
    totalBalance = 1000,
    pendingMovements = 5,
    missingAttachments = 3,
    projectedIncome = 500,
    projectedExpense = 200,
  } = overrides;

  mocks.transaction.mockImplementation(async (callback: Function) => {
    const txProxy = {
      $executeRaw: vi.fn(),
      account: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { balance: new Decimal(totalBalance) },
        }),
      },
      bankMovement: {
        count: vi.fn().mockResolvedValue(pendingMovements),
      },
      transaction: {
        count: vi.fn().mockResolvedValue(missingAttachments),
        groupBy: vi.fn().mockResolvedValue([
          { type: 'INCOME', _sum: { amount: new Decimal(projectedIncome) } },
          { type: 'EXPENSE', _sum: { amount: new Decimal(projectedExpense) } },
        ]),
      },
    };
    return callback(txProxy);
  });
}

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
    vi.clearAllMocks();
    service = new AccountantCacheService();
    mocks.deleteManyCache.mockResolvedValue({ count: 0 });
    mocks.upsertCache.mockResolvedValue({});
  });

  // TC1: Edge case vazio
  it('TC1 - retorna resultado vazio quando usuário não tem memberships ACCOUNTANT', async () => {
    mocks.findManyMembers.mockResolvedValue([]);

    const result = await service.refreshCache(999);

    expect(result).toEqual({
      ok: true,
      workspacesProcessed: 0,
      errors: [],
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.upsertCache).not.toHaveBeenCalled();
  });

  // TC2: Happy path — 2 workspaces
  it('TC2 - processa 2 workspaces corretamente', async () => {
    mocks.findManyMembers.mockResolvedValue([
      { workspaceId: 10 },
      { workspaceId: 20 },
    ]);
    setupTransactionMock();

    const result = await service.refreshCache(1);

    expect(result.ok).toBe(true);
    expect(result.workspacesProcessed).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.upsertCache).toHaveBeenCalledTimes(2);
  });

  // TC3: Isolamento de falha
  it('TC3 - falha em um workspace não bloqueia os demais', async () => {
    mocks.findManyMembers.mockResolvedValue([
      { workspaceId: 10 },
      { workspaceId: 20 },
    ]);

    let callCount = 0;
    mocks.transaction.mockImplementation(async (callback: Function) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Query falhou no workspace 10');
      }
      const txProxy = {
        $executeRaw: vi.fn(),
        account: {
          aggregate: vi.fn().mockResolvedValue({
            _sum: { balance: new Decimal(500) },
          }),
        },
        bankMovement: { count: vi.fn().mockResolvedValue(0) },
        transaction: {
          count: vi.fn().mockResolvedValue(0),
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };
      return callback(txProxy);
    });

    const result = await service.refreshCache(1);

    expect(result.ok).toBe(true);
    expect(result.workspacesProcessed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].workspaceId).toBe(10);
    expect(mocks.upsertCache).toHaveBeenCalledTimes(1);
  });

  // TC4: Integridade de dados
  it('TC4 - persiste campos estruturados corretos no upsert', async () => {
    mocks.findManyMembers.mockResolvedValue([{ workspaceId: 42 }]);
    setupTransactionMock({
      totalBalance: 15000.5,
      pendingMovements: 12,
      missingAttachments: 7,
      projectedIncome: 1000,
      projectedExpense: 500,
    });

    await service.refreshCache(5);

    expect(mocks.upsertCache).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_workspaceId: { userId: 5, workspaceId: 42 } },
        create: expect.objectContaining({
          userId: 5,
          workspaceId: 42,
          pendingMovements: 12,
          missingAttachments: 7,
          cashRiskAlert: false,
          certificateExpiresAt: null,
        }),
        update: expect.objectContaining({
          pendingMovements: 12,
          missingAttachments: 7,
          cashRiskAlert: false,
        }),
      })
    );
  });

  // TC5: cashRiskAlert = true
  it('TC5 - cashRiskAlert true quando projeção é negativa', async () => {
    mocks.findManyMembers.mockResolvedValue([{ workspaceId: 1 }]);
    setupTransactionMock({
      totalBalance: 100,
      projectedIncome: 0,
      projectedExpense: 500,
    });

    await service.refreshCache(1);

    expect(mocks.upsertCache).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cashRiskAlert: true }),
        update: expect.objectContaining({ cashRiskAlert: true }),
      })
    );
  });

  // TC6: cashRiskAlert = false
  it('TC6 - cashRiskAlert false quando projeção é positiva', async () => {
    mocks.findManyMembers.mockResolvedValue([{ workspaceId: 1 }]);
    setupTransactionMock({
      totalBalance: 10000,
      projectedIncome: 5000,
      projectedExpense: 2000,
    });

    await service.refreshCache(1);

    expect(mocks.upsertCache).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cashRiskAlert: false }),
        update: expect.objectContaining({ cashRiskAlert: false }),
      })
    );
  });

  // TC7: certificateExpiresAt sempre null
  it('TC7 - certificateExpiresAt é sempre null (placeholder)', async () => {
    mocks.findManyMembers.mockResolvedValue([{ workspaceId: 1 }]);
    setupTransactionMock();

    await service.refreshCache(1);

    expect(mocks.upsertCache).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ certificateExpiresAt: null }),
      })
    );
  });

  // TC8: Stale rows deletadas
  it('TC8 - deleta stale rows de workspaces onde não é mais ACCOUNTANT', async () => {
    mocks.findManyMembers.mockResolvedValue([
      { workspaceId: 1 },
      { workspaceId: 3 },
    ]);
    setupTransactionMock();

    await service.refreshCache(10);

    expect(mocks.deleteManyCache).toHaveBeenCalledWith({
      where: {
        userId: 10,
        workspaceId: { notIn: [1, 3] },
      },
    });
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

    await service.refreshCache(1);

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

    await service.refreshCache(999);

    expect(sysPrisma.accountantDashboardCache.upsert).not.toHaveBeenCalled();
    expect(sysPrisma.accountantDashboardCache.deleteMany).toHaveBeenCalledWith({
      where: { userId: 999 },
    });
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
