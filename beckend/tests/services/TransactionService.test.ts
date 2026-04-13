import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../../src/services/TransactionService';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppError } from '../../src/errors/AppError';

dayjs.extend(isSameOrBefore);

const mocks = vi.hoisted(() => ({
  mockAuditLogSync: vi.fn(),
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
      findByIdAndWorkspace = vi.fn().mockResolvedValue({ id: 1, balance: 1000 });
      updateBalance = vi.fn().mockResolvedValue({ id: 1, balance: 1100 });
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
      create = vi.fn().mockResolvedValue({ id: 'fake-transaction', amount: 100 });
      findByIdAndWorkspace = vi.fn().mockResolvedValue({ id: 'fake-transaction', amount: 100, isPaid: true, type: 'EXPENSE', accountId: 1, date: new Date('2026-01-15T12:00:00Z') });
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

describe('TransactionService - Guardião de Período Fiscal (closedUntil)', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
