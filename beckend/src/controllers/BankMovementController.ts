import { Request, Response } from 'express';
import { z } from 'zod';
import { BankMovementService } from '../services/BankMovementService';
import { AppError } from '../errors/AppError';

export class BankMovementController {
  private service: BankMovementService;

  constructor() {
    this.service = new BankMovementService();
  }

  async listPending(req: Request, res: Response) {
    const querySchema = z.object({
      cursor: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
    });

    const filters = querySchema.parse(req.query);
    const workspaceId = req.workspaceId!;

    const result = await this.service.listPending({
      workspaceId,
      ...filters,
    });

    return res.status(200).json(result);
  }

  async merge(req: Request, res: Response) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      keepId: z.string().uuid(),
      discardIds: z.array(z.string().uuid()).min(1),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    const workspaceId = req.workspaceId!;

    // O :id da rota deve ser o keepId por coerência
    if (id !== body.keepId) {
      return res.status(400).json({ message: 'O param :id deve corresponder ao keepId do body' });
    }

    try {
      const result = await this.service.merge({
        keepId: body.keepId,
        discardIds: body.discardIds,
        workspaceId,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }

  async approve(req: Request, res: Response) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      categoryId: z.number().int().positive(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    const workspaceId = req.workspaceId!;

    try {
      const result = await this.service.approve({
        movementId: id,
        workspaceId,
        categoryId: body.categoryId,
      });

      // Idempotência: já aprovado → 200; primeira aprovação → 201
      const statusCode = ('alreadyApproved' in result && result.alreadyApproved) ? 200 : 201;
      return res.status(statusCode).json(result);
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }

  async reject(req: Request, res: Response) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(req.params);
    const workspaceId = req.workspaceId!;

    try {
      const movement = await this.service.reject(id, workspaceId);
      return res.status(200).json(movement);
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      throw err;
    }
  }
}
