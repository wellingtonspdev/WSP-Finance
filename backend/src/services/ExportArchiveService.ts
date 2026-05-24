import { AuditAction } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { IStorageProvider } from '../providers/IStorageProvider';
import { AuditLogService, buildExportAuditNewState } from './AuditLogService';

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
}
