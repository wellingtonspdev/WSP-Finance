import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { BridgeService } from '../../src/services/BridgeService';

const mocks = vi.hoisted(() => ({
  mockWorkspaceMemberFindMany: vi.fn(),
  mockCategoryFindFirst: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockAccountFindByIdAndWorkspace: vi.fn(),
  mockTxTransactionCreate: vi.fn(),
  mockTxAccountUpdate: vi.fn(),
  mockAuditLogSync: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findMany: mocks.mockWorkspaceMemberFindMany },
    category: { findFirst: mocks.mockCategoryFindFirst },
    $transaction: mocks.mockPrismaTransaction,
  },
}));

vi.mock('../../src/repositories/AccountRepository', () => ({
  AccountRepository: class {
    findByIdAndWorkspace = mocks.mockAccountFindByIdAndWorkspace;
  },
}));

vi.mock('../../src/repositories/CategoryRepository', () => ({
  CategoryRepository: class {},
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: {
    logSync: mocks.mockAuditLogSync,
    logAsync: vi.fn(),
  },
}));

describe('BridgeService balance audit', () => {
  let service: BridgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BridgeService();

    mocks.mockWorkspaceMemberFindMany.mockResolvedValue([
      {
        workspaceId: 1,
        role: 'OWNER',
        workspace: { id: 1, type: 'BUSINESS', closedUntil: null },
      },
      {
        workspaceId: 2,
        role: 'ACCOUNTANT',
        workspace: { id: 2, type: 'BUSINESS', closedUntil: null },
      },
    ]);

    mocks.mockCategoryFindFirst
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 22 });

    mocks.mockAccountFindByIdAndWorkspace
      .mockResolvedValueOnce({ id: 10, balance: new Decimal('1000.0000') })
      .mockResolvedValueOnce({ id: 20, balance: new Decimal('250.0000') });

    mocks.mockTxTransactionCreate
      .mockResolvedValueOnce({ id: 'bridge-debit-tx' })
      .mockResolvedValueOnce({ id: 'bridge-credit-tx' });

    mocks.mockTxAccountUpdate
      .mockResolvedValueOnce({ balance: new Decimal('700.0000') })
      .mockResolvedValueOnce({ balance: new Decimal('550.0000') });

    mocks.mockPrismaTransaction.mockImplementation(async (callback: any) => callback({
      transaction: { create: mocks.mockTxTransactionCreate },
      account: { update: mocks.mockTxAccountUpdate },
    }));
  });

  it('deve registrar duas linhas estruturadas de auditoria com deltas opostos para a ponte', async () => {
    await service.executeTransfer(99, {
      fromWorkspaceId: 1,
      toWorkspaceId: 2,
      fromAccountId: 10,
      toAccountId: 20,
      amount: 300,
      description: 'Bridge audit test',
      date: new Date('2026-03-20T12:00:00Z'),
    });

    expect(mocks.mockAuditLogSync).toHaveBeenCalledTimes(2);

    const [debitCall, creditCall] = mocks.mockAuditLogSync.mock.calls;
    const debitAudit = debitCall[0];
    const creditAudit = creditCall[0];

    expect(debitAudit.entityId).toBe(creditAudit.entityId);
    expect(debitAudit).toMatchObject({
      userId: 99,
      workspaceId: 1,
      action: 'BRIDGE_TRANSFER',
      fromAccount: 10,
      toAccount: 20,
    });
    expect(creditAudit).toMatchObject({
      userId: 99,
      workspaceId: 2,
      action: 'BRIDGE_TRANSFER',
      fromAccount: 10,
      toAccount: 20,
    });
    expect(debitAudit.delta.toString()).toBe('-300');
    expect(creditAudit.delta.toString()).toBe('300');
  });
});
