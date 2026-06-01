import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';
import { getJwtSecret } from '../../src/config/authEnv';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    exportArchive: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  sysPrisma: {},
}));

const { mockListByWorkspace, mockGetDownloadUrl } = vi.hoisted(() => {
  return {
    mockListByWorkspace: vi.fn(),
    mockGetDownloadUrl: vi.fn(),
  };
});

vi.mock('../../src/services/ExportArchiveService', () => {
  return {
    ExportArchiveService: class {
      archiveAndLog = vi.fn();
      listByWorkspace = mockListByWorkspace;
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

const JWT_SECRET = getJwtSecret();
const USER_ID = 999;
const WS_ID = 10;
const HISTORY_URL = `/workspaces/${WS_ID}/exports`;

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

describe('GET /workspaces/:workspaceId/exports', () => {
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    token = makeToken();

    mockListByWorkspace.mockResolvedValue([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        workspaceId: WS_ID,
        layoutId: 'dominio-separated-v1',
        targetSystem: 'DOMINIO',
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-01-31T23:59:59.000Z',
        fileName: 'wsp-dominio.txt',
        hash: 'abc123',
        sizeBytes: 123,
        recordCount: 10,
        contentType: 'text/plain; charset=windows-1252',
        encoding: 'windows-1252',
        warningsCount: 1,
        retentionUntil: '2031-01-01T00:00:00.000Z',
        createdAt: '2026-02-01T10:00:00.000Z',
        status: 'AVAILABLE',
        createdByUser: { id: USER_ID, name: 'Ana', email: 'ana@example.com' },
      },
    ]);
  });

  it('returns 200 for OWNER with safe export history', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        layoutId: 'dominio-separated-v1',
        recordCount: 10,
        warningsCount: 1,
        hash: 'abc123',
        status: 'AVAILABLE',
      })
    );
    expect(mockListByWorkspace).toHaveBeenCalledWith(WS_ID);
  });

  it('returns 200 for ACCOUNTANT', async () => {
    mockMembership('ACCOUNTANT');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('createdByUser');
  });

  it('returns 403 for EDITOR', async () => {
    mockMembership('EDITOR');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('returns 403 for VIEWER', async () => {
    mockMembership('VIEWER');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .get(HISTORY_URL)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(401);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('returns 403 when x-workspace-id diverges from route param', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', '999');

    expect(res.status).toBe(403);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('works when x-workspace-id header is absent and route param is valid', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockListByWorkspace).toHaveBeenCalledWith(WS_ID);
  });

  it('returns 400 for invalid route workspace id', async () => {
    const res = await request(app)
      .get('/workspaces/abc/exports')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('returns 403 for non-member', async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    expect(res.status).toBe(403);
    expect(mockListByWorkspace).not.toHaveBeenCalled();
  });

  it('response body never contains storage internals', async () => {
    mockMembership('OWNER');

    const res = await request(app)
      .get(HISTORY_URL)
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', String(WS_ID));

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('objectKey');
    expect(serialized).not.toContain('bucket');
    expect(serialized).not.toContain('buffer');
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('workspaces/');
    expect(serialized).not.toContain('exports/');
  });
});
