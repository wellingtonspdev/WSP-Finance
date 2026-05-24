import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { ExportArchiveService } from '../../src/services/ExportArchiveService';
import { LocalStorageProvider } from '../../src/providers/LocalStorageProvider';
import { managementClient, applicationClient, withTestWorkspace } from '../../src/test/prisma-test-clients';
import { withTenantContext } from '../utils/withTenantContext';
import { encodeWindows1252, sha256 } from '../../src/lib/encoding';

describe('ExportArchiveService & RLS', () => {
  const wsAId = 9801;
  const wsBId = 9802;
  const userAId = 9811;
  const userBId = 9812;

  let storageProvider: LocalStorageProvider;
  let archiveService: ExportArchiveService;

  beforeEach(async () => {
    storageProvider = new LocalStorageProvider();
    archiveService = new ExportArchiveService(storageProvider);

    // Create test workspaces and users in database bypass RLS
    await managementClient.workspace.createMany({
      data: [
        { id: wsAId, name: 'TDD WS A' },
        { id: wsBId, name: 'TDD WS B' },
      ],
      skipDuplicates: true,
    });

    await managementClient.user.createMany({
      data: [
        { id: userAId, email: 'tdd_user_a@example.com', name: 'TDD User A', passwordHash: 'hash' },
        { id: userBId, email: 'tdd_user_b@example.com', name: 'TDD User B', passwordHash: 'hash' },
      ],
      skipDuplicates: true,
    });

    // Create memberships
    await managementClient.workspaceMember.createMany({
      data: [
        { userId: userAId, workspaceId: wsAId, role: 'OWNER' },
        { userId: userBId, workspaceId: wsBId, role: 'OWNER' },
      ],
      skipDuplicates: true,
    });
  });

  afterEach(async () => {
    // Teardown created archives and users/workspaces
    vi.restoreAllMocks();

    await managementClient.auditLog.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });

    await managementClient.exportArchive.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });

    await managementClient.workspaceMember.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });

    await managementClient.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });

    await managementClient.workspace.deleteMany({
      where: { id: { in: [wsAId, wsBId] } },
    });
  });

  it('happy path: archives buffer, writes metadata to DB and records AuditLog', async () => {
    const rawText = '0000|EMPRESA_TESTE\r\n6000|MOVIMENTO\r\n6100|REGISTRO\r\n';
    const textBuffer = encodeWindows1252(rawText);
    const hash = sha256(textBuffer);

    const result = await withTenantContext(wsAId, async () => {
      return await archiveService.archiveAndLog({
        workspaceId: wsAId,
        userId: userAId,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        periodStart: new Date('2023-01-01T00:00:00.000Z'),
        periodEnd: new Date('2023-01-31T23:59:59.000Z'),
        fileName: 'export_dominio_test.txt',
        buffer: textBuffer,
        sha256: hash,
        recordCount: 3,
        contentType: 'text/plain',
        encoding: 'windows-1252',
        warningsCount: 2,
      });
    });

    expect(result.id).toBeDefined();
    expect(result.objectKey).toBeDefined();

    // Verify objectKey does not contain PII
    expect(result.objectKey).not.toContain('tdd_user_a');
    expect(result.objectKey).not.toContain('EMPRESA_TESTE');

    // Verify file physical existence on Local Storage
    const physicalPath = path.resolve(__dirname, '..', '..', 'uploads', result.objectKey);
    expect(fs.existsSync(physicalPath)).toBe(true);

    // Verify DB entry bypass RLS using managementClient
    const archive = await managementClient.exportArchive.findUnique({
      where: { id: result.id },
    });

    expect(archive).not.toBeNull();
    expect(archive?.workspaceId).toBe(wsAId);
    expect(archive?.createdByUserId).toBe(userAId);
    expect(archive?.sha256).toBe(hash);
    expect(archive?.sizeBytes).toBe(textBuffer.length);
    expect(archive?.contentType).toBe('text/plain');
    expect(archive?.encoding).toBe('windows-1252');
    expect(archive?.warningsCount).toBe(2);

    // retentionUntil must be exactly createdAt + 5 years
    const expectedRetention = new Date(archive!.createdAt.getTime());
    expectedRetention.setFullYear(expectedRetention.getFullYear() + 5);
    expect(archive?.retentionUntil.getTime()).toBe(expectedRetention.getTime());

    // Verify AuditLog
    const auditLog = await managementClient.auditLog.findFirst({
      where: { workspaceId: wsAId, action: 'EXPORT', entityId: result.id },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog?.entity).toBe('AccountingExport');

    // S5-005: entityId MUST be the archiveId
    expect(auditLog?.entityId).toBe(result.id);

    const newState = auditLog?.newState as any;
    expect(newState).toBeDefined();
    expect(newState.archiveId).toBe(result.id);
    expect(newState.layoutId).toBe('dominio-separated-v1');
    expect(newState.targetSystem).toBe('DOMINIO');

    // S5-005: newState allowlist must contain only the safe fields
    const newStateKeys = Object.keys(newState).sort();
    expect(newStateKeys).toEqual([
      'archiveId',
      'fileHash',
      'fileName',
      'layoutId',
      'periodEnd',
      'periodStart',
      'recordCount',
      'targetSystem',
      'warningsCount',
    ]);

    // Security check: objectKey, raw text content or PII must not be present in newState or DB fields
    expect(newState.objectKey).toBeUndefined();
    const serializedNewState = JSON.stringify(newState);
    expect(serializedNewState).not.toContain('EMPRESA_TESTE');
    expect(serializedNewState).not.toContain('6000|MOVIMENTO');
    expect(serializedNewState).not.toContain('6100|REGISTRO');
    expect(serializedNewState).not.toContain('workspaces/');
    expect(serializedNewState).not.toContain('exports/');
    expect(serializedNewState).not.toContain('objectKey');
    expect(serializedNewState).not.toContain('bucket');
    expect(serializedNewState).not.toContain('r2://');
    expect(serializedNewState).not.toContain('s3://');
    expect(JSON.stringify(archive)).not.toContain('6000|MOVIMENTO');

    // Cleanup local file
    await storageProvider.deleteFile(result.objectKey);
  });

  it('fails if StorageProvider uploadBuffer throws, rolls back, and creates no records', async () => {
    const textBuffer = encodeWindows1252('test error storage');
    const hash = sha256(textBuffer);

    vi.spyOn(storageProvider, 'uploadBuffer').mockRejectedValueOnce(new Error('R2 Upload Failed'));

    await expect(
      withTenantContext(wsAId, async () => {
        return await archiveService.archiveAndLog({
          workspaceId: wsAId,
          userId: userAId,
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          periodStart: new Date(),
          periodEnd: new Date(),
          fileName: 'error_test.txt',
          buffer: textBuffer,
          sha256: hash,
          recordCount: 1,
          contentType: 'text/plain',
          encoding: 'windows-1252',
          warningsCount: 0,
        });
      })
    ).rejects.toThrow('R2 Upload Failed');

    // Ensure no DB entries
    const archiveCount = await managementClient.exportArchive.count({
      where: { workspaceId: wsAId },
    });
    expect(archiveCount).toBe(0);

    const auditCount = await managementClient.auditLog.count({
      where: { workspaceId: wsAId },
    });
    expect(auditCount).toBe(0);
  });

  it('fails if DB transaction fails after upload, and triggers best-effort deleteFile cleanup', async () => {
    const textBuffer = encodeWindows1252('test error db');
    const hash = sha256(textBuffer);

    // We can simulate a database failure by providing an invalid createdByUserId to fail FK constraint
    const deleteSpy = vi.spyOn(storageProvider, 'deleteFile');

    let uploadedKey: string | undefined;
    const originalUpload = storageProvider.uploadBuffer.bind(storageProvider);
    vi.spyOn(storageProvider, 'uploadBuffer').mockImplementationOnce(async (buf, key, type) => {
      uploadedKey = key;
      return originalUpload(buf, key, type);
    });

    await expect(
      withTenantContext(wsAId, async () => {
        return await archiveService.archiveAndLog({
          workspaceId: wsAId,
          userId: 999999, // Invalid user to trigger database constraint error
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          periodStart: new Date(),
          periodEnd: new Date(),
          fileName: 'error_db_test.txt',
          buffer: textBuffer,
          sha256: hash,
          recordCount: 1,
          contentType: 'text/plain',
          encoding: 'windows-1252',
          warningsCount: 0,
        });
      })
    ).rejects.toThrow();

    // Verify cleanup deleteFile was called on the uploadedKey
    expect(uploadedKey).toBeDefined();
    expect(deleteSpy).toHaveBeenCalledWith(uploadedKey);

    // Verify file was indeed removed
    const physicalPath = path.resolve(__dirname, '..', '..', 'uploads', uploadedKey!);
    expect(fs.existsSync(physicalPath)).toBe(false);
  });

  it('ensures that deleteFile failure during DB rollback does not mask the original database error', async () => {
    const textBuffer = encodeWindows1252('test delete error');
    const hash = sha256(textBuffer);

    vi.spyOn(storageProvider, 'deleteFile').mockRejectedValueOnce(new Error('R2 delete failed'));

    await expect(
      withTenantContext(wsAId, async () => {
        return await archiveService.archiveAndLog({
          workspaceId: wsAId,
          userId: 999999, // Invalid user to trigger database error
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          periodStart: new Date(),
          periodEnd: new Date(),
          fileName: 'error_delete_test.txt',
          buffer: textBuffer,
          sha256: hash,
          recordCount: 1,
          contentType: 'text/plain',
          encoding: 'windows-1252',
          warningsCount: 0,
        });
      })
    ).rejects.toThrow(/foreign key constraint/i); // Expect original DB error to propagate, not the delete failure
  });

  it('verifies Path Traversal protection in LocalStorageProvider with various payloads', async () => {
    const buffer = Buffer.from('traversal');

    // --- Payloads that MUST be rejected ---

    // Sibling folder attempts (POSIX)
    await expect(
      storageProvider.uploadBuffer(buffer, '../uploads_evil/foo.txt')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('../uploads_evil/foo.txt')
    ).rejects.toThrow(/path traversal/i);

    // Absolute Unix paths
    await expect(
      storageProvider.uploadBuffer(buffer, '/etc/passwd')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('/etc/passwd')
    ).rejects.toThrow(/path traversal/i);

    // Absolute Windows paths (backslash)
    await expect(
      storageProvider.uploadBuffer(buffer, 'C:\\Windows\\System32\\cmd.exe')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('C:\\Windows\\System32\\cmd.exe')
    ).rejects.toThrow(/path traversal/i);

    // Absolute Windows paths (forward slash)
    await expect(
      storageProvider.uploadBuffer(buffer, 'C:/Windows/System32/cmd.exe')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('C:/Windows/System32/cmd.exe')
    ).rejects.toThrow(/path traversal/i);

    // UNC paths
    await expect(
      storageProvider.uploadBuffer(buffer, '\\\\server\\share\\file.txt')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('\\\\server\\share\\file.txt')
    ).rejects.toThrow(/path traversal/i);

    // Traversal via backslashes
    await expect(
      storageProvider.uploadBuffer(buffer, '..\\evil.txt')
    ).rejects.toThrow(/path traversal/i);

    await expect(
      storageProvider.deleteFile('..\\evil.txt')
    ).rejects.toThrow(/path traversal/i);

    // --- Valid paths that MUST be accepted ---

    // Simple subfolder
    const validKey = 'subfolder/valid-file.txt';
    await expect(
      storageProvider.uploadBuffer(buffer, validKey)
    ).resolves.not.toThrow();

    // Verify it is indeed written inside the upload directory
    const uploadFolder = (storageProvider as any).uploadFolder;
    const physicalPath = path.resolve(uploadFolder, validKey);
    expect(fs.existsSync(physicalPath)).toBe(true);

    // Clean up valid file
    await expect(
      storageProvider.deleteFile(validKey)
    ).resolves.not.toThrow();
    expect(fs.existsSync(physicalPath)).toBe(false);

    // Multi-level valid path (workspaces pattern)
    const deepKey = 'workspaces/1/exports/uuid.txt';
    await expect(
      storageProvider.uploadBuffer(buffer, deepKey)
    ).resolves.not.toThrow();

    const deepPhysicalPath = path.resolve(uploadFolder, deepKey);
    expect(fs.existsSync(deepPhysicalPath)).toBe(true);

    // Clean up deep valid file
    await expect(
      storageProvider.deleteFile(deepKey)
    ).resolves.not.toThrow();
    expect(fs.existsSync(deepPhysicalPath)).toBe(false);
  });

  it('enforces PostgreSQL Row-Level Security: Tenant B cannot read Tenant A archives', async () => {
    const textBuffer = encodeWindows1252('tenant isolation');
    const hash = sha256(textBuffer);

    // Create archive under Tenant A (wsAId)
    const result = await withTenantContext(wsAId, async () => {
      return await archiveService.archiveAndLog({
        workspaceId: wsAId,
        userId: userAId,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        periodStart: new Date(),
        periodEnd: new Date(),
        fileName: 'isolated.txt',
        buffer: textBuffer,
        sha256: hash,
        recordCount: 1,
        contentType: 'text/plain',
        encoding: 'windows-1252',
        warningsCount: 0,
      });
    });

    // Try reading via Tenant B using applicationClient
    await withTestWorkspace(wsBId.toString(), async () => {
      const archives = await applicationClient.exportArchive.findMany({
        where: { id: result.id },
      });
      expect(archives).toHaveLength(0);
    });

    // Try reading via Tenant A using applicationClient
    await withTestWorkspace(wsAId.toString(), async () => {
      const archives = await applicationClient.exportArchive.findMany({
        where: { id: result.id },
      });
      expect(archives).toHaveLength(1);
      expect(archives[0].id).toBe(result.id);
    });

    // Cleanup local file
    await storageProvider.deleteFile(result.objectKey);
  });

  it('S5-005: cross-tenant getDownloadUrl — Workspace B cannot get presigned URL for Workspace A archive', async () => {
    const textBuffer = encodeWindows1252('cross-tenant download test');
    const hash = sha256(textBuffer);

    // 1. Create a real ExportArchive in Workspace A
    const archiveA = await withTenantContext(wsAId, async () => {
      return await archiveService.archiveAndLog({
        workspaceId: wsAId,
        userId: userAId,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-01-31T23:59:59.000Z'),
        fileName: 'wsp-dominio-2026-01-01_2026-01-31.txt',
        buffer: textBuffer,
        sha256: hash,
        recordCount: 5,
        contentType: 'text/plain',
        encoding: 'windows-1252',
        warningsCount: 0,
      });
    });

    expect(archiveA.id).toBeDefined();

    // 2. Spy on the storage provider to prove it is NOT called
    const presignedSpy = vi.spyOn(storageProvider, 'getPresignedDownloadUrl' as any);

    // 3. Workspace B tries to call getDownloadUrl with Workspace A's archiveId
    //    The service uses prisma.exportArchive.findFirst({ where: { id, workspaceId } })
    //    With workspaceId = wsBId, this should return null → NotFoundError
    const { NotFoundError } = await import('../../src/errors/NotFoundError');
    await expect(
      withTenantContext(wsBId, async () => {
        return await archiveService.getDownloadUrl(archiveA.id, wsBId);
      })
    ).rejects.toThrow(NotFoundError);

    // 4. Provider MUST NOT have been called — no presigned URL generation for cross-tenant
    expect(presignedSpy).not.toHaveBeenCalled();

    // 5. Verify Workspace A can still download its own archive
    const downloadResult = await withTenantContext(wsAId, async () => {
      return await archiveService.getDownloadUrl(archiveA.id, wsAId);
    });

    expect(downloadResult.url).toBeDefined();
    expect(downloadResult.expiresInSeconds).toBeLessThanOrEqual(900);
    expect(downloadResult.fileName).toBe('wsp-dominio-2026-01-01_2026-01-31.txt');

    // 6. Verify response does not contain objectKey or sensitive data
    expect(downloadResult).not.toHaveProperty('objectKey');
    expect(downloadResult).not.toHaveProperty('bucket');
    expect(downloadResult).not.toHaveProperty('buffer');
    expect(downloadResult).not.toHaveProperty('base64');

    // Cleanup local file
    await storageProvider.deleteFile(archiveA.objectKey);
  });
});
