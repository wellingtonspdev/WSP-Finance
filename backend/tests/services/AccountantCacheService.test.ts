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
  });
});
