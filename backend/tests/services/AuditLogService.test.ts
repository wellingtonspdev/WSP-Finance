import { AuditAction } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuditLogService,
  buildExportAuditNewState,
  type ExportAuditMetadata,
} from '../../src/services/AuditLogService';
import { managementClient } from '../../src/test/prisma-test-clients';

const forbiddenNewStateFields = [
  'objectKey',
  'txtContent',
  'fileContent',
  'rawText',
  'content',
  'lines',
  'rows',
  'records',
  'recordsContent',
  'description',
  'descriptions',
  'history',
  'fullHistory',
  'transactions',
  'bankMovements',
  'cpf',
  'cnpj',
  'document',
  'documentNumber',
  'customerName',
  'email',
  'name',
  'rawPayload',
  'bucket',
  'path',
  'internalPath',
  'storagePath',
] as const;

const forbiddenSubstrings = [
  '6100|',
  '6000|',
  'PAGAMENTO ALUGUEL MAIO CLIENTE REAL',
  '123.456.789-00',
  '12.345.678/0001-99',
  'cliente.real@example.com',
  'João Cliente Real',
  'workspaces/',
  'exports/',
  'objectKey',
  'bucket',
  'r2://',
  's3://',
  'private/',
  'storage/',
  'rawPayload',
] as const;

type AuditLogServiceClient = Parameters<typeof AuditLogService.logSync>[1];

function validExportMetadata(overrides: Partial<ExportAuditMetadata> = {}): ExportAuditMetadata {
  return {
    layoutId: 'dominio-separated-v1',
    targetSystem: 'DOMINIO',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    recordCount: 42,
    warningsCount: 0,
    fileHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfa1359',
    fileName: 'wsp-dominio-2026-04.txt',
    ...overrides,
  };
}

