import crypto from 'crypto';
import {
  AuditAction,
  Prisma,
  TransactionStatus,
  TransactionType,
  WorkspaceRole,
  WorkspaceType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../errors/AppError';
import { NotFoundError } from '../errors/NotFoundError';
import { prisma } from '../lib/prisma';
import { getExportStorageProvider } from '../providers/exportStorageProviderFactory';
import { IStorageProvider } from '../providers/IStorageProvider';
import { AuditLogService } from './AuditLogService';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC_BYTES = '%PDF';

export const TaxGuideType = {
  DAS: 'DAS',
  DAS_MEI: 'DAS_MEI',
} as const;

export type TaxGuideType = (typeof TaxGuideType)[keyof typeof TaxGuideType];

export const TaxGuideStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export type TaxGuideStatus = (typeof TaxGuideStatus)[keyof typeof TaxGuideStatus];

type TaxGuideFileField = 'guideFileObjectKey' | 'paymentProofObjectKey';

type TaxGuide = {
  id: string;
  workspaceId: number;
  type: TaxGuideType;
  competenceMonth: number;
  competenceYear: number;
  dueDate: Date;
  amount: Decimal;
  status: TaxGuideStatus;
  guideFileObjectKey: string | null;
  paymentProofObjectKey: string | null;
  paidTransactionId: string | null;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
};

export interface CreateTaxGuideDTO {
  workspaceId: number;
  userId: number;
  role: WorkspaceRole;
  type: TaxGuideType;
  competenceMonth: number;
  competenceYear: number;
  dueDate: Date;
  amount: number | string | Decimal;
}

export interface ListTaxGuideFilters {
  workspaceId: number;
  type?: TaxGuideType;
  status?: TaxGuideStatus;
  competenceMonth?: number;
  competenceYear?: number;
}

export interface TaxGuideUploadDTO {
  workspaceId: number;
  userId: number;
  role: WorkspaceRole;
  taxGuideId: string;
  buffer: Buffer;
  mimetype: string;
  originalName: string;
}

export interface MarkTaxGuidePaidDTO {
  workspaceId: number;
  userId: number;
  role: WorkspaceRole;
  taxGuideId: string;
  paidTransactionId: string;
}

export interface TaxGuideDTO {
  id: string;
  workspaceId: number;
  type: TaxGuideType;
  competenceMonth: number;
  competenceYear: number;
  dueDate: string;
  amount: string;
  status: TaxGuideStatus;
  hasGuideFile: boolean;
  hasPaymentProof: boolean;
  paidTransactionId: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export class TaxGuideService {
  private readonly db = prisma as any;

  constructor(
    private readonly storageProvider: IStorageProvider = getExportStorageProvider()
  ) {}

  private projectStatus(guide: Pick<TaxGuide, 'status' | 'dueDate'>): TaxGuideStatus {
    if (guide.status !== TaxGuideStatus.PENDING) {
      return guide.status;
    }

    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const dueUtc = Date.UTC(
      guide.dueDate.getUTCFullYear(),
      guide.dueDate.getUTCMonth(),
      guide.dueDate.getUTCDate()
    );

    return dueUtc < todayUtc ? TaxGuideStatus.OVERDUE : TaxGuideStatus.PENDING;
  }

  private toDto(guide: TaxGuide): TaxGuideDTO {
    return {
      id: guide.id,
      workspaceId: guide.workspaceId,
      type: guide.type,
      competenceMonth: guide.competenceMonth,
      competenceYear: guide.competenceYear,
      dueDate: guide.dueDate.toISOString(),
      amount: guide.amount.toString(),
      status: this.projectStatus(guide),
      hasGuideFile: Boolean(guide.guideFileObjectKey),
      hasPaymentProof: Boolean(guide.paymentProofObjectKey),
      paidTransactionId: guide.paidTransactionId,
      createdByUserId: guide.createdByUserId,
      createdAt: guide.createdAt.toISOString(),
      updatedAt: guide.updatedAt.toISOString(),
    };
  }

  private assertCreateOrUploadRole(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ACCOUNTANT) {
      throw new AppError('Permissao insuficiente para operar guias fiscais.', 403);
    }
  }

  private assertOwnerRole(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER) {
      throw new AppError('Apenas OWNER pode marcar ou cancelar guias fiscais.', 403);
    }
  }

  private async assertBusinessWorkspace(workspaceId: number) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { type: true },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace nao encontrado.');
    }

    if (workspace.type !== WorkspaceType.BUSINESS) {
      throw new AppError('Guias fiscais so podem ser gerenciadas em workspaces BUSINESS.', 403);
    }
  }

  private async getScopedGuide(workspaceId: number, taxGuideId: string) {
    const guide = await this.db.taxGuide.findFirst({
      where: { id: taxGuideId, workspaceId },
    });

    if (!guide) {
      throw new NotFoundError('Guia fiscal nao encontrada.');
    }

    return guide;
  }

  private assertPdfFile(input: TaxGuideUploadDTO) {
    if (!input.buffer.length || input.buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new AppError('PDF da guia deve ter ate 10MB.', 400);
    }

    const name = input.originalName.toLowerCase();
    const magic = input.buffer.subarray(0, 4).toString('latin1');
    if (input.mimetype !== 'application/pdf' || !name.endsWith('.pdf') || magic !== PDF_MAGIC_BYTES) {
      throw new AppError('Apenas arquivos PDF validos sao aceitos.', 400);
    }
  }

  private buildSafeAuditState(guide: TaxGuide, extra: Record<string, unknown> = {}) {
    return {
      taxGuideId: guide.id,
      type: guide.type,
      competenceMonth: guide.competenceMonth,
      competenceYear: guide.competenceYear,
      status: guide.status,
      amount: guide.amount.toString(),
      dueDate: guide.dueDate.toISOString(),
      hasGuideFile: Boolean(guide.guideFileObjectKey),
      hasPaymentProof: Boolean(guide.paymentProofObjectKey),
      paidTransactionId: guide.paidTransactionId,
      ...extra,
    };
  }

  private async audit(userId: number, workspaceId: number, guide: TaxGuide, extra: Record<string, unknown> = {}) {
    await AuditLogService.logSync({
      userId,
      workspaceId,
      action: AuditAction.UPDATE,
      entity: 'TaxGuide',
      entityId: guide.id,
      newState: this.buildSafeAuditState(guide, extra),
    });
  }

  async create(dto: CreateTaxGuideDTO) {
    this.assertCreateOrUploadRole(dto.role);
    await this.assertBusinessWorkspace(dto.workspaceId);

    try {
      const guide = await this.db.taxGuide.create({
        data: {
          workspaceId: dto.workspaceId,
          type: dto.type,
          competenceMonth: dto.competenceMonth,
          competenceYear: dto.competenceYear,
          dueDate: dto.dueDate,
          amount: new Decimal(dto.amount),
          status: TaxGuideStatus.PENDING,
          createdByUserId: dto.userId,
        },
      });

      await AuditLogService.logSync({
        userId: dto.userId,
        workspaceId: dto.workspaceId,
        action: AuditAction.CREATE,
        entity: 'TaxGuide',
        entityId: guide.id,
        newState: this.buildSafeAuditState(guide),
      });

      return this.toDto(guide);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Ja existe guia fiscal para esta competencia.', 409);
      }
      throw error;
    }
  }

  async list(filters: ListTaxGuideFilters) {
    await this.assertBusinessWorkspace(filters.workspaceId);

    const guides = await this.db.taxGuide.findMany({
      where: {
        workspaceId: filters.workspaceId,
        type: filters.type,
        competenceMonth: filters.competenceMonth,
        competenceYear: filters.competenceYear,
      },
      orderBy: [{ competenceYear: 'desc' }, { competenceMonth: 'desc' }, { dueDate: 'asc' }],
    });

    return (guides as TaxGuide[])
      .map((guide: TaxGuide) => this.toDto(guide))
      .filter((guide: TaxGuideDTO) => !filters.status || guide.status === filters.status);
  }

  async getById(workspaceId: number, taxGuideId: string) {
    await this.assertBusinessWorkspace(workspaceId);
    const guide = await this.getScopedGuide(workspaceId, taxGuideId);
    return this.toDto(guide);
  }

  async markPaid(dto: MarkTaxGuidePaidDTO) {
    this.assertOwnerRole(dto.role);
    await this.assertBusinessWorkspace(dto.workspaceId);
    await this.getScopedGuide(dto.workspaceId, dto.taxGuideId);

    const transaction = await this.db.transaction.findFirst({
      where: {
        id: dto.paidTransactionId,
        workspaceId: dto.workspaceId,
        type: TransactionType.EXPENSE,
        status: TransactionStatus.COMPLETED,
        isPaid: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!transaction) {
      throw new AppError('Transaction de pagamento invalida para este workspace.', 403);
    }

    const guide = await this.db.taxGuide.update({
      where: { id: dto.taxGuideId },
      data: {
        status: TaxGuideStatus.PAID,
        paidTransactionId: dto.paidTransactionId,
      },
    });

    await this.audit(dto.userId, dto.workspaceId, guide, { operation: 'MARK_PAID' });
    return this.toDto(guide);
  }

  async cancel(workspaceId: number, userId: number, role: WorkspaceRole, taxGuideId: string) {
    this.assertOwnerRole(role);
    await this.assertBusinessWorkspace(workspaceId);
    await this.getScopedGuide(workspaceId, taxGuideId);

    const guide = await this.db.taxGuide.update({
      where: { id: taxGuideId },
      data: { status: TaxGuideStatus.CANCELLED },
    });

    await this.audit(userId, workspaceId, guide, { operation: 'CANCEL' });
    return this.toDto(guide);
  }

  private async uploadPdf(dto: TaxGuideUploadDTO, field: TaxGuideFileField, operation: string) {
    this.assertCreateOrUploadRole(dto.role);
    await this.assertBusinessWorkspace(dto.workspaceId);
    await this.getScopedGuide(dto.workspaceId, dto.taxGuideId);
    this.assertPdfFile(dto);

    const sha256 = crypto.createHash('sha256').update(dto.buffer).digest('hex');
    const objectKey = `workspaces/${dto.workspaceId}/tax-guides/${dto.taxGuideId}/${crypto.randomUUID()}.pdf`;

    await this.storageProvider.uploadBuffer(dto.buffer, objectKey, 'application/pdf');

    try {
      const guide = await this.db.taxGuide.update({
        where: { id: dto.taxGuideId },
        data: { [field]: objectKey },
      });

      await this.audit(dto.userId, dto.workspaceId, guide, {
        operation,
        fileSha256: sha256,
        fileSizeBytes: dto.buffer.length,
        contentType: 'application/pdf',
      });

      return this.toDto(guide);
    } catch (error) {
      try {
        await this.storageProvider.deleteFile(objectKey);
      } catch {
        // Best effort cleanup only; preserve the original DB/audit error.
      }
      throw error;
    }
  }

  async uploadGuidePdf(dto: TaxGuideUploadDTO) {
    return this.uploadPdf(dto, 'guideFileObjectKey', 'UPLOAD_GUIDE_PDF');
  }

  async uploadPaymentProof(dto: TaxGuideUploadDTO) {
    return this.uploadPdf(dto, 'paymentProofObjectKey', 'UPLOAD_PAYMENT_PROOF');
  }
}
