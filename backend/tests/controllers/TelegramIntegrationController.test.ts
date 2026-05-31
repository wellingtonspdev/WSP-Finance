import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramIntegrationController } from '../../src/controllers/TelegramIntegrationController';
import { Request, Response } from 'express';
import { TelegramLinkService } from '../../src/services/TelegramLinkService';
import { AppError } from '../../src/errors/AppError';
import { z } from 'zod';

vi.mock('../../src/services/TelegramLinkService');

describe('TelegramIntegrationController', () => {
  let controller: TelegramIntegrationController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TelegramIntegrationController();
    mockReq = {
      user: { id: 1 } as any,
      body: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('generateLink', () => {
    it('gera link com sucesso quando dados sao validos', async () => {
      mockReq.body = { defaultWorkspaceId: 10, defaultAccountId: 1, defaultExpenseCategoryId: 2 };
      const expiresAt = new Date();
      vi.mocked(TelegramLinkService.prototype.generateLink).mockResolvedValue({
        pairingCode: 'CODE123',
        botUsername: 'TestBot',
        expiresAt,
        telegramUrl: 'https://t.me/TestBot?start=CODE123',
      });

      await controller.generateLink(mockReq as Request, mockRes as Response);

      expect(TelegramLinkService.prototype.generateLink).toHaveBeenCalledWith({
        userId: 1,
        defaultWorkspaceId: 10,
        defaultAccountId: 1,
        defaultExpenseCategoryId: 2,
        defaultIncomeCategoryId: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 'CODE123',
        telegramUrl: 'https://t.me/TestBot',
        expiresAt: expiresAt.toISOString(),
      });
    });

    it('retorna 400 (throw ZodError) se validacao zod falhar', async () => {
      // Passando id de conta sem passar workspace (viola refine)
      mockReq.body = { defaultAccountId: 1 };
      await expect(controller.generateLink(mockReq as Request, mockRes as Response)).rejects.toThrow(z.ZodError);
    });

    it('trata AppError corretamente', async () => {
      mockReq.body = { defaultWorkspaceId: 10, defaultAccountId: 1 };
      vi.mocked(TelegramLinkService.prototype.generateLink).mockRejectedValue(new AppError('Erro customizado', 403));

      await controller.generateLink(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Erro customizado' });
    });
  });

  describe('revokeLink', () => {
    it('revoga link com sucesso', async () => {
      mockReq.params = { id: '792f44c4-7db3-4316-bc5b-ef0fc441c2d0' };
      vi.mocked(TelegramLinkService.prototype.revokeLink).mockResolvedValue();

      await controller.revokeLink(mockReq as Request, mockRes as Response);

      expect(TelegramLinkService.prototype.revokeLink).toHaveBeenCalledWith('792f44c4-7db3-4316-bc5b-ef0fc441c2d0', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Vínculo revogado com sucesso.' });
    });

    it('retorna erro se id nao for uuid valido', async () => {
      mockReq.params = { id: 'not-a-uuid' };
      await expect(controller.revokeLink(mockReq as Request, mockRes as Response)).rejects.toThrow(z.ZodError);
    });
  });

  describe('getStatus', () => {
    it('retorna o status do usuario', async () => {
      const mockStatus = {
        isLinked: true,
        telegramUsername: 'user1',
        activeDestination: null,
        destinations: [],
      };
      vi.mocked(TelegramLinkService.prototype.getStatusForUser).mockResolvedValue(mockStatus as any);

      await controller.getStatus(mockReq as Request, mockRes as Response);

      expect(TelegramLinkService.prototype.getStatusForUser).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStatus);
    });
  });
});
