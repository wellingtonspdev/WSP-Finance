import { Request, Response } from 'express';
import { z } from 'zod';
import {
  OpenFinanceWebhookPayload,
  OpenFinanceWebhookService,
} from '../services/OpenFinanceWebhookService';

const openFinanceWebhookMovementSchema = z.object({
  transactionId: z.string().min(1).optional(),
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.union([z.string().min(1), z.number()]).transform((value) => value.toString()),
});

const openFinanceWebhookSchema = z.object({
  source: z.literal('OPEN_FINANCE').optional().default('OPEN_FINANCE'),
  workspaceId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  movements: z.array(openFinanceWebhookMovementSchema).min(1),
});

export class OpenFinanceWebhookController {
  private readonly openFinanceWebhookService: OpenFinanceWebhookService;

  constructor() {
    this.openFinanceWebhookService = new OpenFinanceWebhookService();
  }

  async ingest(req: Request, res: Response) {
    if (!this.openFinanceWebhookService.isAuthorized(req.header('authorization') || undefined)) {
      return res.status(401).json({ message: 'Webhook authorization failed.' });
    }

    try {
      const payload = openFinanceWebhookSchema.parse(req.body) as OpenFinanceWebhookPayload;
      const result = await this.openFinanceWebhookService.ingest(payload);

      return res.status(202).json({
        message: 'Open Finance webhook processed.',
        details: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || 'Invalid Open Finance webhook payload.',
      });
    }
  }
}
