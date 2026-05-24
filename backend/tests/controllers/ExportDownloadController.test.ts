import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';
import { getJwtSecret } from '../../src/config/authEnv';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    exportArchive: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  sysPrisma: {},
}));

const { mockGetDownloadUrl } = vi.hoisted(() => {
  return {
    mockGetDownloadUrl: vi.fn(),
  };
});

vi.mock('../../src/services/ExportArchiveService', () => {
  return {
    ExportArchiveService: class {
      archiveAndLog = vi.fn();
      getDownloadUrl = mockGetDownloadUrl;
    },
  };
});

vi.mock('../../src/providers/S3StorageProvider', () => {
  return {
    S3StorageProvider: class {},
  };
});

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: {
    logSync: vi.fn().mockResolvedValue(undefined),
    logAsync: vi.fn().mockResolvedValue(undefined),
  },
  buildExportAuditNewState: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const JWT_SECRET = getJwtSecret();
const USER_ID = 999;
const WS_ID = 10;
const ARCHIVE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function makeToken(userId = USER_ID) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

function mockMembership(role: string, wsId = WS_ID) {
  (prisma.workspaceMember.findUnique as any).mockResolvedValue({
    id: 1,
    userId: USER_ID,
    workspaceId: wsId,
    role,
    workspace: { type: 'BUSINESS' },
  });
}

const DOWNLOAD_URL = `/workspaces/${WS_ID}/exports/${ARCHIVE_ID}/download`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /workspaces/:workspaceId/exports/:archiveId/download', () => {
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    token = makeToken();

    mockGetDownloadUrl.mockResolvedValue({
      url: 'https://r2.example.com/presigned',
      expiresInSeconds: 900,
      fileName: 'export.txt',
      contentType: 'text/plain; charset=windows-1252',
    });
  });

  // ========================================================================
  // C01: 200 — OWNER
  // ========================================================================
  it('C01 - OWNER gets 200 with download URL', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        url: expect.any(String),
        expiresInSeconds: expect.any(Number),
        fileName: expect.any(String),
        contentType: expect.any(String),
      })
    );
  });

  // ========================================================================
  // C02: 200 — ACCOUNTANT
  // ========================================================================
  it('C02 - ACCOUNTANT gets 200 with download URL', async () => {
    mockMembership('ACCOUNTANT');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
  });

  // ========================================================================
  // C03: 403 — EDITOR blocked
  // ========================================================================
  it('C03 - EDITOR gets 403', async () => {
    mockMembership('EDITOR');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C04: 403 — VIEWER blocked
  // ========================================================================
  it('C04 - VIEWER gets 403', async () => {
    mockMembership('VIEWER');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C05: 401 — no token
  // ========================================================================
  it('C05 - no token returns 401', async () => {
    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(401);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C06: 404 — archive not found
  // ========================================================================
  it('C06 - archive not found returns 404', async () => {
    mockMembership('OWNER');

    const { NotFoundError } = await import('../../src/errors/NotFoundError');
    mockGetDownloadUrl.mockRejectedValueOnce(new NotFoundError());

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(404);
  });

  // ========================================================================
  // C07: 503 — provider failure
  // ========================================================================
  it('C07 - provider failure returns 503', async () => {
    mockMembership('OWNER');

    const { ServiceUnavailableError } = await import('../../src/errors/ServiceUnavailableError');
    mockGetDownloadUrl.mockRejectedValueOnce(new ServiceUnavailableError());

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(503);
  });

  // ========================================================================
  // C08: 403 — x-workspace-id diverges from :workspaceId
  // ========================================================================
  it('C08 - divergent x-workspace-id header returns 403', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', '999'); // Diverges from WS_ID=10

    expect(res.status).toBe(403);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C09: Header absent + route param valid → works
  // ========================================================================
  it('C09 - absent x-workspace-id header with valid route param works', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`);
      // Note: no x-workspace-id header

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
  });

  // ========================================================================
  // C10: Response never contains objectKey, bucket
  // ========================================================================
  it('C10 - response body never contains objectKey, bucket, buffer, base64', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('objectKey');
    expect(res.body).not.toHaveProperty('bucket');
    expect(res.body).not.toHaveProperty('buffer');
    expect(res.body).not.toHaveProperty('base64');
    expect(res.body).not.toHaveProperty('path');
  });

  // ========================================================================
  // C11: Provider NOT called on 401/403/404
  // ========================================================================
  it('C11 - provider not called when auth fails (401)', async () => {
    await request(app)
      .get(DOWNLOAD_URL)
      .set('x-workspace-id', String(WS_ID));

    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  it('C11b - provider not called when RBAC fails (403)', async () => {
    mockMembership('VIEWER');

    await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  it('C11c - provider not called when header diverges (403)', async () => {
    mockMembership('OWNER');

    await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', '999');

    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C12: Invalid archiveId format returns 400
  // ========================================================================
  it('C12 - invalid archiveId (not UUID) returns 400', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(`/workspaces/${WS_ID}/exports/not-a-uuid/download`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(400);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C13: Invalid workspaceId in route returns 400
  // ========================================================================
  it('C13 - invalid workspaceId in route returns 400', async () => {
    const res = await request(app)
      .get(`/workspaces/abc/exports/${ARCHIVE_ID}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });

  // ========================================================================
  // C14: Non-member gets 403 from WorkspaceMiddleware
  // ========================================================================
  it('C14 - non-member gets 403', async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .get(DOWNLOAD_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockGetDownloadUrl).not.toHaveBeenCalled();
  });
});
