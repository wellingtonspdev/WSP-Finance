import { Request, Response } from 'express';
import { z } from 'zod';
import { BridgeService } from '../services/BridgeService';

export class BridgeController {
  private bridgeService: BridgeService;

  constructor() {
    this.bridgeService = new BridgeService();
  }

  async transfer(req: Request, res: Response) {
    const transferSchema = z.object({
      fromWorkspaceId: z.coerce.number().int().positive(),
      toWorkspaceId: z.coerce.number().int().positive(),
      amount: z.coerce.number().positive('O valor deve ser positivo'),
      description: z.string().default('Transferência entre Workspaces'),
      date: z.coerce.date().default(() => new Date()),
    });

    // Validação de Input
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Payload invalido.', issues: parsed.error.issues });
    }

    const dto = parsed.data;
    const userId = req.user.id;

    // Validação Lógica Básica
    if (dto.fromWorkspaceId === dto.toWorkspaceId) {
      return res.status(400).json({ message: 'A transferência deve ser entre workspaces diferentes.' });
    }

    try {
      const result = await this.bridgeService.executeTransfer(userId, dto);
      return res.status(201).json({
        message: 'Transferência realizada com sucesso',
        details: result
      });
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      if (err.message.includes('Permissão negada')) {
        return res.status(403).json({ message: err.message });
      }
      if (err.message.includes('Saldo insuficiente') || err.message.includes('inválida')) {
        return res.status(400).json({ message: err.message });
      }
      console.error(err);
      return res.status(500).json({ message: 'Erro interno ao processar transferência.' });
    }
  }
}
