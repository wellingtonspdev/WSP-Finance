import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { sysPrisma } from '../../src/lib/prisma';

const { mockRefreshCache, mockGetCachedDashboard } = vi.hoisted(() => ({
  mockRefreshCache: vi.fn(),
  mockGetCachedDashboard: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {},
  sysPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/AccountantCacheService', () => ({
  AccountantCacheService: vi.fn().mockImplementation(function AccountantCacheServiceMock() {
    return {
    refreshCache: mockRefreshCache,
    getCachedDashboard: mockGetCachedDashboard,
    };
  }),
}));

import { getJwtSecret } from '../../src/config/authEnv';

const JWT_SECRET = getJwtSecret();

function makeToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /accountant/cache/refresh', () => {
  const userId = 777;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sysPrisma.user.findUnique).mockResolvedValue({ type: 'ACCOUNTANT' } as any);
    mockRefreshCache.mockResolvedValue({ ok: true, workspacesProcessed: 2, errors: [] });
    mockGetCachedDashboard.mockResolvedValue([
      {
        id: 1,
        userId,
        workspaceId: 10,
        pendingMovements: 2,
        missingAttachments: 1,
        cashRiskAlert: false,
        totalBalance: '100.00',
        updatedAt: new Date('2026-05-03T12:00:00.000Z'),
        certificateExpiresAt: null,
      },
    ]);
  });

  it('refreshes the authenticated accountant cache and returns the updated dashboard cache', async () => {
    const response = await request(app)
      .post('/accountant/cache/refresh')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dashboardCache: [
        expect.objectContaining({
          userId,
          workspaceId: 10,
          updatedAt: '2026-05-03T12:00:00.000Z',
        }),
      ],
      result: { ok: true, workspacesProcessed: 2, errors: [] },
    });
    expect(mockRefreshCache).toHaveBeenCalledWith(userId);
    expect(mockGetCachedDashboard).toHaveBeenCalledWith(userId);
  });

  it('rejects authenticated non-accountant users', async () => {
    vi.mocked(sysPrisma.user.findUnique).mockResolvedValue({ type: 'CLIENT' } as any);

    const response = await request(app)
      .post('/accountant/cache/refresh')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Apenas contadores podem atualizar este cache');
    expect(mockRefreshCache).not.toHaveBeenCalled();
  });

  it('returns 404 when the authenticated user no longer exists', async () => {
    vi.mocked(sysPrisma.user.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .post('/accountant/cache/refresh')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Usuário não encontrado');
    expect(mockRefreshCache).not.toHaveBeenCalled();
  });
});
