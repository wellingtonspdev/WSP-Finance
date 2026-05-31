import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramLinkTokenService } from '../../src/services/TelegramLinkTokenService';
import { prisma } from '../../src/lib/prisma';
import crypto from 'crypto';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    telegramLinkToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('TelegramLinkTokenService', () => {
  let service: TelegramLinkTokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TelegramLinkTokenService();
  });

  it('gera token com expiration e salva codeHash', async () => {
    vi.mocked(prisma.telegramLinkToken.create).mockResolvedValue({} as any);

    const result = await service.generateToken({
      userId: 1,
      defaultWorkspaceId: 2,
      defaultAccountId: 3,
      defaultExpenseCategoryId: 4
    });

    expect(result.code).toBeDefined();
    expect(result.code.length).toBe(6);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(prisma.telegramLinkToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 1,
        defaultWorkspaceId: 2,
        defaultAccountId: 3,
        defaultExpenseCategoryId: 4,
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
        attempts: 0,
        maxAttempts: 3
      })
    }));
  });

  it('marca token como usado e valida no DB (verifyAndConsumeToken)', async () => {
    const { code } = await service.generateToken({ userId: 1 });

    // Mock do findUnique retornando token ativo
    vi.mocked(prisma.telegramLinkToken.findUnique).mockResolvedValue({
      id: 'token-123',
      userId: 1,
      usedAt: null,
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 10000)
    } as any);

    vi.mocked(prisma.telegramLinkToken.updateMany).mockResolvedValue({ count: 1 } as any);

    const payload = await service.verifyAndConsumeToken(code);

    expect(payload.userId).toBe(1);
    expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'token-123', usedAt: null, attempts: { lt: 3 } },
      data: expect.objectContaining({
        usedAt: expect.any(Date),
        attempts: { increment: 1 }
      })
    }));
  });

  it('rejeita token invalido ou inexistente', async () => {
    vi.mocked(prisma.telegramLinkToken.findUnique).mockResolvedValue(null);
    await expect(service.verifyAndConsumeToken('123456')).rejects.toThrow('Código inválido ou expirado');
  });

  it('rejeita token ja utilizado', async () => {
    vi.mocked(prisma.telegramLinkToken.findUnique).mockResolvedValue({
      id: 'token-123',
      userId: 1,
      usedAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 10000)
    } as any);

    await expect(service.verifyAndConsumeToken('123456')).rejects.toThrow('Código inválido ou expirado');
  });

  it('rejeita token expirado', async () => {
    vi.mocked(prisma.telegramLinkToken.findUnique).mockResolvedValue({
      id: 'token-123',
      userId: 1,
      usedAt: null,
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() - 10000)
    } as any);

    await expect(service.verifyAndConsumeToken('123456')).rejects.toThrow('Código inválido ou expirado');
  });
});
