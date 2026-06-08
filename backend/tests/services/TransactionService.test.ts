import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../../src/services/TransactionService';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppError } from '../../src/errors/AppError';

dayjs.extend(isSameOrBefore);

const mocks = vi.hoisted(() => ({
  mockAuditLogSync: vi.fn(),
  mockEnqueueInTransaction: vi.fn(),
  mockFindAccountByIdAndWorkspace: vi.fn(),
  mockFindDefaultAccountByWorkspace: vi.fn(),
  mockUpdateBalance: vi.fn(),
  mockCreateTransaction: vi.fn(),
}));

// Mocks
vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      workspace: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => callback({
        // mock tx
      }))
    }
  };
});

vi.mock('../../src/repositories/AccountRepository', () => {
  return {
    AccountRepository: class {
      findByIdAndWorkspace = mocks.mockFindAccountByIdAndWorkspace;
      findDefaultByWorkspace = mocks.mockFindDefaultAccountByWorkspace;
      updateBalance = mocks.mockUpdateBalance;
    }
  };
});

vi.mock('../../src/repositories/CategoryRepository', () => {
  return {
    CategoryRepository: class {
      findByIdAndWorkspace = vi.fn().mockResolvedValue({ id: 1 });
    }
  };
});

vi.mock('../../src/repositories/TransactionRepository', () => {
  return {
    TransactionRepository: class {
      create = mocks.mockCreateTransaction;
      findByIdAndWorkspace = vi.fn().mockResolvedValue({ id: 'fake-transaction', amount: 100, isPaid: true, type: 'EXPENSE', accountId: 1, date: new Date('2026-01-15T12:00:00Z') });
      findDetailByIdAndWorkspace = vi.fn().mockResolvedValue({ id: 'fake-transaction', amount: 100, isPaid: true, type: 'EXPENSE', accountId: 1, date: new Date('2026-01-15T12:00:00Z'), category: {} });
      delete = vi.fn().mockResolvedValue(true);
    }
  };
});

vi.mock('../../src/lib/tenantContext', () => {
  return {
    tenantContext: {
      getStore: vi.fn()
    }
  };
});

vi.mock('../../src/services/AuditLogService', () => {
  return {
    AuditLogService: {
      logSync: mocks.mockAuditLogSync,
      logAsync: vi.fn(),
    }
  };
});

vi.mock('../../src/services/OutboxService', () => {
  return {
    OutboxService: class {
      enqueueInTransaction = mocks.mockEnqueueInTransaction;
    }
  };
});

