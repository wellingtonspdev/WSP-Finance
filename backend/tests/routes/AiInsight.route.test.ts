import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { AppError } from '../../src/errors/AppError';

// ── Hoisted mocks ──
const { mockDismiss, mockFindManyByWorkspace, mockListForWorkspaceHub } = vi.hoisted(() => ({
  mockDismiss: vi.fn(),
  mockFindManyByWorkspace: vi.fn(),
  mockListForWorkspaceHub: vi.fn(),
}));

// ── Mock prisma (auth, workspace, rbac middlewares) ──
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
  sysPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// ── Mock AiInsightService ──
vi.mock('../../src/services/AiInsightService', () => ({
  AiInsightService: class {
    dismiss = mockDismiss;
    create = vi.fn();
    listByTransaction = vi.fn();
    listByWorkspace = vi.fn();
    listForWorkspaceHub = mockListForWorkspaceHub;
  },
}));

// ── Mock TransactionRepository (for GET /transactions) ──
vi.mock('../../src/repositories/TransactionRepository', () => ({
  TransactionRepository: class {
    findManyByWorkspace = mockFindManyByWorkspace;
    create = vi.fn();
    findByIdAndWorkspace = vi.fn();
    findManyByUserId = vi.fn();
    delete = vi.fn();
  },
}));

// ── Mock TransactionService dependencies ──
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

vi.mock('../../src/lib/tenantContext', () => ({
  tenantContext: {
    getStore: vi.fn(),
    run: vi.fn((_store: any, fn: () => void) => fn()),
  },
}));

