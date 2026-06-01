import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { getJwtSecret } from '../../src/config/authEnv';
import { sysPrisma } from '../../src/lib/prisma';

type RouteContext = {
  userId: number;
  token: string;
  personalWorkspaceId: number;
  businessWorkspaceId: number;
  readableTransactionId: string;
  routeFixturePrefix: string;
};

function makeToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret());
}

async function resolveRouteContext(): Promise<RouteContext> {
  const joao = await sysPrisma.user.findUnique({
    where: { email: 'joao@wsp.finance' },
    include: {
      memberships: {
        include: { workspace: true },
      },
    },
  });

  if (!joao) {
    throw new Error('[Transaction.route.test] joao@wsp.finance not found. Run the demo seed before this integration test.');
  }

  const personalMembership = joao.memberships.find((membership) => membership.workspace.type === 'PERSONAL');
  const businessMembership = joao.memberships.find((membership) => membership.workspace.type === 'BUSINESS');

  if (!personalMembership || !businessMembership) {
    throw new Error('[Transaction.route.test] Joao must have both PERSONAL and BUSINESS memberships.');
  }

  const account = await sysPrisma.account.findFirst({
    where: { workspaceId: personalMembership.workspaceId },
    select: { id: true },
  });

  if (!account) {
    throw new Error('[Transaction.route.test] Joao PERSONAL workspace must have at least one account.');
  }

  const category = await sysPrisma.category.findFirst({
    where: {
      OR: [
        { workspaceId: personalMembership.workspaceId },
        { workspaceId: null },
      ],
    },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (!category) {
    throw new Error('[Transaction.route.test] A global or Joao PERSONAL category is required.');
  }

  const routeFixturePrefix = `TEST_ROUTE_PERSONAL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_`;
  const newestExisting = await sysPrisma.transaction.findFirst({
    where: { workspaceId: personalMembership.workspaceId },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  const baseDateMs = Math.max(newestExisting?.date.getTime() ?? 0, Date.now());

  const createdTransactions = await Promise.all(
    Array.from({ length: 6 }, (_, index) => {
      const fixtureNumber = index + 1;
      return sysPrisma.transaction.create({
        data: {
          description: `Route fixture transaction ${fixtureNumber}`,
          amount: String(10 + fixtureNumber),
          date: new Date(baseDateMs + fixtureNumber * 60_000),
          type: 'EXPENSE',
          status: 'COMPLETED',
          isPaid: true,
          accountId: account.id,
          categoryId: category.id,
          workspaceId: personalMembership.workspaceId,
          hashDeduplication: `${routeFixturePrefix}${fixtureNumber}`,
        },
        select: { id: true },
      });
    })
  );

  if (createdTransactions.length === 0) {
    throw new Error('[Transaction.route.test] Failed to create route fixture transactions.');
  }

  return {
    userId: joao.id,
    token: makeToken(joao.id),
    personalWorkspaceId: personalMembership.workspaceId,
    businessWorkspaceId: businessMembership.workspaceId,
    readableTransactionId: createdTransactions[0].id,
    routeFixturePrefix,
  };
}

async function cleanupRouteFixture(ctx: RouteContext | undefined) {
  if (!ctx?.routeFixturePrefix) return;

  await sysPrisma.transaction.deleteMany({
    where: {
      workspaceId: ctx.personalWorkspaceId,
      hashDeduplication: { startsWith: ctx.routeFixturePrefix },
    },
  });
}

describe('GET /transactions/:id - DB-backed route integration', () => {
  let ctx: RouteContext;

  beforeAll(async () => {
    ctx = await resolveRouteContext();
  });

  afterAll(async () => {
    await cleanupRouteFixture(ctx);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get(`/transactions/${ctx.readableTransactionId}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(401);
  });

  it('returns 400 without x-workspace-id', async () => {
    const res = await request(app)
      .get(`/transactions/${ctx.readableTransactionId}`)
      .set('Authorization', `Bearer ${ctx.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/x-workspace-id/i);
  });

  it('returns 403 when the authenticated user has no membership', async () => {
    const res = await request(app)
      .get(`/transactions/${ctx.readableTransactionId}`)
      .set('Authorization', `Bearer ${makeToken(999999)}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown transaction without enumerating workspace data', async () => {
    const res = await request(app)
      .get('/transactions/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found|access denied/i);
  });

  it('returns a readable transaction and keeps AI internals out of the response', async () => {
    const res = await request(app)
      .get(`/transactions/${ctx.readableTransactionId}`)
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ctx.readableTransactionId);
    expect(res.body.workspaceId).toBe(ctx.personalWorkspaceId);
    expect(res.body).toHaveProperty('category');
    expect(res.body).toHaveProperty('account');

    for (const insight of res.body.aiInsights ?? []) {
      expect(insight).not.toHaveProperty('prompt');
      expect(insight).not.toHaveProperty('rawResponse');
      expect(insight).not.toHaveProperty('outboxPayload');
      expect(insight).not.toHaveProperty('providerInput');
    }
  });
});

describe('GET /transactions?limit=5 - DB-backed recent activity proof', () => {
  let ctx: RouteContext;

  beforeAll(async () => {
    ctx = await resolveRouteContext();
  });

  afterAll(async () => {
    await cleanupRouteFixture(ctx);
  });

  it('returns recent PERSONAL transactions through the real route stack', async () => {
    const res = await request(app)
      .get('/transactions?limit=5')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: expect.any(Array),
      nextCursor: expect.any(String),
      hasMore: true,
    });
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.every((tx: any) => tx.workspaceId === ctx.personalWorkspaceId)).toBe(true);
    expect(res.body.data.every((tx: any) => String(tx.hashDeduplication).startsWith(ctx.routeFixturePrefix))).toBe(true);
  });

  it('keeps PERSONAL transactions out of the BUSINESS listing', async () => {
    const res = await request(app)
      .get('/transactions?limit=5')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.businessWorkspaceId));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every((tx: any) => tx.workspaceId === ctx.businessWorkspaceId)).toBe(true);
    expect(res.body.data.some((tx: any) => String(tx.hashDeduplication).startsWith(ctx.routeFixturePrefix))).toBe(false);
  });

  it('preserves date desc ordering and the pagination contract', async () => {
    const res = await request(app)
      .get('/transactions?limit=5')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.hasMore).toBe(true);
    expect(typeof res.body.nextCursor).toBe('string');

    for (let index = 1; index < res.body.data.length; index += 1) {
      const previous = new Date(res.body.data[index - 1].date).getTime();
      const current = new Date(res.body.data[index].date).getTime();
      expect(previous).toBeGreaterThanOrEqual(current);
    }
  });

  it('returns 400 without x-workspace-id and 401 without auth', async () => {
    const withoutWorkspace = await request(app)
      .get('/transactions?limit=5')
      .set('Authorization', `Bearer ${ctx.token}`);

    const withoutAuth = await request(app)
      .get('/transactions?limit=5')
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(withoutWorkspace.status).toBe(400);
    expect(withoutAuth.status).toBe(401);
  });
});
