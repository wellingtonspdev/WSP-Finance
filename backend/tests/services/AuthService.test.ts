import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../src/controllers/AuthController';
import { AuthMiddleware } from '../../src/middlewares/AuthMiddleware';
import { getJwtSecret } from '../../src/config/authEnv';

const mockUserRepository = {
  findByEmail: vi.fn(),
  createWithWorkspace: vi.fn(),
  findByEmailWithWorkspaces: vi.fn(),
  findByIdWithWorkspaces: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshTokenById: vi.fn(),
  deleteRefreshToken: vi.fn(),
};

const mockGetCachedDashboard = vi.fn();
const mockRefreshCache = vi.fn();

vi.mock('../../src/repositories/UserRepository', () => ({
  UserRepository: class {
    constructor() {
      return mockUserRepository;
    }
  },
}));

vi.mock('../../src/services/VerificationService', () => ({
  VerificationService: class {
    constructor() {
      return {
        sendVerificationCode: vi.fn(),
      };
    }
  },
}));

vi.mock('../../src/services/AccountantCacheService', () => ({
  AccountantCacheService: class {
    constructor() {
      return {
        getCachedDashboard: mockGetCachedDashboard,
        refreshCache: mockRefreshCache,
      };
    }
  },
}));

describe('AuthService HTTP flow', () => {
  const jwtSecret = getJwtSecret();
  const password = 'password123';
  let passwordHash: string;
  let server: ReturnType<typeof appListen>;
  let baseUrl: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 8);

    const app = express();
    const authController = new AuthController();

    app.use(express.json());
    app.post('/auth/session', (req, res) => authController.authenticate(req, res));
    app.get('/auth/me', AuthMiddleware, (req, res) => authController.me(req, res));

    server = appListen(app);
    baseUrl = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.instance.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a complete dashboardCache on the first login response when cache is cold', async () => {
    mockUserRepository.findByEmailWithWorkspaces.mockResolvedValue(buildAccountantUser(passwordHash));
    mockUserRepository.createRefreshToken.mockResolvedValue({
      id: 'refresh-cold',
      userId: 1,
      expiresIn: 9_999_999_999,
    });

    mockGetCachedDashboard
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(buildDashboardCache([1, 3]));
    mockRefreshCache.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditoria@wsp.finance', password }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user.systemRole).toBe('USER');
    expect(payload.dashboardCache).toHaveLength(2);
    expect(payload.dashboardCache.map((entry: { workspaceId: number }) => entry.workspaceId).sort()).toEqual([1, 3]);
    expect(mockGetCachedDashboard).toHaveBeenCalledTimes(2);
    expect(mockRefreshCache).toHaveBeenCalledTimes(1);
  });

  it('returns systemRole ADMIN on the login response for an admin user', async () => {
    mockUserRepository.findByEmailWithWorkspaces.mockResolvedValue(
      buildAccountantUser(passwordHash, 'ADMIN'),
    );
    mockUserRepository.createRefreshToken.mockResolvedValue({
      id: 'refresh-admin',
      userId: 1,
      expiresIn: 9_999_999_999,
    });

    mockGetCachedDashboard.mockResolvedValue(buildDashboardCache([1, 3]));
    mockRefreshCache.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditoria@wsp.finance', password }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user.systemRole).toBe('ADMIN');
    expect(payload.user.memberships.map((membership: { role: string }) => membership.role)).toEqual([
      'OWNER',
      'ACCOUNTANT',
    ]);
  });

  it('repairs a partial cache and filters out stale workspaces before returning the login payload', async () => {
    mockUserRepository.findByEmailWithWorkspaces.mockResolvedValue(buildAccountantUser(passwordHash));
    mockUserRepository.createRefreshToken.mockResolvedValue({
      id: 'refresh-partial',
      userId: 1,
      expiresIn: 9_999_999_999,
    });

    mockGetCachedDashboard
      .mockResolvedValueOnce(buildDashboardCache([1]))
      .mockResolvedValueOnce([
        ...buildDashboardCache([1, 3]),
        ...buildDashboardCache([999]),
      ]);
    mockRefreshCache.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditoria@wsp.finance', password }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dashboardCache).toHaveLength(2);
    expect(payload.dashboardCache.map((entry: { workspaceId: number }) => entry.workspaceId).sort()).toEqual([1, 3]);
    expect(payload.dashboardCache.find((entry: { workspaceId: number }) => entry.workspaceId === 999)).toBeUndefined();
    expect(mockGetCachedDashboard).toHaveBeenCalledTimes(2);
    expect(mockRefreshCache).toHaveBeenCalledTimes(1);
  });

  it('exposes dashboardCache in /auth/me for an authenticated accountant', async () => {
    mockUserRepository.findByIdWithWorkspaces.mockResolvedValue(buildAccountantUser(passwordHash));
    mockGetCachedDashboard.mockResolvedValue(buildDashboardCache([1, 3]));
    mockRefreshCache.mockResolvedValue(undefined);

    const accessToken = jwt.sign({}, jwtSecret, {
      subject: '1',
      expiresIn: '15m',
    });

    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.type).toBe('ACCOUNTANT');
    expect(payload.systemRole).toBe('USER');
    expect(payload.dashboardCache).toHaveLength(2);
    expect(payload.dashboardCache.map((entry: { workspaceId: number }) => entry.workspaceId).sort()).toEqual([1, 3]);
    expect(mockRefreshCache).toHaveBeenCalledTimes(1);
  });
});

function appListen(app: express.Express) {
  const instance = app.listen(0);
  const port = (instance.address() as AddressInfo).port;

  return {
    instance,
    port,
  };
}

function buildAccountantUser(passwordHash: string, systemRole: 'USER' | 'ADMIN' = 'USER') {
  return {
    id: 1,
    name: 'Wellington Contador',
    email: 'auditoria@wsp.finance',
    passwordHash,
    type: 'ACCOUNTANT' as const,
    systemRole,
    emailVerifiedAt: new Date('2026-04-13T18:57:07.827Z'),
    memberships: [
      {
        role: 'OWNER' as const,
        workspace: {
          id: 1,
          name: 'Workspace Pessoal',
          type: 'PERSONAL' as const,
          closedUntil: null,
        },
      },
      {
        role: 'ACCOUNTANT' as const,
        workspace: {
          id: 3,
          name: 'João Business',
          type: 'BUSINESS' as const,
          closedUntil: null,
        },
      },
    ],
  };
}

function buildDashboardCache(workspaceIds: number[]) {
  return workspaceIds.map((workspaceId, index) => ({
    id: workspaceId,
    userId: 1,
    workspaceId,
    pendingMovements: index + 1,
    missingAttachments: index,
    cashRiskAlert: false,
    totalBalance: '1000.00',
    updatedAt: new Date('2026-04-20T12:00:00.000Z').toISOString(),
  }));
}
