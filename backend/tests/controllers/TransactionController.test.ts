import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { TransactionController } from '../../src/controllers/TransactionController';

const mocks = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('../../src/services/TransactionService', () => ({
  TransactionService: class {
    create = mocks.mockCreate;
  }
}));

describe('TransactionController - Phase 2 create contract', () => {
  let controller: TransactionController;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TransactionController();
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
    res = { status } as Partial<Response>;
    mocks.mockCreate.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      accountId: 10,
      workspaceId: 1,
    });
  });

  it('aceita payload de criacao manual sem accountId', async () => {
    const req = {
      body: {
        description: 'Receita sem conta',
        amount: 100,
        date: '2026-02-01T10:00:00Z',
        type: 'INCOME',
        categoryId: 1,
        isPaid: true,
      },
      workspaceId: 1,
      user: { id: 99 },
    } as unknown as Request;

    await controller.create(req, res as Response);

    expect(mocks.mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: 99,
      workspaceId: 1,
      categoryId: 1,
    }));
    expect(mocks.mockCreate.mock.calls[0][0]).not.toHaveProperty('accountId');
    expect(status).toHaveBeenCalledWith(201);
  });

  it('continua aceitando payload com accountId explicito', async () => {
    const req = {
      body: {
        description: 'Receita com conta',
        amount: 100,
        date: '2026-02-01T10:00:00Z',
        type: 'INCOME',
        accountId: 7,
        categoryId: 1,
        isPaid: true,
      },
      workspaceId: 1,
      user: { id: 99 },
    } as unknown as Request;

    await controller.create(req, res as Response);

    expect(mocks.mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 7,
      workspaceId: 1,
    }));
    expect(status).toHaveBeenCalledWith(201);
  });
});
