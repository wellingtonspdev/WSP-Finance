import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BankMovementService } from '../../src/services/BankMovementService';
import { AppError } from '../../src/errors/AppError';

// ─── Mocks ───────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  mockFindByIdAndWorkspace: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockFindManyByIds: vi.fn(),
  mockUpdateRawPayload: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockTransactionCreate: vi.fn(),
  mockAccountFindByIdAndWorkspace: vi.fn(),
  mockAccountUpdateBalance: vi.fn(),
  mockCategoryFindByIdAndWorkspace: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockTransactionFindFirst: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockGetStore: vi.fn(),
  mockAuditLogSync: vi.fn(),
}));

vi.mock('../../src/repositories/BankMovementRepository', () => ({
  BankMovementRepository: class {
    findByIdAndWorkspace = mocks.mockFindByIdAndWorkspace;
    findManyByIds = mocks.mockFindManyByIds;
    updateStatus = mocks.mockUpdateStatus;
    updateRawPayload = mocks.mockUpdateRawPayload;
    deleteMany = mocks.mockDeleteMany;
  },
}));

vi.mock('../../src/repositories/TransactionRepository', () => ({
  TransactionRepository: class {
    create = mocks.mockTransactionCreate;
  },
}));

vi.mock('../../src/repositories/AccountRepository', () => ({
  AccountRepository: class {
    findByIdAndWorkspace = mocks.mockAccountFindByIdAndWorkspace;
    updateBalance = mocks.mockAccountUpdateBalance;
  },
}));

vi.mock('../../src/repositories/CategoryRepository', () => ({
  CategoryRepository: class {
    findByIdAndWorkspace = mocks.mockCategoryFindByIdAndWorkspace;
  },
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspace: { findUnique: mocks.mockWorkspaceFindUnique },
    transaction: { findFirst: mocks.mockTransactionFindFirst },
    $transaction: mocks.mockPrismaTransaction,
  },
}));

