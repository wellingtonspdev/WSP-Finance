import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { ExportArchiveService } from '../../src/services/ExportArchiveService';
import { LocalStorageProvider } from '../../src/providers/LocalStorageProvider';
import { managementClient, applicationClient, withTestWorkspace } from '../../src/test/prisma-test-clients';
import { withTenantContext } from '../utils/withTenantContext';

describe('ExportArchiveService.listByWorkspace', () => {
  const wsAId = 9901;
  const wsBId = 9902;
  const userAId = 9911;
  const userBId = 9912;

  let service: ExportArchiveService;

  beforeEach(async () => {
    service = new ExportArchiveService(new LocalStorageProvider());

    await managementClient.workspace.createMany({
      data: [
        { id: wsAId, name: 'History WS A' },
        { id: wsBId, name: 'History WS B' },
      ],
      skipDuplicates: true,
    });

    await managementClient.user.createMany({
      data: [
        { id: userAId, email: 'history_a@example.com', name: 'History User A', passwordHash: 'hash' },
        { id: userBId, email: 'history_b@example.com', name: 'History User B', passwordHash: 'hash' },
      ],
      skipDuplicates: true,
    });

    await managementClient.workspaceMember.createMany({
      data: [
        { userId: userAId, workspaceId: wsAId, role: 'OWNER' },
        { userId: userBId, workspaceId: wsBId, role: 'OWNER' },
      ],
      skipDuplicates: true,
    });
  });

  afterEach(async () => {
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

  async function createArchive(input: {
    workspaceId: number;
    userId: number;
    fileName: string;
    hash: string;
    createdAt: Date;
    objectKey: string;
    recordCount?: number;
    warningsCount?: number;
  }) {
    return managementClient.exportArchive.create({
      data: {
        workspaceId: input.workspaceId,
        createdByUserId: input.userId,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-01-31T23:59:59.000Z'),
        fileName: input.fileName,
        objectKey: input.objectKey,
        sha256: input.hash,
        sizeBytes: 123,
        recordCount: input.recordCount ?? 10,
        contentType: 'text/plain; charset=windows-1252',
        encoding: 'windows-1252',
        warningsCount: input.warningsCount ?? 0,
        retentionUntil: new Date('2031-01-01T00:00:00.000Z'),
        createdAt: input.createdAt,
      },
    });
  }

  it('returns only safe export history records for requested workspace ordered by createdAt desc', async () => {
    const older = await createArchive({
      workspaceId: wsAId,
      userId: userAId,
      fileName: 'older.txt',
      hash: 'a'.repeat(64),
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      objectKey: 'workspaces/9901/exports/11111111-1111-1111-1111-111111111111.txt',
      recordCount: 4,
      warningsCount: 1,
    });
    const newer = await createArchive({
      workspaceId: wsAId,
      userId: userAId,
      fileName: 'newer.txt',
      hash: 'b'.repeat(64),
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
      objectKey: 'workspaces/9901/exports/22222222-2222-2222-2222-222222222222.txt',
      recordCount: 8,
      warningsCount: 2,
    });
    await createArchive({
      workspaceId: wsBId,
      userId: userBId,
      fileName: 'other-tenant.txt',
      hash: 'c'.repeat(64),
      createdAt: new Date('2026-03-10T00:00:00.000Z'),
      objectKey: 'workspaces/9902/exports/33333333-3333-3333-3333-333333333333.txt',
    });

    const result = await withTenantContext(wsAId, async () => {
      return service.listByWorkspace(wsAId);
    });

    expect(result.map((item) => item.id)).toEqual([newer.id, older.id]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        workspaceId: wsAId,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        fileName: 'newer.txt',
        hash: 'b'.repeat(64),
        recordCount: 8,
        warningsCount: 2,
        status: 'AVAILABLE',
        createdByUser: {
          id: userAId,
          name: 'History User A',
          email: 'history_a@example.com',
        },
      })
    );
    expect(result[0].createdAt).toBe('2026-02-10T00:00:00.000Z');
    expect(result[0].periodStart).toBe('2026-01-01T00:00:00.000Z');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('objectKey');
    expect(serialized).not.toContain('bucket');
    expect(serialized).not.toContain('buffer');
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('workspaces/');
    expect(serialized).not.toContain('exports/');
    expect(serialized).not.toContain('6000|');
  });

  it('keeps PostgreSQL RLS proof: Tenant B cannot read Tenant A archives via applicationClient', async () => {
    const archiveA = await createArchive({
      workspaceId: wsAId,
      userId: userAId,
      fileName: 'tenant-a.txt',
      hash: 'd'.repeat(64),
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      objectKey: 'workspaces/9901/exports/44444444-4444-4444-4444-444444444444.txt',
    });

    await withTestWorkspace(wsBId.toString(), async () => {
      const archives = await applicationClient.exportArchive.findMany({
        where: { id: archiveA.id },
      });
      expect(archives).toHaveLength(0);
    });

    await withTestWorkspace(wsAId.toString(), async () => {
      const archives = await applicationClient.exportArchive.findMany({
        where: { id: archiveA.id },
      });
      expect(archives).toHaveLength(1);
    });
  });
});
