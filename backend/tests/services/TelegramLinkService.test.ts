import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramLinkService } from '../../src/services/TelegramLinkService';
import { TelegramLinkTokenService } from '../../src/services/TelegramLinkTokenService';
import { prisma } from '../../src/lib/prisma';
import { AuditLogService } from '../../src/services/AuditLogService';

const findDefaultByWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findUnique: vi.fn(), findFirst: vi.fn() },
    category: { findUnique: vi.fn() },
    telegramUserLink: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    telegramDestination: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock('../../src/repositories/AccountRepository', () => ({
  AccountRepository: class {
    findDefaultByWorkspace = findDefaultByWorkspaceMock;
  },
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: { logSync: vi.fn() },
}));

describe('TelegramLinkService', () => {
  let service: TelegramLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    findDefaultByWorkspaceMock.mockReset();
    process.env.TELEGRAM_IDENTIFIER_HASH_SECRET = 'hash-secret';
    process.env.TELEGRAM_BOT_USERNAME = 'WspTestBot';

    vi.spyOn(TelegramLinkTokenService.prototype, 'verifyAndConsumeToken').mockResolvedValue({
      userId: 1,
      defaultWorkspaceId: 2,
      defaultExpenseCategoryId: 4,
    });

    vi.spyOn(TelegramLinkTokenService.prototype, 'generateToken').mockResolvedValue({
      code: '123456',
      expiresAt: new Date(),
    });

    service = new TelegramLinkService();
  });

  it('generateLink sucesso resolve conta padrao pessoal', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1, workspace: { type: 'PERSONAL' } } as any);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 4, workspaceId: 2 } as any);
    findDefaultByWorkspaceMock.mockResolvedValue({ id: 10, workspaceId: 2 });

    const result = await service.generateLink({
      userId: 1,
      defaultWorkspaceId: 2,
      defaultExpenseCategoryId: 4,
    });

    expect(findDefaultByWorkspaceMock).toHaveBeenCalledWith(2, 'PERSONAL');
    expect(TelegramLinkTokenService.prototype.generateToken).toHaveBeenCalledWith({
      userId: 1,
      defaultWorkspaceId: 2,
      defaultExpenseCategoryId: 4,
    });
    expect(result.pairingCode).toBe('123456');
    expect(result.botUsername).toBe('WspTestBot');
  });

  it('createDestination com workspace empresa salva destino com conta padrao empresa', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_id', activeDestinationId: null } as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1, workspace: { type: 'BUSINESS' } } as any);
    findDefaultByWorkspaceMock.mockResolvedValue({ id: 20, workspaceId: 3 });
    vi.mocked(prisma.telegramDestination.create).mockResolvedValue({ id: 'dest_id' } as any);

    const result = await service.createDestination(1, { workspaceId: 3, isDefault: true });

    expect(findDefaultByWorkspaceMock).toHaveBeenCalledWith(3, 'BUSINESS');
    expect(prisma.telegramDestination.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workspaceId: 3,
        accountId: 20,
        label: 'Empresa',
      }),
    }));
    expect(result).toEqual({ id: 'dest_id' });
  });

  it('createDestination falha se usuario nao pertence ao workspace', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_id' } as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

    await expect(service.createDestination(1, { workspaceId: 3 })).rejects.toThrow(
      'Usuario nao e membro do workspace informado',
    );
    expect(prisma.telegramDestination.create).not.toHaveBeenCalled();
  });

  it('createDestination falha claramente sem conta padrao e nao cria destino', async () => {
    vi.mocked(prisma.telegramUserLink.findFirst).mockResolvedValue({ id: 'link_id' } as any);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1, workspace: { type: 'PERSONAL' } } as any);
    findDefaultByWorkspaceMock.mockResolvedValue(null);

    await expect(service.createDestination(1, { workspaceId: 2 })).rejects.toThrow(
      'Conta padrao do workspace nao encontrada',
    );
    expect(prisma.telegramDestination.create).not.toHaveBeenCalled();
  });

  it('consumeCode cria novo link e destino com conta padrao interna', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1, workspace: { type: 'PERSONAL' } } as any);
    findDefaultByWorkspaceMock.mockResolvedValue({ id: 10, workspaceId: 2 });
    vi.mocked(prisma.telegramUserLink.findMany).mockResolvedValue([]);
    vi.mocked(prisma.telegramUserLink.create).mockResolvedValue({ id: 'link_id' } as any);
    vi.mocked(prisma.telegramDestination.create).mockResolvedValue({ id: 'dest_id' } as any);

    await service.consumeCode('123456', 'chat_id');

    expect(prisma.telegramUserLink.create).toHaveBeenCalled();
    expect(prisma.telegramDestination.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workspaceId: 2,
        accountId: 10,
        label: 'Pessoal',
      }),
    }));
    expect(AuditLogService.logSync).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TELEGRAM_LINK_CREATED',
    }), expect.anything());
  });

  it('consumeCode revoga links anteriores', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ id: 1, workspace: { type: 'BUSINESS' } } as any);
    findDefaultByWorkspaceMock.mockResolvedValue({ id: 20, workspaceId: 2 });
    vi.mocked(prisma.telegramUserLink.findMany).mockResolvedValue([{ id: 'old_link', userId: 1 } as any]);
    vi.mocked(prisma.telegramUserLink.create).mockResolvedValue({ id: 'new_link' } as any);
    vi.mocked(prisma.telegramDestination.create).mockResolvedValue({ id: 'dest_id' } as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ workspaceId: 2 } as any);

    await service.consumeCode('123456', 'chat_id');

    expect(prisma.telegramUserLink.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'old_link' },
      data: expect.objectContaining({ status: 'REVOKED' }),
    }));
    expect(AuditLogService.logSync).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TELEGRAM_LINK_REVOKED',
      entityId: 'old_link',
    }), expect.anything());
  });

  it('revokeLink desativa vinculo e destinos', async () => {
    vi.mocked(prisma.telegramUserLink.findUnique).mockResolvedValue({ id: 'link_1', userId: 1, status: 'ACTIVE' } as any);

    await service.revokeLink('link_1', 1);

    expect(prisma.telegramUserLink.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'link_1' },
      data: expect.objectContaining({ status: 'REVOKED' }),
    }));
    expect(prisma.telegramDestination.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { telegramUserLinkId: 'link_1', status: 'ACTIVE' },
      data: expect.objectContaining({ status: 'REVOKED' }),
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