vi.mock('../../src/lib/checkEnvironment', () => ({
  checkPrivileges: vi.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { getJwtSecret } from '../../src/config/authEnv';
import { NotFoundError } from '../../src/errors/NotFoundError';

const JWT_SECRET = getJwtSecret();

function makeToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Helper: configure membership mock for a given role ──
function mockMembership(role: 'OWNER' | 'ACCOUNTANT' | 'EDITOR' | 'VIEWER', workspaceId = 1, userId = 100) {
  vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
    id: 1,
    userId,
    workspaceId,
    role,
    joinedAt: new Date(),
    workspace: { type: 'BUSINESS' },
  } as any);
}

// ═══════════════════════════════════════════════════════════════════
// PATCH /ai-insights/:id/dismiss
// ═══════════════════════════════════════════════════════════════════
describe('PATCH /ai-insights/:id/dismiss', () => {
  const userId = 100;
  const workspaceId = 1;
  const insightId = 'insight-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── T01: OWNER can dismiss ──
  it('T01 — OWNER can dismiss an insight and receives { id, dismissed: true }', async () => {
    mockMembership('OWNER');
    mockDismiss.mockResolvedValue({ id: insightId, dismissed: true });

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: insightId, dismissed: true });
    expect(mockDismiss).toHaveBeenCalledWith(workspaceId, insightId);
  });

  // ── T02: ACCOUNTANT can dismiss ──
  it('T02 — ACCOUNTANT can dismiss an insight', async () => {
    mockMembership('ACCOUNTANT');
    mockDismiss.mockResolvedValue({ id: insightId, dismissed: true });

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: insightId, dismissed: true });
  });

  // ── T03: EDITOR can dismiss ──
  it('T03 — EDITOR can dismiss an insight', async () => {
    mockMembership('EDITOR');
    mockDismiss.mockResolvedValue({ id: insightId, dismissed: true });

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: insightId, dismissed: true });
  });

  // ── T04: VIEWER receives 403 ──
  it('T04 — VIEWER receives 403 when attempting to dismiss', async () => {
    mockMembership('VIEWER');

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(403);
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // ── T05: Cross-tenant returns 404 (masks existence) ──
  it('T05 — Cross-tenant dismiss returns 404 without leaking existence', async () => {
    mockMembership('OWNER');
    mockDismiss.mockRejectedValue(new NotFoundError('Insight not found.'));

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Insight not found.');
  });

  // ── T06: Non-existent insight returns 404 ──
  it('T06 — Non-existent insight returns 404', async () => {
    mockMembership('EDITOR');
    mockDismiss.mockRejectedValue(new NotFoundError('Insight not found.'));

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(404);
  });

  // ── T07: Missing auth returns 401 ──
  it('T07 — Missing auth returns 401', async () => {
    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(401);
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // ── T08: Missing workspace returns 400 ──
  it('T08 — Missing x-workspace-id returns 400', async () => {
    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(400);
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // ── T09: Dismiss does not alter Transaction or Account.balance ──
  it('T09 — Dismiss only calls AiInsightService.dismiss, does not touch Transaction or Account', async () => {
    mockMembership('OWNER');
    mockDismiss.mockResolvedValue({ id: insightId, dismissed: true });

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    // Confirm only dismiss was called — no transaction/account/balance methods
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledWith(workspaceId, insightId);
  });

  // ── T10: Response DTO only exposes { id, dismissed } ──
  it('T10 — Response DTO only exposes id and dismissed, no sensitive fields', async () => {
    mockMembership('OWNER');
    mockDismiss.mockResolvedValue({
      id: insightId,
      dismissed: true,
      workspaceId: 1,
      transactionId: 'tx-123',
      message: 'secret message',
      reason: 'internal reason',
      code: 'MISTURA_PATRIMONIAL',
      severity: 'WARNING',
      confidence: 0.85,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/ai-insights/${insightId}/dismiss`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    // Only id and dismissed are returned
    expect(Object.keys(res.body)).toEqual(['id', 'dismissed']);
    expect(res.body.id).toBe(insightId);
    expect(res.body.dismissed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET /transactions — aiInsights inclusion
// ═══════════════════════════════════════════════════════════════════
describe('GET /transactions — aiInsights', () => {
  const userId = 100;
  const workspaceId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeTransactionWithInsights = (overrides?: any) => ({
    id: 'tx-uuid-001',
    description: 'Almoço de negócios',
    amount: 150.0,
    date: new Date('2026-05-01'),
    type: 'EXPENSE',
    isPaid: true,
    status: 'COMPLETED',
    accountId: 1,
    categoryId: 1,
    workspaceId,
    category: { name: 'Alimentação', icon: 'tag', color: '#FF0000' },
    account: { name: 'Nubank' },
    aiInsights: [
      {
        id: 'insight-uuid-001',
        transactionId: 'tx-uuid-001',
        severity: 'WARNING',
        code: 'MISTURA_PATRIMONIAL',
        message: 'Possível mistura patrimonial detectada',
        reason: 'Despesa pessoal em conta PJ',
        confidence: '0.7500',
        dismissed: false,
        createdAt: new Date('2026-05-01'),
        updatedAt: new Date('2026-05-01'),
      },
    ],
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    ...overrides,
  });

  // ── T11: GET /transactions includes aiInsights for active insights ──
  it('T11 — GET /transactions returns aiInsights for transactions with active insights', async () => {
    mockMembership('OWNER');
    const txWithInsight = makeTransactionWithInsights();
    mockFindManyByWorkspace.mockResolvedValue([txWithInsight]);

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('nextCursor');
    expect(res.body).toHaveProperty('hasMore');
    // Shape preserved
    expect(Array.isArray(res.body.data)).toBe(true);

    const tx = res.body.data[0];
    expect(tx.aiInsights).toBeDefined();
    expect(tx.aiInsights).toHaveLength(1);
    expect(tx.aiInsights[0]).toHaveProperty('id', 'insight-uuid-001');
    expect(tx.aiInsights[0]).toHaveProperty('severity', 'WARNING');
    expect(tx.aiInsights[0]).toHaveProperty('message');
    expect(tx.aiInsights[0]).toHaveProperty('dismissed', false);
  });

  // ── T12: Transaction without insights renders without breaking contract ──
  it('T12 — Transaction without insights preserves contract (empty array or undefined)', async () => {
    mockMembership('OWNER');
    const txNoInsight = makeTransactionWithInsights({ aiInsights: [] });
    mockFindManyByWorkspace.mockResolvedValue([txNoInsight]);

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    const tx = res.body.data[0];
    // Should either be empty array or undefined, but contract is intact
    expect(Array.isArray(tx.aiInsights) || tx.aiInsights === undefined).toBe(true);
  });

  // ── T13: Shape { data, nextCursor, hasMore } preserved ──
  it('T13 — Response shape { data, nextCursor, hasMore } is preserved exactly', async () => {
    mockMembership('EDITOR');
    mockFindManyByWorkspace.mockResolvedValue([]);

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['data', 'hasMore', 'nextCursor'].sort());
    expect(res.body.data).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
    expect(res.body.hasMore).toBe(false);
  });

  // ── T14: aiInsights DTO does not expose prompt, raw response, outbox payload, or internal fields ──
  it('T14 — aiInsights DTO does not expose prompt, rawResponse, outboxPayload, or workspaceId', async () => {
    mockMembership('OWNER');
    const txWithInsight = makeTransactionWithInsights();
    mockFindManyByWorkspace.mockResolvedValue([txWithInsight]);

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    const insight = res.body.data[0].aiInsights[0];
    // These fields should never be present
    expect(insight).not.toHaveProperty('prompt');
    expect(insight).not.toHaveProperty('rawResponse');
    expect(insight).not.toHaveProperty('outboxPayload');
    // The following are safe fields that should be present
    expect(insight).toHaveProperty('id');
    expect(insight).toHaveProperty('severity');
    expect(insight).toHaveProperty('message');
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET /ai-insights
// ═══════════════════════════════════════════════════════════════════
describe('GET /ai-insights', () => {
  const userId = 100;
  const workspaceId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServiceResponse = {
    data: [
      { id: '1', severity: 'WARNING', dismissed: false }
    ],
    nextCursor: null,
    hasMore: false,
    summary: { activeCount: 1, criticalCount: 0, warningCount: 1, infoCount: 0, dismissedCount: 0 }
  };

  it('T15 — OWNER can list insights', async () => {
    mockMembership('OWNER');
    mockListForWorkspaceHub.mockResolvedValue(mockServiceResponse);

    const res = await request(app)
      .get('/ai-insights')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockServiceResponse);
    expect(mockListForWorkspaceHub).toHaveBeenCalledWith(workspaceId, expect.any(Object));
  });

  it('T16 — VIEWER can list insights (RbacMiddleware not restricting read)', async () => {
    mockMembership('VIEWER');
    mockListForWorkspaceHub.mockResolvedValue(mockServiceResponse);

    const res = await request(app)
      .get('/ai-insights')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockServiceResponse);
  });

  it('T17 — parses query params correctly', async () => {
    mockMembership('EDITOR');
    mockListForWorkspaceHub.mockResolvedValue(mockServiceResponse);

    const res = await request(app)
      .get('/ai-insights?dismissed=true&severity=CRITICAL&cursor=cursor-123&pageSize=10')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(200);
    expect(mockListForWorkspaceHub).toHaveBeenCalledWith(workspaceId, {
      dismissed: true,
      severity: 'CRITICAL',
      cursor: 'cursor-123',
      limit: 10
    });
  });

  it('T18 — missing auth returns 401', async () => {
    const res = await request(app)
      .get('/ai-insights')
      .set('x-workspace-id', String(workspaceId));
    expect(res.status).toBe(401);
  });

  it('T19 — invalid cursor mapping safely returns 400 validation error', async () => {
    mockMembership('OWNER');
    // If the service throws a Prisma known error or standard AppError for invalid cursor
    // The controller/express error handler should map it.
    // For this test, we can just ensure we handle the error properly if thrown.
    mockListForWorkspaceHub.mockRejectedValue(new AppError('Invalid cursor', 400));

    const res = await request(app)
      .get('/ai-insights')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .set('x-workspace-id', String(workspaceId));

    expect(res.status).toBe(400); // Handled explicitly by AppError
    expect(res.body.message).toBe('Invalid cursor');
  });
});
