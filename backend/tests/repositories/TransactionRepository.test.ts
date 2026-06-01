import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionRepository } from '../../src/repositories/TransactionRepository';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

describe('TransactionRepository.findManyByUserId', () => {
  const repository = new TransactionRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exclui workspace PERSONAL quando membership do usuario e ACCOUNTANT', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
      {
        role: 'ACCOUNTANT',
        workspaceId: 1,
        workspace: { type: 'BUSINESS' },
      },
      {
        role: 'ACCOUNTANT',
        workspaceId: 2,
        workspace: { type: 'PERSONAL' },
      },
    ] as any);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([] as any);

    await repository.findManyByUserId(100);

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        workspaceId: { in: [1] },
      },
    }));
  });

  it('preserva workspace PERSONAL para OWNER', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
      {
        role: 'OWNER',
        workspaceId: 2,
        workspace: { type: 'PERSONAL' },
      },
    ] as any);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([] as any);

    await repository.findManyByUserId(100);

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        workspaceId: { in: [2] },
      },
    }));
  });
});
