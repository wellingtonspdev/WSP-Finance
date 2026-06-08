import { Request, Response } from 'express';
import { z } from 'zod';
import { TransactionService } from '../services/TransactionService';
import { TransactionType } from '@prisma/client';

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async create(req: Request, res: Response) {
    const createTransactionSchema = z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
      date: z.coerce.date(),
      type: z.nativeEnum(TransactionType),
      accountId: z.number().int().positive().optional(),
      categoryId: z.number().int().positive(),
      isPaid: z.coerce.boolean().default(true),
      // Campos Opcionais de Marketplace
      grossAmount: z.number().min(0).optional(),
      marketplaceFee: z.number().min(0).optional(),
      shippingCost: z.number().min(0).optional(),
      productCost: z.number().min(0).optional(),
      platformFeeRate: z.number().min(0).max(100).optional(),
      // Arquivo bypass R2 (V3.8 Governança)
      attachmentUrl: z.string().optional(),
      attachmentSize: z.number().int().min(0).optional(),
    });

    const data = createTransactionSchema.parse(req.body);
    const workspaceId = req.workspaceId!;
    const userId = req.user.id;

    try {
      const transaction = await this.transactionService.create({
        userId,
        ...data,
        workspaceId
      });
      return res.status(201).json(transaction);
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  }

  async list(req: Request, res: Response) {
    const listQuerySchema = z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      accountId: z.coerce.number().optional(),
      categoryId: z.coerce.number().optional(),
      type: z.nativeEnum(TransactionType).optional(),
      sortDirection: z.enum(['asc', 'desc']).default('desc').optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
    });

    const filters = listQuerySchema.parse(req.query);
    const workspaceId = req.workspaceId!;

    const result = await this.transactionService.list(workspaceId, filters);
    return res.status(200).json(result);
  }

  async listAll(req: Request, res: Response) {
    const userId = req.user.id;
    const transactions = await this.transactionService.listAllByUser(userId);
    return res.status(200).json(transactions);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;

    try {
      const transaction = await this.transactionService.getById(id, workspaceId);
      return res.status(200).json(transaction);
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(404).json({ message: err.message });
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const userId = req.user.id;

    try {
      await this.transactionService.delete(id, workspaceId, userId);
      return res.status(204).send();
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  }
}
