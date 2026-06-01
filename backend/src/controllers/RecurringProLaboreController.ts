import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { RecurringProLaboreService } from '../services/RecurringProLaboreService';

export class RecurringProLaboreController {
  constructor(private readonly service = new RecurringProLaboreService()) {}

  private handleError(res: Response, err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Payload invalido.', issues: err.issues });
    }
    if (err instanceof AppError || err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Erro interno ao processar pro-labore recorrente.' });
  }

  async createSchedule(req: Request, res: Response) {
    const schema = z.object({
      sourceWorkspaceId: z.coerce.number().int().positive(),
      destinationWorkspaceId: z.coerce.number().int().positive(),
      amount: z.coerce.number().positive(),
      dayOfMonth: z.coerce.number().int().min(1).max(31),
      description: z.string().trim().min(1).max(255),
    });

    try {
      const schedule = await this.service.createSchedule(req.user.id, schema.parse(req.body));
      return res.status(201).json({ schedule });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }

  async listSchedules(req: Request, res: Response) {
    try {
      const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : undefined;
      const schedules = await this.service.listSchedules(req.user.id, { workspaceId });
      return res.status(200).json({ schedules });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }

  async deactivateSchedule(req: Request, res: Response) {
    try {
      const schedule = await this.service.deactivateSchedule(req.user.id, req.params.id);
      return res.status(200).json({ schedule });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }

  async listPendings(req: Request, res: Response) {
    try {
      const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : undefined;
      const pendings = await this.service.listPendings(req.user.id, { workspaceId });
      return res.status(200).json({ pendings });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }

  async confirmPending(req: Request, res: Response) {
    try {
      const pending = await this.service.confirmPending(req.user.id, req.params.id);
      return res.status(200).json({ pending });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }

  async cancelPending(req: Request, res: Response) {
    try {
      const pending = await this.service.cancelPending(req.user.id, req.params.id);
      return res.status(200).json({ pending });
    } catch (err: any) {
      return this.handleError(res, err);
    }
  }
}
