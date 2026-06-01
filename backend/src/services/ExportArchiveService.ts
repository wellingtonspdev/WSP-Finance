import { AuditAction } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { IStorageProvider } from '../providers/IStorageProvider';
import { AuditLogService, buildExportAuditNewState } from './AuditLogService';
import { NotFoundError } from '../errors/NotFoundError';
import { ServiceUnavailableError } from '../errors/ServiceUnavailableError';

const CANONICAL_OBJECT_KEY_REGEX = /^workspaces\/\d+\/exports\/[a-f0-9-]+\.txt$/;

export interface ExportArchiveHistoryItem {
  id: string;
  workspaceId: number;
  layoutId: string;
  targetSystem: string;
  periodStart: string;
  periodEnd: string;
  fileName: string;
  hash: string;
  sizeBytes: number;
  recordCount: number;
  contentType: string;
  encoding: string;
  warningsCount: number;
  retentionUntil: string;
  createdAt: string;
  status: 'AVAILABLE';
  createdByUser: {
    id: number;
    name: string | null;
    email: string;
  };
}

interface ArchiveAndLogDTO {
  workspaceId: number;
  userId: number;
  layoutId: string;
  targetSystem: 'DOMINIO';
  periodStart: Date;
  periodEnd: Date;
  fileName: string;
  buffer: Buffer;
  sha256: string;
  recordCount: number;
  contentType: string;
  encoding: string;
  warningsCount: number;
}

export class ExportArchiveService {
  constructor(private readonly storageProvider: IStorageProvider) {}

  async listByWorkspace(workspaceId: number): Promise<ExportArchiveHistoryItem[]> {
    const archives = await prisma.exportArchive.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workspaceId: true,
        layoutId: true,
        targetSystem: true,
        periodStart: true,
        periodEnd: true,
        fileName: true,
        sha256: true,
        sizeBytes: true,
        recordCount: true,
        contentType: true,
        encoding: true,
        warningsCount: true,
        retentionUntil: true,
        createdAt: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return archives.map((archive) => ({
      id: archive.id,
      workspaceId: archive.workspaceId,
      layoutId: archive.layoutId,
      targetSystem: archive.targetSystem,
      periodStart: archive.periodStart.toISOString(),
      periodEnd: archive.periodEnd.toISOString(),
      fileName: archive.fileName,
      hash: archive.sha256,
      sizeBytes: archive.sizeBytes,
      recordCount: archive.recordCount,
      contentType: archive.contentType,
      encoding: archive.encoding,
      warningsCount: archive.warningsCount,
      retentionUntil: archive.retentionUntil.toISOString(),
      createdAt: archive.createdAt.toISOString(),
      status: 'AVAILABLE',
      createdByUser: archive.createdByUser,
    }));
  }

  /**
   * Uploads an export file to storage (R2/S3/Local) and transactionally records
   * the ExportArchive and AuditLog in the database.
   * Rollback is performed on the storage file if the DB transaction fails.
   */
  async archiveAndLog(dto: ArchiveAndLogDTO) {
    const {
      workspaceId,
      userId,
      layoutId,
      targetSystem,
      periodStart,
      periodEnd,
      fileName,
      buffer,
      sha256,
      recordCount,
      contentType,
      encoding,
      warningsCount,
    } = dto;

    // Generate secure, non-PII object key
    const uuid = crypto.randomUUID();
    const objectKey = `workspaces/${workspaceId}/exports/${uuid}.txt`;

    // 1. Physical upload first
    await this.storageProvider.uploadBuffer(buffer, objectKey, contentType);

    // 2. Database transaction
    try {
      const archive = await prisma.$transaction(async (tx: any) => {
        const createdAt = new Date();
        const retentionUntil = new Date(createdAt);
        retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

        const createdArchive = await tx.exportArchive.create({
          data: {
            workspaceId,
            createdByUserId: userId,
            layoutId,
            targetSystem,
            periodStart,
            periodEnd,
            fileName,
            objectKey,
            sha256,
            sizeBytes: buffer.length,
            recordCount,
            contentType,
            encoding,
            warningsCount,
            retentionUntil,
            createdAt,
          },
        });

        // Safe AuditLog structure (PII-free, objectKey-free)
        await AuditLogService.logSync(
          {
            userId,
            workspaceId,
            action: AuditAction.EXPORT,
            entity: 'AccountingExport',
            entityId: createdArchive.id,
            newState: buildExportAuditNewState({
              layoutId,
              targetSystem,
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              recordCount,
              warningsCount,
              fileHash: sha256,
              fileName,
              archiveId: createdArchive.id,
            }),
          },
          tx as any
        );

        return createdArchive;
      });

      return archive;
    } catch (dbError) {
      // Best-effort physical file deletion/rollback
      try {
        await this.storageProvider.deleteFile(objectKey);
      } catch (deleteError: any) {
        const errMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error(
          `[ExportArchiveService] Best-effort cleanup failed for workspaceId ${workspaceId}: ${errMessage}`
        );
      }
      // Re-throw the original dbError, not the deleteError
      throw dbError;
    }
  }

  /**
   * Generates a presigned download URL for an existing ExportArchive.
   *
   * Security invariants:
   * - Lookup always uses BOTH archiveId AND workspaceId (tenant-scoped).
   * - objectKey is validated against canonical pattern before signing.
   * - Provider is NEVER called if archive is not found or objectKey is invalid.
   * - Response never contains objectKey, bucket, buffer, or raw errors.
   * - TTL is capped at 900 seconds.
   */
  async getDownloadUrl(
    archiveId: string,
    workspaceId: number
  ): Promise<{
    url: string;
    expiresInSeconds: number;
    fileName: string;
    contentType: string;
  }> {
    // 1. Tenant-scoped lookup — both id AND workspaceId
    const archive = await prisma.exportArchive.findFirst({
      where: {
        id: archiveId,
        workspaceId,
      },
    });

    if (!archive) {
      throw new NotFoundError('Exportação não encontrada.');
    }

    // 2. Validate objectKey canonical pattern
    if (!CANONICAL_OBJECT_KEY_REGEX.test(archive.objectKey)) {
      throw new ServiceUnavailableError('Export archive is unavailable.');
    }

    // 3. Validate objectKey workspace segment matches
    const keyWorkspaceMatch = archive.objectKey.match(/^workspaces\/(\d+)\//);
    if (!keyWorkspaceMatch || Number(keyWorkspaceMatch[1]) !== workspaceId) {
      throw new ServiceUnavailableError('Export archive is unavailable.');
    }

    // 4. Generate presigned URL via provider
    const TTL_SECONDS = 900;
    let presignedResult: { url: string; expiresInSeconds: number };

    try {
      presignedResult = await this.storageProvider.getPresignedDownloadUrl(
        archive.objectKey,
        {
          ttlSeconds: TTL_SECONDS,
          contentType: archive.contentType,
          fileName: archive.fileName,
        }
      );
    } catch {
      throw new ServiceUnavailableError(
        'Serviço de download temporariamente indisponível.'
      );
    }

    // 5. Return safe response — no objectKey, no bucket, no buffer
    return {
      url: presignedResult.url,
      expiresInSeconds: presignedResult.expiresInSeconds,
      fileName: archive.fileName,
      contentType: archive.contentType,
    };
  }
}
