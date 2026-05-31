import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramContextResolver, isDestinationChoice } from '../../src/services/TelegramContextResolver';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    telegramUserLink: { findFirst: vi.fn() },
    telegramDestination: { findMany: vi.fn(), findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
  },
}));

describe('TelegramContextResolver', () => {
  let resolver: TelegramContextResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_IDENTIFIER_HASH_SECRET = 'test-secret';
    resolver = new TelegramContextResolver();
  });

  it('resolves active link from database and returns single destination context', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_1', userId: 3 } as any);
    vi.mocked(prisma.telegramDestination.findMany).mockResolvedValue([{
      id: 'dest_1', workspaceId: 1, accountId: 2, defaultExpenseCategoryId: 4, defaultIncomeCategoryId: null
    }] as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 99 } as any);

    const context = await resolver.resolve('12345');

    expect(isDestinationChoice(context)).toBe(false);
    expect(context).toEqual({
      workspaceId: 1,
      accountId: 2,
      userId: 3,
      defaultExpenseCategoryId: 4,
      defaultIncomeCategoryId: null,
      telegramUserLinkId: 'link_1'
    });
  });

  it('returns default destination when multiple exist', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_1', userId: 3, activeDestinationId: 'dest_2' } as any);
    vi.mocked(prisma.telegramDestination.findMany).mockResolvedValue([
      { id: 'dest_1', workspaceId: 1, accountId: 2 },
      { id: 'dest_2', workspaceId: 5, accountId: 6, defaultExpenseCategoryId: 10 }
    ] as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 99 } as any);

    const context = await resolver.resolve('12345');

    expect(isDestinationChoice(context)).toBe(false);
    expect(context).toEqual(expect.objectContaining({ workspaceId: 5, accountId: 6, defaultExpenseCategoryId: 10, telegramUserLinkId: 'link_1' }));
  });

  it('returns destination choice when multiple exist and no default', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_1', userId: 3 } as any);
    vi.mocked(prisma.telegramDestination.findMany).mockResolvedValue([
      { id: 'dest_1', workspaceId: 1, accountId: 2, label: 'Work' },
      { id: 'dest_2', workspaceId: 5, accountId: 6, label: 'Personal' }
    ] as any);

    const result = await resolver.resolve('12345');

    expect(isDestinationChoice(result)).toBe(true);
    if (isDestinationChoice(result)) {
      expect(result.destinations).toHaveLength(2);
      expect(result.userId).toBe(3);
    }
  });

  it('fails if no link is found', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue(null);
    await expect(resolver.resolve('123')).rejects.toThrow('Chat não autorizado');
  });

  it('fails if no destinations found', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_1', userId: 3 } as any);
    vi.mocked(prisma.telegramDestination.findMany).mockResolvedValue([]);
    await expect(resolver.resolve('123')).rejects.toThrow('Nenhum destino configurado');
  });

  it('resolves by destination id', async () => {
    vi.mocked(prisma.telegramDestination.findUnique).mockResolvedValue({
      id: 'dest_1', workspaceId: 1, accountId: 2, status: 'ACTIVE', userId: 3
    } as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 99 } as any);

    const context = await resolver.resolveByDestinationId('dest_1', 3);
    expect(context).toEqual(expect.objectContaining({ workspaceId: 1, accountId: 2, userId: 3 }));
  });

  it('fails to resolve by destination id if not active or wrong user', async () => {
    vi.mocked(prisma.telegramDestination.findUnique).mockResolvedValue({
      id: 'dest_1', workspaceId: 1, accountId: 2, status: 'REVOKED', userId: 3
    } as any);
    await expect(resolver.resolveByDestinationId('dest_1', 3)).rejects.toThrow('Destino não encontrado');
  });
});