describe('AuditLogService export audit contract', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const exportEntityId = `test-export-audit-${runId}`;
  const createEntityId = `test-create-audit-${runId}`;
  const testEmail = `audit-log-${runId}@example.test`;
  const workspaceName = `Audit Log Test Workspace ${runId}`;

  afterEach(async () => {
    await managementClient.auditLog.deleteMany({
      where: { entityId: { in: [exportEntityId, createEntityId] } },
    });
    await managementClient.user.deleteMany({ where: { email: testEmail } });
    await managementClient.workspace.deleteMany({ where: { name: workspaceName } });
  });

  async function createAuditActor() {
    const [user, workspace] = await Promise.all([
      managementClient.user.create({
        data: {
          email: testEmail,
          name: 'Audit Log Test User',
          passwordHash: 'test-password-hash',
        },
      }),
      managementClient.workspace.create({
        data: {
          name: workspaceName,
          type: 'BUSINESS',
        },
      }),
    ]);

    return { user, workspace };
  }

  it('exposes AuditAction.EXPORT as the EXPORT contract value', () => {
    expect(AuditAction.EXPORT).toBe('EXPORT');
  });

  it('builds export audit newState with minimal safe metadata (without archiveId)', () => {
    const metadata = validExportMetadata();

    expect(buildExportAuditNewState(metadata)).toEqual(metadata);
  });

  it('T1: builds export audit newState with archiveId when provided', () => {
    const archiveId = 'archive-uuid-abc123';
    const metadata = validExportMetadata({ archiveId });
    const result = buildExportAuditNewState(metadata);

    // Must include archiveId in the output
    expect(result.archiveId).toBe(archiveId);

    // Snapshot: exact allowlist shape with archiveId
    expect(result).toEqual({
      archiveId,
      layoutId: 'dominio-separated-v1',
      targetSystem: 'DOMINIO',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      recordCount: 42,
      warningsCount: 0,
      fileHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfa1359',
      fileName: 'wsp-dominio-2026-04.txt',
    });

    // No extra keys beyond the allowlist
    expect(Object.keys(result).sort()).toEqual([
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
  });

  it('T2: drops ALL forbidden fields including objectKey, bucket, path, storagePath', () => {
    const unsafeInput = {
      ...validExportMetadata(),
      objectKey: 'workspaces/100/exports/uuid.txt',
      txtContent: 'not-used',
      fileContent: 'not-used',
      rawText: 'not-used',
      content: 'not-used',
      lines: ['not-used'],
      rows: ['not-used'],
      records: [{ amount: 100 }],
      recordsContent: 'not-used',
      description: 'not-used',
      descriptions: ['not-used'],
      history: 'not-used',
      fullHistory: ['not-used'],
      transactions: [{ id: 'tx-1' }],
      bankMovements: [{ id: 'bm-1' }],
      cpf: 'blocked',
      cnpj: 'blocked',
      document: 'blocked',
      documentNumber: 'blocked',
      customerName: 'not-used',
      email: 'not-used@example.test',
      name: 'not-used',
      rawPayload: { value: 'not-used' },
      bucket: 'wsp-finance-vault',
      path: '/internal/path',
      internalPath: '/internal/path',
      storagePath: 'r2://bucket/key',
    } as ExportAuditMetadata & Record<(typeof forbiddenNewStateFields)[number], unknown>;

    const newState = buildExportAuditNewState(unsafeInput);

    expect(Object.keys(newState).sort()).toEqual([
      'fileHash',
      'fileName',
      'layoutId',
      'periodEnd',
      'periodStart',
      'recordCount',
      'targetSystem',
      'warningsCount',
    ]);

    for (const field of forbiddenNewStateFields) {
      expect(newState).not.toHaveProperty(field);
    }
  });

  it('T3: serialized newState contains no forbidden substrings (PII, paths, content sentinels)', () => {
    // Build a newState using safe metadata
    const newState = buildExportAuditNewState(validExportMetadata({
      archiveId: 'archive-uuid-safe',
    }));

    const serialized = JSON.stringify(newState);

    for (const sentinel of forbiddenSubstrings) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it('T3b: serialized newState with contaminated input still has no forbidden substrings', () => {
    // Even if someone injects forbidden data as extra fields, they must not leak
    const contaminatedInput = {
      ...validExportMetadata({ archiveId: 'safe-archive-id' }),
      objectKey: 'workspaces/100/exports/leak.txt',
      txtContent: '6100|REGISTRO CONTABIL 123.456.789-00',
      content: 'PAGAMENTO ALUGUEL MAIO CLIENTE REAL',
      cpf: '123.456.789-00',
      cnpj: '12.345.678/0001-99',
      email: 'cliente.real@example.com',
      customerName: 'João Cliente Real',
      bucket: 'wsp-finance-vault',
      rawPayload: 'r2://bucket/private/storage/key',
      storagePath: 's3://bucket/exports/file.txt',
    } as any;

    const newState = buildExportAuditNewState(contaminatedInput);
    const serialized = JSON.stringify(newState);

    for (const sentinel of forbiddenSubstrings) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it('T4: fileName in safe pattern is allowed in newState', () => {
    const safeFileName = 'wsp-dominio-2026-05-01_2026-05-31.txt';
    const newState = buildExportAuditNewState(validExportMetadata({
      fileName: safeFileName,
      archiveId: 'archive-uuid-for-filename-test',
    }));

    // fileName ending in .txt IS allowed (it's a system-generated safe name)
    expect(newState.fileName).toBe(safeFileName);
    expect(newState.fileName).toMatch(/^wsp-dominio-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.txt$/);
  });

  it('creates a real AuditLog row with AuditAction.EXPORT and safe metadata only', async () => {
    const { user, workspace } = await createAuditActor();
    const newState = buildExportAuditNewState(validExportMetadata());

    await AuditLogService.logSync({
      userId: user.id,
      workspaceId: workspace.id,
      action: AuditAction.EXPORT,
      entity: 'AccountingExport',
      entityId: exportEntityId,
      newState,
    }, managementClient as AuditLogServiceClient);

    const auditLog = await managementClient.auditLog.findFirstOrThrow({
      where: { entity: 'AccountingExport', entityId: exportEntityId },
    });

    expect(auditLog.action).toBe(AuditAction.EXPORT);
    expect(auditLog.newState).toEqual(newState);
    expect((auditLog.newState as Record<string, unknown>).fileHash).toBe(newState.fileHash);

    for (const field of forbiddenNewStateFields) {
      expect(auditLog.newState).not.toHaveProperty(field);
    }
  });

  it('continues to create AuditLog rows with the existing CREATE action', async () => {
    const { user, workspace } = await createAuditActor();

    await AuditLogService.logSync({
      userId: user.id,
      workspaceId: workspace.id,
      action: AuditAction.CREATE,
      entity: 'AccountingExport',
      entityId: createEntityId,
      newState: { status: 'created' },
    }, managementClient as AuditLogServiceClient);

    const auditLog = await managementClient.auditLog.findFirstOrThrow({
      where: { entity: 'AccountingExport', entityId: createEntityId },
    });

    expect(auditLog.action).toBe(AuditAction.CREATE);
    expect(auditLog.newState).toEqual({ status: 'created' });
  });
});
