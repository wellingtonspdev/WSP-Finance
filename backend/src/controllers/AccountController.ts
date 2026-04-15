import { Request, Response } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/AccountService';
import { AccountType } from '@prisma/client';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async create(req: Request, res: Response) {
    const createAccountSchema = z.object({
      name: z.string().min(1),
      type: z.nativeEnum(AccountType),
      initialBalance: z.number().default(0),
      isIncludedInTotal: z.boolean().default(true),
    });

    const { name, type, initialBalance, isIncludedInTotal } = createAccountSchema.parse(req.body);
    const workspaceId = req.workspaceId!;

    try {
      const account = await this.accountService.create(name, type, initialBalance, isIncludedInTotal, workspaceId);
      return res.status(201).json(account);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async list(req: Request, res: Response) {
    const workspaceId = req.workspaceId!;
    const accounts = await this.accountService.list(workspaceId);
    return res.status(200).json(accounts);
  }

  async update(req: Request, res: Response) {
    const updateAccountSchema = z.object({
      name: z.string().min(1).optional(),
      type: z.nativeEnum(AccountType).optional(),
      isIncludedInTotal: z.boolean().optional(),
    });
    const paramsSchema = z.object({
      id: z.string().transform((val) => Number(val)), // MUDANÇA: Converte string da URL para number
    });

    const data = updateAccountSchema.parse(req.body);
    const { id } = paramsSchema.parse(req.params);
    const workspaceId = req.workspaceId!;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    try {
      const account = await this.accountService.updatePartial(id, data, workspaceId);
      return res.status(200).json(account);
    } catch (err: any) {
      if (err.message === 'Account not found') {
        return res.status(404).json({ message: err.message });
      }
      throw err;
    }
  }

  async delete(req: Request, res: Response) {
    const paramsSchema = z.object({
      id: z.string().transform((val) => Number(val)), // MUDANÇA: Converte string da URL para number
    });

    const { id } = paramsSchema.parse(req.params);
    const workspaceId = req.workspaceId!;

    try {
      await this.accountService.delete(id, workspaceId);
      return res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Account not found') {
        return res.status(404).json({ message: err.message });
      }
      throw err;
    }
  }
}