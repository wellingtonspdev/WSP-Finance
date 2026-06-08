import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionRepository } from '../../src/repositories/TransactionRepository';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: mocks.findMany,
    },
  },
}));

describe('TransactionRepository - ordenacao do extrato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it('usa data descendente por padrao com desempate estavel por id', async () => {
    const repository = new TransactionRepository();

    await repository.findManyByWorkspace(3, { limit: 20 });

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { workspaceId: 3 },
      take: 20,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    }));
  });

  it('aceita ordenar por data ascendente para carregar todo o extrato na ordem antiga-primeiro', async () => {
    const repository = new TransactionRepository();

    await repository.findManyByWorkspace(3, { limit: 20, sortDirection: 'asc' });

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { workspaceId: 3 },
      take: 20,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    }));
  });
});
