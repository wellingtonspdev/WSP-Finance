import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { prisma } from '../../src/lib/prisma';
import { getJwtSecret } from '../../src/config/authEnv';

const repositoryMocks = vi.hoisted(() => ({
  findDetailByIdAndWorkspace: vi.fn(),
  findByIdAndWorkspace: vi.fn(),
  findManyByWorkspace: vi.fn(),
  findManyByUserId: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../src/lib/tenantContext', () => ({
  tenantContext: {
    getStore: vi.fn(),
    run: vi.fn((_store: any, fn: () => void) => fn()),
  },
}));

vi.mock('../../src/repositories/TransactionRepository', () => ({
  TransactionRepository: class {
    findDetailByIdAndWorkspace = repositoryMocks.findDetailByIdAndWorkspace;
    findByIdAndWorkspace = repositoryMocks.findByIdAndWorkspace;
    findManyByWorkspace = repositoryMocks.findManyByWorkspace;
    findManyByUserId = repositoryMocks.findManyByUserId;
    create = repositoryMocks.create;
    delete = repositoryMocks.delete;
  },
}));

vi.mock('../../src/repositories/AccountRepository', () => ({
  AccountRepository: class {
    findByIdAndWorkspace = vi.fn();
    updateBalance = vi.fn();
  },
}));

vi.mock('../../src/repositories/CategoryRepository', () => ({
  CategoryRepository: class {
    findByIdAndWorkspace = vi.fn();
  },
}));

vi.mock('../../src/services/OutboxService', () => ({
  OutboxService: class {
    enqueueInTransaction = vi.fn();
  },
}));

vi.mock('../../src/services/AuditLogService', () => ({
  AuditLogService: {
    logSync: vi.fn(),
    logAsync: vi.fn(),
  },
}));

vi.mock('../../src/lib/checkEnvironment', () => ({
  checkPrivileges: vi.fn(),
}));

const makeToken = (id: number) => jwt.sign({ sub: String(id), email: 'test@wsp.com' }, getJwtSecret());

describe('GET /transactions/:id', () => {
  const userId = 1;
  const workspaceId = 1998;
  const transactionId = '123e4567-e89b-12d3-a456-426614174000';

  const transactionDetail = {
    id: transactionId,
    description: 'Compra de material',
    amount: 120.5,
    date: new Date('2026-05-01T10:00:00.000Z'),
    type: 'EXPENSE',
    isPaid: true,
    status: 'COMPLETED',
    accountId: 11,
    categoryId: 22,
    workspaceId,
    category: { name: 'Material', icon: 'tag', color: '#2563eb' },
    account: { name: 'Conta PJ' },
    aiInsights: [
      {
        id: 'insight-1',
        transactionId,
        severity: 'WARNING',
        code: 'MISTURA_PATRIMONIAL',
        message: 'Ponto para revisar',
        reason: 'Contexto educativo',
        confidence: '0.7000',
        dismissed: false,
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      },
    ],
    createdAt: new Date('2026-05-01T10:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 10,
      userId,
      workspaceId,
      role: 'VIEWER',
      joinedAt: new Date(),
      workspace: { type: 'BUSINESS' },
    } as any);
  });

  it('T01 - returns 401 without auth', async () => {
    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(401);
    expect(repositoryMocks.findDetailByIdAndWorkspace).not.toHaveBeenCalled();
  });

  it('T02 - returns 400 without x-workspace-id', async () => {
    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(400);
    expect(repositoryMocks.findDetailByIdAndWorkspace).not.toHaveBeenCalled();
  });

  it('T03 - returns 403 when user is not a workspace member', async () => {
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(403);
    expect(repositoryMocks.findDetailByIdAndWorkspace).not.toHaveBeenCalled();
  });

  it('T04 - returns 404 for an unknown transaction', async () => {
    repositoryMocks.findDetailByIdAndWorkspace.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found|access denied/i);
    expect(repositoryMocks.findDetailByIdAndWorkspace).toHaveBeenCalledWith(transactionId, workspaceId);
  });

  it('T05 - returns 404 for a transaction from another workspace without enumeration', async () => {
    repositoryMocks.findDetailByIdAndWorkspace.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Transaction not found or access denied');
    expect(repositoryMocks.findDetailByIdAndWorkspace).toHaveBeenCalledWith(transactionId, workspaceId);
  });

  it('T06 - returns 200 for a readable transaction and uses id plus workspaceId', async () => {
    repositoryMocks.findDetailByIdAndWorkspace.mockResolvedValueOnce(transactionDetail);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(transactionId);
    expect(res.body.description).toBe(transactionDetail.description);
    expect(res.body.aiInsights).toHaveLength(1);
    expect(repositoryMocks.findDetailByIdAndWorkspace).toHaveBeenCalledWith(transactionId, workspaceId);
  });

  it('T07 - returns a safe DTO without AI internals', async () => {
    repositoryMocks.findDetailByIdAndWorkspace.mockResolvedValueOnce(transactionDetail);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    const insight = res.body.aiInsights[0];
    expect(insight).not.toHaveProperty('prompt');
    expect(insight).not.toHaveProperty('rawResponse');
    expect(insight).not.toHaveProperty('outboxPayload');
    expect(insight).not.toHaveProperty('providerInput');
  });

  it('T08 - does not mutate transaction, ledger, balance, or account data', async () => {
    repositoryMocks.findDetailByIdAndWorkspace.mockResolvedValueOnce(transactionDetail);

    const res = await request(app)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(repositoryMocks.findDetailByIdAndWorkspace).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.create).not.toHaveBeenCalled();
    expect(repositoryMocks.delete).not.toHaveBeenCalled();
    expect(repositoryMocks.findByIdAndWorkspace).not.toHaveBeenCalled();
  });
});
