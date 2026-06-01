import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { BridgeService } from '../../src/services/BridgeService';

const mocks = vi.hoisted(() => ({
  mockWorkspaceMemberFindMany: vi.fn(),
  mockCategoryFindFirst: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockFindDefaultByWorkspace: vi.fn(),
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
    findDefaultByWorkspace = mocks.mockFindDefaultByWorkspace;
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

const baseDto = {
  fromWorkspaceId: 1,
  toWorkspaceId: 2,
  amount: 300,
  description: 'Bridge audit test',
  date: new Date('2026-03-20T12:00:00Z'),
};

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
        role: 'OWNER',
        workspace: { id: 2, type: 'PERSONAL', closedUntil: null },
      },
    ]);

    mocks.mockCategoryFindFirst
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 22 });

    mocks.mockFindDefaultByWorkspace
      .mockResolvedValueOnce({ id: 10, name: 'Conta Empresa', balance: new Decimal('1000.0000') })
      .mockResolvedValueOnce({ id: 20, name: 'Conta Pessoal', balance: new Decimal('250.0000') });

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

  it('resolve contas padrao e registra auditoria com IDs resolvidos', async () => {
    await service.executeTransfer(99, baseDto);

    expect(mocks.mockFindDefaultByWorkspace).toHaveBeenNthCalledWith(1, 1, 'BUSINESS');
    expect(mocks.mockFindDefaultByWorkspace).toHaveBeenNthCalledWith(2, 2, 'PERSONAL');

    expect(mocks.mockTxTransactionCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        workspaceId: 1,
        accountId: 10,
        categoryId: 11,
        type: 'EXPENSE',
      }),
    });
    expect(mocks.mockTxTransactionCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        workspaceId: 2,
        accountId: 20,
        categoryId: 22,
        type: 'INCOME',
      }),
    });

    expect(mocks.mockTxAccountUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 10 },
      data: { balance: { decrement: expect.any(Decimal) } },
    });
    expect(mocks.mockTxAccountUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 20 },
      data: { balance: { increment: expect.any(Decimal) } },
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
      oldState: { accountId: 10, balance: '1000' },
    });
    expect(creditAudit).toMatchObject({
      userId: 99,
      workspaceId: 2,
      action: 'BRIDGE_TRANSFER',
      fromAccount: 10,
      toAccount: 20,
      oldState: { accountId: 20, balance: '250' },
    });
    expect(debitAudit.delta.toString()).toBe('-300');
    expect(creditAudit.delta.toString()).toBe('300');
  });

  it('bloqueia saldo insuficiente antes de criar transacoes', async () => {
    mocks.mockFindDefaultByWorkspace
      .mockReset()
      .mockResolvedValueOnce({ id: 10, name: 'Conta Empresa', balance: new Decimal('100.0000') })
      .mockResolvedValueOnce({ id: 20, name: 'Conta Pessoal', balance: new Decimal('250.0000') });

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 400, message: 'Saldo insuficiente na conta de origem.' });

    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mocks.mockTxTransactionCreate).not.toHaveBeenCalled();
    expect(mocks.mockAuditLogSync).not.toHaveBeenCalled();
  });

  it('bloqueia usuario sem permissao em um dos workspaces antes de resolver contas', async () => {
    mocks.mockWorkspaceMemberFindMany.mockResolvedValueOnce([
      {
        workspaceId: 1,
        role: 'OWNER',
        workspace: { id: 1, type: 'BUSINESS', closedUntil: null },
      },
    ]);

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(mocks.mockFindDefaultByWorkspace).not.toHaveBeenCalled();
    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it('bloqueia ACCOUNTANT antes de resolver contas e nao altera saldo', async () => {
    mocks.mockWorkspaceMemberFindMany.mockResolvedValueOnce([]);

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(mocks.mockFindDefaultByWorkspace).not.toHaveBeenCalled();
    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mocks.mockTxTransactionCreate).not.toHaveBeenCalled();
    expect(mocks.mockTxAccountUpdate).not.toHaveBeenCalled();
  });

  it('bloqueia periodo fechado antes de resolver contas', async () => {
    mocks.mockWorkspaceMemberFindMany.mockResolvedValueOnce([
      {
        workspaceId: 1,
        role: 'OWNER',
        workspace: { id: 1, type: 'BUSINESS', closedUntil: new Date('2026-03-31T00:00:00Z') },
      },
      {
        workspaceId: 2,
        role: 'OWNER',
        workspace: { id: 2, type: 'PERSONAL', closedUntil: null },
      },
    ]);

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(mocks.mockFindDefaultByWorkspace).not.toHaveBeenCalled();
    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it('bloqueia quando conta padrao de origem nao existe', async () => {
    mocks.mockFindDefaultByWorkspace
      .mockReset()
      .mockResolvedValueOnce(null);

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it('bloqueia quando conta padrao de destino nao existe', async () => {
    mocks.mockFindDefaultByWorkspace
      .mockReset()
      .mockResolvedValueOnce({ id: 10, name: 'Conta Empresa', balance: new Decimal('1000.0000') })
      .mockResolvedValueOnce(null);

    await expect(service.executeTransfer(99, baseDto))
      .rejects.toMatchObject({ statusCode: 404 });

    expect(mocks.mockPrismaTransaction).not.toHaveBeenCalled();
  });
});
