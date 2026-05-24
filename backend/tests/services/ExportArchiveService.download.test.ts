import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportArchiveService } from '../../src/services/ExportArchiveService';
import { IStorageProvider } from '../../src/providers/IStorageProvider';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { ServiceUnavailableError } from '../../src/errors/ServiceUnavailableError';

// ---------------------------------------------------------------------------
// Mock prisma — tenant-scoped client
// ---------------------------------------------------------------------------
const mockFindFirst = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    exportArchive: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  sysPrisma: {},
}));

// ---------------------------------------------------------------------------
// Fake storage provider with getPresignedDownloadUrl
// ---------------------------------------------------------------------------
function createMockProvider(): IStorageProvider & {
  getPresignedDownloadUrl: ReturnType<typeof vi.fn>;
} {
  return {
    generateUploadUrl: vi.fn(),
    deleteFile: vi.fn(),
    getSignedDownloadUrl: vi.fn(),
    uploadBuffer: vi.fn(),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue({
      url: 'https://r2.example.com/presigned-url',
      expiresInSeconds: 900,
    }),
  };
}

// ---------------------------------------------------------------------------
// Canonical test archive record
// ---------------------------------------------------------------------------
const WORKSPACE_A = 100;
const WORKSPACE_B = 200;
const ARCHIVE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function makeArchiveRecord(overrides: Record<string, any> = {}) {
  return {
    id: ARCHIVE_ID,
    workspaceId: WORKSPACE_A,
    createdByUserId: 1,
    layoutId: 'dominio-separated-v1',
    targetSystem: 'DOMINIO',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    fileName: 'wsp-dominio-2026-01-01_2026-01-31.txt',
    objectKey: `workspaces/${WORKSPACE_A}/exports/${ARCHIVE_ID}.txt`,
    sha256: 'abc123',
    sizeBytes: 1024,
    recordCount: 50,
    contentType: 'text/plain; charset=windows-1252',
    encoding: 'windows-1252',
    warningsCount: 0,
    retentionUntil: new Date('2031-01-01'),
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ExportArchiveService.getDownloadUrl', () => {
  let provider: ReturnType<typeof createMockProvider>;
  let service: ExportArchiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = createMockProvider();
    service = new ExportArchiveService(provider);
  });

  // S01: Happy path — returns secure response shape
  it('S01 - returns { url, expiresInSeconds, fileName, contentType } on valid archive', async () => {
    mockFindFirst.mockResolvedValueOnce(makeArchiveRecord());

    const result = await service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A);

    expect(result).toEqual({
      url: expect.any(String),
      expiresInSeconds: expect.any(Number),
      fileName: 'wsp-dominio-2026-01-01_2026-01-31.txt',
      contentType: 'text/plain; charset=windows-1252',
    });
  });

  // S02: Archive not found → NotFoundError
  it('S02 - throws NotFoundError when archive does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.getDownloadUrl('non-existent-uuid', WORKSPACE_A)
    ).rejects.toThrow(NotFoundError);
  });

  // S03: Cross-tenant IDOR — archive in WS-A queried by WS-B
  it('S03 - cross-tenant: archive in WS-A not found when queried with WS-B', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // RLS + where clause blocks

    await expect(
      service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_B)
    ).rejects.toThrow(NotFoundError);
  });

  // S04: Provider NOT called when archive not found
  it('S04 - provider is NOT called when archive is not found', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A)
    ).rejects.toThrow(NotFoundError);

    expect(provider.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  // S05: Response shape never contains objectKey, bucket, buffer
  it('S05 - response never contains objectKey, bucket, buffer, base64', async () => {
    mockFindFirst.mockResolvedValueOnce(makeArchiveRecord());

    const result = await service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A);

    expect(result).not.toHaveProperty('objectKey');
    expect(result).not.toHaveProperty('bucket');
    expect(result).not.toHaveProperty('buffer');
    expect(result).not.toHaveProperty('base64');
    expect(result).not.toHaveProperty('path');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('workspaces/');
    expect(serialized).not.toContain('wsp-finance-vault');
    // Note: fileName is allowed in response, but objectKey path is not
  });

  // S06: expiresInSeconds <= 900
  it('S06 - expiresInSeconds is at most 900', async () => {
    mockFindFirst.mockResolvedValueOnce(makeArchiveRecord());

    const result = await service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A);

    expect(result.expiresInSeconds).toBeLessThanOrEqual(900);
  });

  // S07: Provider throws → ServiceUnavailableError
  it('S07 - throws ServiceUnavailableError when provider fails', async () => {
    mockFindFirst.mockResolvedValueOnce(makeArchiveRecord());
    provider.getPresignedDownloadUrl.mockRejectedValueOnce(new Error('R2 connection timeout'));

    await expect(
      service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A)
    ).rejects.toThrow(ServiceUnavailableError);
  });

  // S08: objectKey validation rejects malformed keys
  it('S08 - rejects archive with malformed objectKey', async () => {
    mockFindFirst.mockResolvedValueOnce(
      makeArchiveRecord({ objectKey: '../../../etc/passwd' })
    );

    await expect(
      service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A)
    ).rejects.toThrow(ServiceUnavailableError);

    expect(provider.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  // S09: objectKey workspace segment mismatch
  it('S09 - rejects archive whose objectKey workspace segment mismatches workspaceId', async () => {
    mockFindFirst.mockResolvedValueOnce(
      makeArchiveRecord({
        workspaceId: WORKSPACE_A,
        objectKey: `workspaces/${WORKSPACE_B}/exports/${ARCHIVE_ID}.txt`,
      })
    );

    await expect(
      service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A)
    ).rejects.toThrow(ServiceUnavailableError);

    expect(provider.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  // S10: Lookup uses both archiveId AND workspaceId
  it('S10 - prisma query uses both id and workspaceId', async () => {
    mockFindFirst.mockResolvedValueOnce(makeArchiveRecord());

    await service.getDownloadUrl(ARCHIVE_ID, WORKSPACE_A);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: ARCHIVE_ID,
        workspaceId: WORKSPACE_A,
      },
    });
  });
});
