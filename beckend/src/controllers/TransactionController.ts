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
      accountId: z.string().uuid(),
      categoryId: z.number(),
      isPaid: z.boolean().default(true),
      // Campos Opcionais de Marketplace
      grossAmount: z.number().positive().optional(),
      marketplaceFee: z.number().min(0).optional(),
      shippingCost: z.number().min(0).optional(),
      productCost: z.number().min(0).optional(),
    });

    const data = createTransactionSchema.parse(req.body);
    const workspaceId = req.workspaceId!;

    try {
      const transaction = await this.transactionService.create({
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
    });

    const filters = listQuerySchema.parse(req.query);
    const workspaceId = req.workspaceId!;

    const transactions = await this.transactionService.list(workspaceId, filters);
    return res.status(200).json(transactions);
  }

  async listAll(req: Request, res: Response) {
    const userId = req.user.id;
    const transactions = await this.transactionService.listAllByUser(userId);
    return res.status(200).json(transactions);
  }
}