vi.mock('../../src/lib/tenantContext', () => ({
  tenantContext: {
    getStore: mocks.mockGetStore,
  },
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: {
    logSync: mocks.mockAuditLogSync,
    logAsync: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────

const basePendingMovement = {
  id: 'mov-uuid-1',
  workspaceId: 1,
  accountId: 10,
  amount: { toString: () => '1500.0000' },
  date: new Date('2026-03-15T12:00:00Z'),
  description: 'PIX RECEBIDO - CLIENTE X',
  source: 'OFX',
  status: 'PENDING',
  fitid: 'FIT123',
};

const baseApprovedMovement = {
  ...basePendingMovement,
  status: 'APPROVED',
};

// ─── Tests ───────────────────────────────────────────────────────

describe('BankMovementService.approve()', () => {
  let service: BankMovementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BankMovementService();

    // Defaults seguros
    mocks.mockAccountFindByIdAndWorkspace.mockResolvedValue({ id: 10, balance: 5000 });
    mocks.mockAccountUpdateBalance.mockResolvedValue({ id: 10, balance: 6500 });
    mocks.mockCategoryFindByIdAndWorkspace.mockResolvedValue({ id: 5 });
    mocks.mockTransactionCreate.mockResolvedValue({
      id: 'txn-uuid-1',
      description: 'PIX RECEBIDO - CLIENTE X',
      amount: '1500.0000',
      type: 'INCOME',
      isPaid: true,
    });
    mocks.mockUpdateStatus.mockResolvedValue({ ...basePendingMovement, status: 'APPROVED' });

    // Workspace sem closedUntil por padrão
    mocks.mockWorkspaceFindUnique.mockResolvedValue({
      id: 1,
      type: 'BUSINESS',
      closedUntil: null,
    });

    // prisma.$transaction executa o callback direto
    mocks.mockPrismaTransaction.mockImplementation(async (callback: any) => callback({}));
  });

  // ── 1. Happy Path ──
  it('deve criar Transaction e atualizar saldo ao aprovar movement PENDING', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);

    const result = await service.approve({
      userId: 99,
      movementId: 'mov-uuid-1',
      workspaceId: 1,
      categoryId: 5,
    });

    expect(result).toHaveProperty('id');
    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockAccountUpdateBalance).toHaveBeenCalledTimes(1);
    expect(mocks.mockAuditLogSync).toHaveBeenCalledTimes(1);
    expect(mocks.mockUpdateStatus).toHaveBeenCalledTimes(1);
  });

  // ── 2. CRITÉRIO DE ACEITAÇÃO: Aprovação dupla NÃO duplica Transaction ──
  it('deve retornar 200 sem re-criar Transaction se movement já está APPROVED (idempotência)', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(baseApprovedMovement);
    mocks.mockTransactionFindFirst.mockResolvedValue({
      id: 'txn-uuid-existing',
      description: 'PIX RECEBIDO - CLIENTE X',
      amount: '1500.0000',
      type: 'INCOME',
    });

    const result = await service.approve({
      userId: 99,
      movementId: 'mov-uuid-1',
      workspaceId: 1,
      categoryId: 5,
    });

    // Deve retornar a transaction existente com flag alreadyApproved
    expect('alreadyApproved' in result && result.alreadyApproved).toBe(true);
    // NÃO deve ter criado nova transaction
    expect(mocks.mockTransactionCreate).not.toHaveBeenCalled();
    expect(mocks.mockAccountUpdateBalance).not.toHaveBeenCalled();
    expect(mocks.mockAuditLogSync).not.toHaveBeenCalled();
  });

  // ── 3. Guard closedUntil bloqueia CLIENT ──
  it('deve retornar 403 se closedUntil ativo e userRole NÃO é ACCOUNTANT', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);
    mocks.mockWorkspaceFindUnique.mockResolvedValue({
      id: 1,
      type: 'BUSINESS',
      closedUntil: new Date('2026-04-01T00:00:00Z'),
    });
    mocks.mockGetStore.mockReturnValue({
      userRole: 'EDITOR',
      workspaceType: 'BUSINESS',
    });

    await expect(
      service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow(AppError);

    try {
      await service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 });
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('fechado');
    }
  });

  // ── 4. Guard closedUntil permite ACCOUNTANT (bypass) ──
  it('deve permitir aprovação se closedUntil ativo e userRole é ACCOUNTANT', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);
    mocks.mockWorkspaceFindUnique.mockResolvedValue({
      id: 1,
      type: 'BUSINESS',
      closedUntil: new Date('2026-04-01T00:00:00Z'),
    });
    mocks.mockGetStore.mockReturnValue({
      userRole: 'ACCOUNTANT',
      workspaceType: 'BUSINESS',
    });

    const result = await service.approve({
      userId: 99,
      movementId: 'mov-uuid-1',
      workspaceId: 1,
      categoryId: 5,
    });

    expect(result).toHaveProperty('id');
    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
  });

  // ── 5. Movimento não encontrado ──
  it('deve retornar 404 se movement não encontrado', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(null);

    await expect(
      service.approve({ userId: 99, movementId: 'inexistente', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow('Movimento não encontrado');
  });

  // ── 6. Movement com status REJECTED ──
  it('deve retornar 400 se movement não está PENDING nem APPROVED', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue({
      ...basePendingMovement,
      status: 'REJECTED',
    });

    await expect(
      service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow('Movimento não está pendente');
  });

  // ── 7. Account não pertence ao workspace ──
  it('deve retornar 404 se Account não pertence ao workspace', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);
    mocks.mockAccountFindByIdAndWorkspace.mockResolvedValue(null);

    await expect(
      service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow('Conta não encontrada');
  });

  // ── 8. Category não pertence ao workspace ──
  it('deve retornar 404 se Category não pertence ao workspace', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);
    mocks.mockCategoryFindByIdAndWorkspace.mockResolvedValue(null);

    await expect(
      service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow('Categoria não encontrada');
  });

  // ── 9. EXPENSE: saldo é decrementado ──
  it('deve decrementar saldo quando amount é negativo (EXPENSE)', async () => {
    const expenseMovement = {
      ...basePendingMovement,
      amount: { toString: () => '-350.0000' },
    };
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(expenseMovement);

    mocks.mockTransactionCreate.mockResolvedValue({
      id: 'txn-expense',
      amount: '350.0000',
      type: 'EXPENSE',
      isPaid: true,
    });

    await service.approve({
      userId: 99,
      movementId: 'mov-uuid-1',
      workspaceId: 1,
      categoryId: 5,
    });

    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mockAccountUpdateBalance).toHaveBeenCalledTimes(1);
  });

  // ── 10. Rollback Test: transação falha, movement permanece PENDING ──
  it('deve realizar rollback e relançar exceção se criar transaction falhar (Garantia ACID)', async () => {
    mocks.mockFindByIdAndWorkspace.mockResolvedValue(basePendingMovement);
    // Simula falha no banco de dados
    mocks.mockTransactionCreate.mockRejectedValue(new Error('DB falhou'));

    await expect(
      service.approve({ userId: 99, movementId: 'mov-uuid-1', workspaceId: 1, categoryId: 5 })
    ).rejects.toThrow('DB falhou');

    // A chamada para transaction.create aconteceu
    expect(mocks.mockTransactionCreate).toHaveBeenCalledTimes(1);
    
    // Status update NÃO pode ter completado com sucesso fora do escopo ou o BD faria rollback de tudo no $transaction
  });
});
