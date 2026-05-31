import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramLinkService } from '../../src/services/TelegramLinkService';
import { TelegramLinkTokenService } from '../../src/services/TelegramLinkTokenService';
import { prisma } from '../../src/lib/prisma';
import { AuditLogService } from '../../src/services/AuditLogService';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findUnique: vi.fn(), findFirst: vi.fn() },
    account: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    telegramUserLink: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    telegramDestination: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (cb) => {
      return cb(prisma);
    }),
  },
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: { logSync: vi.fn() },
}));

describe('TelegramLinkService', () => {
  let service: TelegramLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_IDENTIFIER_HASH_SECRET = 'hash-secret';
    process.env.TELEGRAM_BOT_USERNAME = 'WspTestBot';

    vi.spyOn(TelegramLinkTokenService.prototype, 'generateToken').mockResolvedValue({ token: 'signed_token', expiresAt: new Date() });
    vi.spyOn(TelegramLinkTokenService.prototype, 'verifyAndConsumeToken').mockResolvedValue({
      purpose: 'telegram_user_link',
      userId: 1,
      defaultWorkspaceId: 2,
      defaultAccountId: 3,
      defaultExpenseCategoryId: 4,
      jti: '123'
    } as any);

    vi.spyOn(TelegramLinkTokenService.prototype, 'generateToken').mockResolvedValue({ code: '123456', expiresAt: new Date() });

    service = new TelegramLinkService();
  });

  it('generateLink sucesso', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1 } as any);
    vi.mocked(prisma.account.findUnique).mockResolvedValue({ id: 3, workspaceId: 2 } as any);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 4, workspaceId: 2 } as any);

    const result = await service.generateLink({
      userId: 1,
      defaultWorkspaceId: 2,
      defaultAccountId: 3,
      defaultExpenseCategoryId: 4
    });

    expect(result.pairingCode).toBeDefined();
    expect(result.botUsername).toBe('WspTestBot');
    expect(result.expiresAt).toBeDefined();
  });

  it('generateLink sucesso sem destinos (user-first puro)', async () => {
    const result = await service.generateLink({ userId: 1 });

    expect(result.pairingCode).toBeDefined();
    expect(result.botUsername).toBe('WspTestBot');
    expect(result.expiresAt).toBeDefined();
  });

  it('generateLink falha se workspace não pertencer ao usuário', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

    await expect(service.generateLink({
      userId: 1,
      defaultWorkspaceId: 2
    })).rejects.toThrow('Usuário não é membro do workspace informado');
  });

  it('consumeCode cria novo link e rota', async () => {
    vi.mocked(prisma.telegramUserLink.findMany).mockResolvedValue([]);
    vi.mocked(prisma.telegramUserLink.create).mockResolvedValue({ id: 'link_id' } as any);
    vi.mocked(prisma.telegramDestination.create).mockResolvedValue({ id: 'dest_id' } as any);

    await service.consumeCode('signed_token', '123456');

    expect(prisma.telegramUserLink.create).toHaveBeenCalled();
    expect(prisma.telegramDestination.create).toHaveBeenCalled();
    expect(AuditLogService.logSync).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TELEGRAM_LINK_CREATED'
    }), expect.anything());
  });

  it('consumeCode revoga links anteriores', async () => {
    vi.mocked(prisma.telegramUserLink.findMany).mockResolvedValue([{ id: 'old_link', userId: 1 } as any]);
    vi.mocked(prisma.telegramUserLink.create).mockResolvedValue({ id: 'new_link' } as any);
    vi.mocked(prisma.telegramDestination.create).mockResolvedValue({ id: 'dest_id' } as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ workspaceId: 2 } as any);

    await service.consumeCode('signed_token', '123456');

    expect(prisma.telegramUserLink.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'old_link' },
      data: expect.objectContaining({ status: 'REVOKED' })
    }));
    expect(AuditLogService.logSync).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TELEGRAM_LINK_REVOKED', entityId: 'old_link'
    }), expect.anything());
  });

  it('revokeLink desativa vínculo e rota', async () => {
    vi.mocked(prisma.telegramUserLink.findUnique).mockResolvedValue({ id: 'link_1', userId: 1, status: 'ACTIVE' } as any);

    await service.revokeLink('link_1', 1);

    expect(prisma.telegramUserLink.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'link_1' },
      data: expect.objectContaining({ status: 'REVOKED' })
    }));
    expect(prisma.telegramDestination.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { telegramUserLinkId: 'link_1', status: 'ACTIVE' },
      data: expect.objectContaining({ status: 'REVOKED' })
    }));
  });

  it('getStatusForUser retorna activeLink e destinations', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_1', status: 'ACTIVE' } as any);
    vi.mocked(prisma.telegramDestination.findMany).mockResolvedValue([{ id: 'dest_1' } as any]);

    const result = await service.getStatusForUser(1);
    expect(result.link?.id).toBe('link_1');
    expect(result.destinations.length).toBe(1);
  });
});
