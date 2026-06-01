import { Request, Response } from 'express';
import { z } from 'zod';
import { TelegramLinkService } from '../services/TelegramLinkService';
import { AppError } from '../errors/AppError';

export class TelegramIntegrationController {
  private linkService: TelegramLinkService;

  constructor() {
    this.linkService = new TelegramLinkService();
  }

  /**
   * Gera o link de pareamento user-first.
   * Destino (workspaceId, categorias) é totalmente opcional.
   * O usuário pode parear primeiro e configurar destinos depois no app.
   */
  async generateLink(req: Request, res: Response) {
    const bodySchema = z.object({
      defaultWorkspaceId: z.number().int().positive().optional(),
      defaultExpenseCategoryId: z.number().int().positive().optional(),
      defaultIncomeCategoryId: z.number().int().positive().optional(),
    }).strict().refine(
      (data) => {
        // Se informar categoria, deve informar workspace
        if (
          (data.defaultExpenseCategoryId !== undefined || data.defaultIncomeCategoryId !== undefined) &&
          data.defaultWorkspaceId === undefined
        ) {
          return false;
        }
        return true;
      },
      { message: 'defaultWorkspaceId é obrigatório quando categorias são informadas' },
    );

    const body = bodySchema.parse(req.body);
    const userId = req.user!.id;

    try {
      const result = await this.linkService.generateLink({
        userId,
        defaultWorkspaceId: body.defaultWorkspaceId,
        defaultExpenseCategoryId: body.defaultExpenseCategoryId,
        defaultIncomeCategoryId: body.defaultIncomeCategoryId,
      });

      return res.status(201).json({
        code: result.pairingCode,
        telegramUrl: `https://t.me/${result.botUsername}`,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }

  /**
   * Revoga um vínculo pelo id.
   * Validação de ownership ocorre no service — não usa workspaceId.
   */
  async revokeLink(req: Request, res: Response) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(req.params);
    const userId = req.user!.id;

    try {
      await this.linkService.revokeLink(id, userId);
      return res.status(200).json({ message: 'Vínculo revogado com sucesso.' });
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }

  /**
   * Retorna o status do vínculo Telegram do usuário autenticado.
   * Não filtra por workspace — o vínculo é do usuário.
   * Nunca expõe: telegramChatIdHash, telegramUserIdHash.
   */
  async getStatus(req: Request, res: Response) {
    const userId = req.user!.id;

    try {
      const status = await this.linkService.getStatusForUser(userId);
      return res.status(200).json(status);
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }

  /**
   * Adiciona um novo destino (Workspace/Conta) ao vínculo ativo.
   */
  async createDestination(req: Request, res: Response) {
    const bodySchema = z.object({
      workspaceId: z.number().int().positive(),
      defaultExpenseCategoryId: z.number().int().positive().optional(),
      defaultIncomeCategoryId: z.number().int().positive().optional(),
      label: z.string().max(50).optional(),
      isDefault: z.boolean().optional(),
    }).strict();

    const body = bodySchema.parse(req.body);
    const userId = req.user!.id;

    try {
      const result = await this.linkService.createDestination(userId, body);
      return res.status(201).json({
        id: result.id,
        message: 'Destino adicionado com sucesso.',
      });
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }
}