describe('TransactionService - Guardião de Período Fiscal (closedUntil)', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockEnqueueInTransaction.mockResolvedValue({
      id: 'outbox-event',
      eventType: 'TRANSACTION_EXPENSE_CREATED',
      payload: { transactionId: 'fake-transaction' },
    });
    mocks.mockFindAccountByIdAndWorkspace.mockResolvedValue({ id: 1, balance: 1000 });
    mocks.mockFindDefaultAccountByWorkspace.mockResolvedValue({ id: 10, balance: 500, name: 'Conta PF Principal' });
    mocks.mockUpdateBalance.mockResolvedValue({ id: 10, balance: 600 });
    mocks.mockCreateTransaction.mockResolvedValue({ id: 'fake-transaction', amount: 100 });
    transactionService = new TransactionService();
  });

  describe('Cenários de Bloqueio e Bypass', () => {
    it('deve retornar AppError 403 se a data for < closedUntil para CLIENTE (Fuso Horário)', async () => {
      const { prisma } = await import('../../src/lib/prisma');
      const { tenantContext } = await import('../../src/lib/tenantContext');

      // Mock Workspace com closedUntil = 31 de janeiro de 2026 UTC
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.0) },
        closedUntil: new Date('2026-01-31T23:59:59Z')
      });

      // Mock Contexto Cliente Simples
      (tenantContext.getStore as any).mockReturnValue({
        userRole: 'CLIENT',
        workspaceType: 'BUSINESS'
      });

      // Data de 31 de Janeiro UTC
      const transactionDate = new Date('2026-01-31T10:00:00Z');

      await expect(
        transactionService.create({
          description: 'Teste de Limite Temporal',
          userId: 99,
          amount: 50,
          date: transactionDate,
          type: 'EXPENSE',
          accountId: 1,
          categoryId: 1,
          isPaid: false,
          workspaceId: 1
        })
      ).rejects.toThrow(AppError);

      try {
        await transactionService.create({
          description: 'Teste', userId: 99, amount: 50, date: transactionDate, type: 'EXPENSE', accountId: 1, categoryId: 1, isPaid: false, workspaceId: 1
        });
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('fechado');
      }
    });

    it('deve permitir (bypass) se a data for < closedUntil e usuário for ACCOUNTANT em BUSINESS', async () => {
      const { prisma } = await import('../../src/lib/prisma');
      const { tenantContext } = await import('../../src/lib/tenantContext');

      // Mock Workspace fechado temporariamente
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.0) },
        closedUntil: new Date('2026-01-31T00:00:00Z')
      });

      (tenantContext.getStore as any).mockReturnValue({
        userRole: 'ACCOUNTANT',
        workspaceType: 'BUSINESS'
      });

      const transactionDate = new Date('2026-01-10T10:00:00Z'); // No passado profundo

      const result = await transactionService.create({
        description: 'Ajuste Contábil Retroativo',
        userId: 99,
        amount: 250,
        date: transactionDate,
        type: 'EXPENSE',
        accountId: 1,
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

      expect(result).toHaveProperty('id', 'fake-transaction');
    });

    it('deve aplicar guard no delete se a transação estiver no passado fechado', async () => {
      const { prisma } = await import('../../src/lib/prisma');
      const { tenantContext } = await import('../../src/lib/tenantContext');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        closedUntil: new Date('2026-01-31T00:00:00Z')
      });

      (tenantContext.getStore as any).mockReturnValue({
        userRole: 'VIEWER'
      });

      await expect(
        transactionService.delete('fake-transaction', 1, 99)
      ).rejects.toThrow(AppError);
    });

    it('não deve bloquear se closedUntil for NULL', async () => {
      const { prisma } = await import('../../src/lib/prisma');
      
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.0) },
        closedUntil: null
      });

      const transactionDate = new Date('2020-01-01T00:00:00Z'); // Muito antigo

      const result = await transactionService.create({
        description: 'Livre',
        userId: 99,
        amount: 10,
        date: transactionDate,
        type: 'INCOME',
        accountId: 1,
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

      expect(result.id).toBe('fake-transaction');
    });
    it('deve registrar auditoria de saldo quando cria transaÃ§Ã£o paga', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.0) },
        closedUntil: null
      });

      const result = await transactionService.create({
        userId: 99,
        description: 'Recebimento auditado',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        accountId: 1,
        categoryId: 1,
        isPaid: true,
        workspaceId: 1
      });

      expect(result).toHaveProperty('id', 'fake-transaction');
      expect(mocks.mockAuditLogSync).toHaveBeenCalledTimes(1);
    });

    it('T11 - enfileira Outbox TRANSACTION_EXPENSE_CREATED somente para EXPENSE com payload minimo', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.0) },
        closedUntil: null
      });

      await transactionService.create({
        userId: 99,
        description: 'Despesa Netflix com CPF 123.456.789-09',
        amount: 39.9,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'EXPENSE',
        accountId: 1,
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

      expect(mocks.mockEnqueueInTransaction).toHaveBeenCalledTimes(1);
      expect(mocks.mockEnqueueInTransaction).toHaveBeenCalledWith(expect.anything(), {
        workspaceId: 1,
        eventType: 'TRANSACTION_EXPENSE_CREATED',
        payload: { transactionId: 'fake-transaction' },
      });

      const payload = mocks.mockEnqueueInTransaction.mock.calls[0][1].payload;
      expect(payload).not.toHaveProperty('description');
      expect(payload).not.toHaveProperty('document');
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('name');
      expect(payload).not.toHaveProperty('rawText');
      expect(payload).not.toHaveProperty('prompt');
      expect(payload).not.toHaveProperty('fullTransaction');

      mocks.mockEnqueueInTransaction.mockClear();

      await transactionService.create({
        userId: 99,
        description: 'Receita de servico',
        amount: 150,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        accountId: 1,
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

    });
  });

  describe('Phase 2 - transacoes manuais sem accountId e impostos off', () => {
    it('cria transacao sem accountId em workspace pessoal usando Conta PF Principal', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindDefaultAccountByWorkspace.mockResolvedValueOnce({ id: 10, balance: 500, name: 'Conta PF Principal' });

      await transactionService.create({
        userId: 99,
        description: 'Receita sem conta',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

      expect(mocks.mockFindDefaultAccountByWorkspace).toHaveBeenCalledWith(1, 'PERSONAL');
      expect(mocks.mockFindAccountByIdAndWorkspace).not.toHaveBeenCalled();
      expect(mocks.mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          account: { connect: { id: 10 } },
          taxAmount: null,
          netValue: null,
        }),
        expect.anything()
      );
    });

    it('cria transacao sem accountId em workspace empresa usando Conta PJ Principal', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 2,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindDefaultAccountByWorkspace.mockResolvedValueOnce({ id: 20, balance: 800, name: 'Conta PJ Principal' });

      await transactionService.create({
        userId: 99,
        description: 'Receita empresa sem conta',
        amount: 200,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: false,
        workspaceId: 2
      });

      expect(mocks.mockFindDefaultAccountByWorkspace).toHaveBeenCalledWith(2, 'BUSINESS');
      expect(mocks.mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          account: { connect: { id: 20 } },
          taxAmount: null,
          netValue: null,
        }),
        expect.anything()
      );
    });

    it('mantem accountId explicito bloqueado quando nao pertence ao workspace', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindAccountByIdAndWorkspace.mockResolvedValueOnce(null);

      await expect(transactionService.create({
        userId: 99,
        description: 'Conta invalida',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        accountId: 999,
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      })).rejects.toThrow('Account not found or access denied');

      expect(mocks.mockFindAccountByIdAndWorkspace).toHaveBeenCalledWith(999, 1);
      expect(mocks.mockFindDefaultAccountByWorkspace).not.toHaveBeenCalled();
    });

    it('falha claramente quando workspace nao tem conta padrao nem fallback', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindDefaultAccountByWorkspace.mockResolvedValueOnce(null);

      await expect(transactionService.create({
        userId: 99,
        description: 'Sem conta',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      })).rejects.toThrow('Account not found or access denied');
    });

    it('transacao paga sem accountId atualiza saldo e auditoria com conta resolvida', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindDefaultAccountByWorkspace.mockResolvedValueOnce({ id: 10, balance: 500, name: 'Conta PF Principal' });
      mocks.mockUpdateBalance.mockResolvedValueOnce({ id: 10, balance: 600 });

      await transactionService.create({
        userId: 99,
        description: 'Receita paga sem conta',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: true,
        workspaceId: 1
      });

      expect(mocks.mockUpdateBalance).toHaveBeenCalledWith(10, expect.anything(), expect.anything());
      expect(mocks.mockAuditLogSync).toHaveBeenCalledWith(
        expect.objectContaining({
          newState: expect.objectContaining({ accountId: 10 }),
          fromAccount: 10,
        }),
        expect.anything()
      );
    });

    it('nao calcula taxAmount nem netValue com taxRate positivo e preserva marketplace', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'BUSINESS',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockFindDefaultAccountByWorkspace.mockResolvedValueOnce({ id: 20, balance: 800, name: 'Conta PJ Principal' });

      await transactionService.create({
        userId: 99,
        description: 'Venda marketplace',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: false,
        workspaceId: 1,
        grossAmount: 1000,
        marketplaceFee: 80,
        shippingCost: 20,
        productCost: 300,
      });

      expect(mocks.mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.objectContaining({ toString: expect.any(Function) }),
          grossAmount: expect.objectContaining({ toString: expect.any(Function) }),
          marketplaceFee: expect.objectContaining({ toString: expect.any(Function) }),
          shippingCost: expect.objectContaining({ toString: expect.any(Function) }),
          productCost: expect.objectContaining({ toString: expect.any(Function) }),
          taxAmount: null,
          netValue: null,
        }),
        expect.anything()
      );
      const createData = mocks.mockCreateTransaction.mock.calls.at(-1)?.[0];
      expect(createData.amount.toString()).toBe('900');
      expect(createData.grossAmount.toString()).toBe('1000');
      expect(createData.marketplaceFee.toString()).toBe('80');
      expect(createData.shippingCost.toString()).toBe('20');
      expect(createData.productCost.toString()).toBe('300');
    });

    it('mantem Transaction.id como string e Account/Workspace ids numericos no contrato testado', async () => {
      const { prisma } = await import('../../src/lib/prisma');

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: 1,
        type: 'PERSONAL',
        taxRate: { dividedBy: vi.fn().mockReturnValue(0.06) },
        closedUntil: null
      });
      mocks.mockCreateTransaction.mockResolvedValueOnce({
        id: '00000000-0000-4000-8000-000000000001',
        accountId: 10,
        workspaceId: 1,
      });

      const result = await transactionService.create({
        userId: 99,
        description: 'Contrato de IDs',
        amount: 100,
        date: new Date('2026-02-01T10:00:00Z'),
        type: 'INCOME',
        categoryId: 1,
        isPaid: false,
        workspaceId: 1
      });

      expect(typeof result.id).toBe('string');
      expect(typeof result.accountId).toBe('number');
      expect(typeof result.workspaceId).toBe('number');
    });
  });

  describe('getById', () => {
    it('deve retornar a transação com detalhes quando ela existir', async () => {
      const result = await transactionService.getById('fake-transaction', 99);
      expect(result).toHaveProperty('id', 'fake-transaction');
    });

    it('deve lançar AppError 404 quando a transação não existir', async () => {
      const repo = (transactionService as any).transactionRepository;
      repo.findDetailByIdAndWorkspace.mockResolvedValueOnce(null);
      await expect(transactionService.getById('not-found', 99)).rejects.toThrow('Transaction not found or access denied');
    });
  });
});
