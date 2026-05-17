import { Request, Response } from 'express';
import { z } from 'zod';
import { ExportValidationService } from '../services/ExportValidationService';
import { ExportService } from '../services/ExportService';
import { AuditLogService } from '../services/AuditLogService';
import { AuditAction } from '@prisma/client';
import { listExportLayouts } from '../config/exportLayouts';

// ---------------------------------------------------------------------------
// Zod schema — strict input validation
// ---------------------------------------------------------------------------

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const validateExportSchema = z
  .object({
    layoutId: z.string().min(1, 'layoutId é obrigatório'),
    startDate: z
      .string()
      .regex(ISO_DATE_REGEX, 'startDate deve estar no formato YYYY-MM-DD')
      .refine(isValidCalendarDate, 'startDate possui uma data civil inválida'),
    endDate: z
      .string()
      .regex(ISO_DATE_REGEX, 'endDate deve estar no formato YYYY-MM-DD')
      .refine(isValidCalendarDate, 'endDate possui uma data civil inválida'),
  })
  .strip()
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'startDate deve ser menor ou igual a endDate',
      path: ['startDate'],
    },
  );

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class ExportController {
  private readonly validationService: ExportValidationService;

  constructor() {
    this.validationService = new ExportValidationService();
  }

  /**
   * POST /export/validate
   *
   * Pre-validates accounting export readiness without generating the file.
   */
  async validate(req: Request, res: Response): Promise<void> {
    // workspaceId is injected by WorkspaceMiddleware
    const workspaceId = (req as any).workspaceId as number | undefined;
    if (!workspaceId) {
      res.status(400).json({
        status: 'validation_error',
        message: 'workspaceId é obrigatório.',
      });
      return;
    }

    // Structural validation
    const parsed = validateExportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join(' | '),
      });
      return;
    }

    try {
      const result = await this.validationService.validate({
        workspaceId,
        layoutId: parsed.data.layoutId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      });

      res.status(200).json(result);
    } catch {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao validar exportação.',
      });
    }
  }

  /**
   * POST /export/generate
   *
   * Generates the accounting export file after validation and records an audit log.
   */
  async generate(req: Request, res: Response): Promise<void> {
    const workspaceId = (req as any).workspaceId as number | undefined;
    const user = (req as any).user;

    if (!workspaceId) {
      res.status(400).json({
        status: 'validation_error',
        message: 'workspaceId é obrigatório.',
      });
      return;
    }

    if (!user || !user.id) {
      res.status(401).json({
        status: 'auth_error',
        message: 'Usuário não autenticado.',
      });
      return;
    }

    // Structural validation
    const parsed = validateExportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'validation_error',
        message: parsed.error.issues.map((i) => i.message).join(' | '),
      });
      return;
    }

    const supportedLayouts = listExportLayouts().map((l) => l.id);
    if (!supportedLayouts.includes(parsed.data.layoutId)) {
      res.status(400).json({
        status: 'validation_error',
        message: 'Layout não suportado.',
      });
      return;
    }

    try {
      const validationResult = await this.validationService.validate({
        workspaceId,
        layoutId: parsed.data.layoutId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      });

      if (!validationResult.valid || validationResult.blockers.length > 0) {
        res.status(422).json(validationResult);
        return;
      }

      const exportService = new ExportService();
      const exportResult = await exportService.generate({
        workspaceId,
        userId: user.id,
        layoutId: parsed.data.layoutId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      });

      await AuditLogService.logSync({
        userId: user.id,
        workspaceId,
        action: 'EXPORT' as AuditAction,
        entity: 'AccountingExport',
        entityId: exportResult.hash,
        newState: {
          layoutId: parsed.data.layoutId,
          targetSystem: 'DOMINIO',
          periodStart: parsed.data.startDate,
          periodEnd: parsed.data.endDate,
          recordCount: exportResult.recordCount,
          warningsCount: validationResult.summary?.warningsCount ?? validationResult.warnings.length,
          fileHash: exportResult.hash,
          fileName: exportResult.fileName,
        },
      });

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      res.setHeader('Cache-Control', 'no-store');

      res.status(200).send(exportResult.buffer);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao gerar exportação.',
      });
    }
  }
}
