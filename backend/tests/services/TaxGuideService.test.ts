import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { WorkspaceRole } from '@prisma/client';
import { TaxGuideService, TaxGuideStatus, TaxGuideType } from '../../src/services/TaxGuideService';
import { AppError } from '../../src/errors/AppError';

const mocks = vi.hoisted(() => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    taxGuide: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    transaction: { findFirst: vi.fn() },
  },
  auditLog: { logSync: vi.fn() },
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: mocks.prisma,
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: mocks.auditLog,
}));

const makeGuide = (overrides: Record<string, unknown> = {}) => ({
  id: 'guide-1',
  workspaceId: 10,
  type: TaxGuideType.DAS,
  competenceMonth: 5,
  competenceYear: 2026,
  dueDate: new Date('2026-06-20T00:00:00.000Z'),
  amount: new Decimal('123.45'),
  status: TaxGuideStatus.PENDING,
  guideFileObjectKey: null,
  paymentProofObjectKey: null,
  paidTransactionId: null,
  createdByUserId: 1,
  createdAt: new Date('2026-06-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  ...overrides,
});

const storageProvider = () => ({
  uploadBuffer: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getPresignedDownloadUrl: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
});

describe('TaxGuideService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.workspace.findUnique.mockResolvedValue({ type: 'BUSINESS' });
  });

  it('creates DAS and forces PENDING status', async () => {
    const guide = makeGuide();
    mocks.prisma.taxGuide.create.mockResolvedValue(guide);

    const service = new TaxGuideService(storageProvider() as any);
    const result = await service.create({
      workspaceId: 10,
      userId: 1,
      role: WorkspaceRole.ACCOUNTANT,
      type: TaxGuideType.DAS,
      competenceMonth: 5,
      competenceYear: 2026,
      dueDate: new Date('2026-06-20T00:00:00.000Z'),
      amount: '123.45',
    });

    expect(result.status).toBe(TaxGuideStatus.PENDING);
    expect(mocks.prisma.taxGuide.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TaxGuideStatus.PENDING }),
      })
    );
    expect(mocks.auditLog.logSync).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'TaxGuide',
        entityId: 'guide-1',
        newState: expect.not.objectContaining({
          guideFileObjectKey: expect.anything(),
          paymentProofObjectKey: expect.anything(),
        }),
      })
    );
  });

  it('rejects PERSONAL workspaces', async () => {
    mocks.prisma.workspace.findUnique.mockResolvedValue({ type: 'PERSONAL' });
    const service = new TaxGuideService(storageProvider() as any);

    await expect(service.create({
      workspaceId: 10,
      userId: 1,
      role: WorkspaceRole.OWNER,
      type: TaxGuideType.DAS_MEI,
      competenceMonth: 5,
      competenceYear: 2026,
      dueDate: new Date('2026-06-20T00:00:00.000Z'),
      amount: '75.00',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('prevents ACCOUNTANT from marking a guide as paid', async () => {
    const service = new TaxGuideService(storageProvider() as any);

    await expect(service.markPaid({
      workspaceId: 10,
      userId: 2,
      role: WorkspaceRole.ACCOUNTANT,
      taxGuideId: 'guide-1',
      paidTransactionId: 'f3c6e2b0-843a-4ddd-b2f4-f2baf0b86a19',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('requires paid transaction to belong to the same workspace', async () => {
    mocks.prisma.taxGuide.findFirst.mockResolvedValue(makeGuide());
    mocks.prisma.transaction.findFirst.mockResolvedValue(null);
    const service = new TaxGuideService(storageProvider() as any);

    await expect(service.markPaid({
      workspaceId: 10,
      userId: 1,
      role: WorkspaceRole.OWNER,
      taxGuideId: 'guide-1',
      paidTransactionId: 'f3c6e2b0-843a-4ddd-b2f4-f2baf0b86a19',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('uploads PDF without exposing object keys in audit state', async () => {
    const provider = storageProvider();
    mocks.prisma.taxGuide.findFirst.mockResolvedValue(makeGuide());
    mocks.prisma.taxGuide.update.mockResolvedValue(makeGuide({ guideFileObjectKey: 'workspaces/10/tax-guides/guide-1/file.pdf' }));

    const service = new TaxGuideService(provider as any);
    const result = await service.uploadGuidePdf({
      workspaceId: 10,
      userId: 1,
      role: WorkspaceRole.OWNER,
      taxGuideId: 'guide-1',
      originalName: 'das.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    });

    expect(result.hasGuideFile).toBe(true);
    expect(provider.uploadBuffer).toHaveBeenCalledWith(expect.any(Buffer), expect.stringMatching(/^workspaces\/10\/tax-guides\/guide-1\/.+\.pdf$/), 'application/pdf');
    expect(mocks.auditLog.logSync).toHaveBeenCalledWith(
      expect.objectContaining({
        newState: expect.objectContaining({
          hasGuideFile: true,
          fileSha256: expect.any(String),
        }),
      })
    );
    const auditState = mocks.auditLog.logSync.mock.calls.at(-1)?.[0].newState;
    expect(JSON.stringify(auditState)).not.toContain('workspaces/10/tax-guides');
  });
});
