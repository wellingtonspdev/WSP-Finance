import { Request, Response } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { TaxGuideService, TaxGuideStatus, TaxGuideType } from '../services/TaxGuideService';
import { AppError } from '../errors/AppError';

const createTaxGuideSchema = z.object({
  type: z.enum([TaxGuideType.DAS, TaxGuideType.DAS_MEI]),
  competenceMonth: z.coerce.number().int().min(1).max(12),
  competenceYear: z.coerce.number().int().min(2000).max(2100),
  dueDate: z.coerce.date(),
  amount: z.union([z.coerce.number().positive(), z.string().regex(/^\d+(\.\d{1,4})?$/)]),
});

const listTaxGuideSchema = z.object({
  type: z.enum([TaxGuideType.DAS, TaxGuideType.DAS_MEI]).optional(),
  status: z.enum([
    TaxGuideStatus.PENDING,
    TaxGuideStatus.PAID,
    TaxGuideStatus.OVERDUE,
    TaxGuideStatus.CANCELLED,
  ]).optional(),
  competenceMonth: z.coerce.number().int().min(1).max(12).optional(),
  competenceYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

const markPaidSchema = z.object({
  paidTransactionId: z.string().uuid(),
});

export class TaxGuideController {
  constructor(private readonly taxGuideService = new TaxGuideService()) {}

  private getRole(req: Request): WorkspaceRole {
    return ((req as any).userRole ?? 'VIEWER') as WorkspaceRole;
  }

  private getUploadedPdf(req: Request) {
    if (!req.file) {
      throw new AppError('Arquivo PDF e obrigatorio.', 400);
    }

    return {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    };
  }

  async create(req: Request, res: Response) {
    const data = createTaxGuideSchema.parse(req.body);
    const guide = await this.taxGuideService.create({
      workspaceId: req.workspaceId!,
      userId: req.user.id,
      role: this.getRole(req),
      ...data,
    });

    return res.status(201).json(guide);
  }

  async list(req: Request, res: Response) {
    const filters = listTaxGuideSchema.parse(req.query);
    const guides = await this.taxGuideService.list({
      workspaceId: req.workspaceId!,
      ...filters,
    });

    return res.status(200).json(guides);
  }

  async getById(req: Request, res: Response) {
    const guide = await this.taxGuideService.getById(req.workspaceId!, req.params.id);
    return res.status(200).json(guide);
  }

  async markPaid(req: Request, res: Response) {
    const data = markPaidSchema.parse(req.body);
    const guide = await this.taxGuideService.markPaid({
      workspaceId: req.workspaceId!,
      userId: req.user.id,
      role: this.getRole(req),
      taxGuideId: req.params.id,
      paidTransactionId: data.paidTransactionId,
    });

    return res.status(200).json(guide);
  }

  async cancel(req: Request, res: Response) {
    const guide = await this.taxGuideService.cancel(
      req.workspaceId!,
      req.user.id,
      this.getRole(req),
      req.params.id
    );

    return res.status(200).json(guide);
  }

  async uploadGuidePdf(req: Request, res: Response) {
    const file = this.getUploadedPdf(req);
    const guide = await this.taxGuideService.uploadGuidePdf({
      workspaceId: req.workspaceId!,
      userId: req.user.id,
      role: this.getRole(req),
      taxGuideId: req.params.id,
      ...file,
    });

    return res.status(200).json(guide);
  }

  async uploadPaymentProof(req: Request, res: Response) {
    const file = this.getUploadedPdf(req);
    const guide = await this.taxGuideService.uploadPaymentProof({
      workspaceId: req.workspaceId!,
      userId: req.user.id,
      role: this.getRole(req),
      taxGuideId: req.params.id,
      ...file,
    });

    return res.status(200).json(guide);
  }
}
