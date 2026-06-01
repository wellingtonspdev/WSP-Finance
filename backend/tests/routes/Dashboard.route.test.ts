import { beforeAll, describe, expect, it } from 'vitest';
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
};

const DEMO_HASH_PREFIX = 'DEMO_PERSONAL_JOAO_';

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
    throw new Error('[Dashboard.route.test] joao@wsp.finance not found. Run the demo seed before this integration test.');
  }

  const personalMembership = joao.memberships.find((membership) => membership.workspace.type === 'PERSONAL');
  const businessMembership = joao.memberships.find((membership) => membership.workspace.type === 'BUSINESS');

  if (!personalMembership || !businessMembership) {
    throw new Error('[Dashboard.route.test] Joao must have both PERSONAL and BUSINESS memberships.');
  }

  const personalDemoCount = await sysPrisma.transaction.count({
    where: {
      workspaceId: personalMembership.workspaceId,
      hashDeduplication: { startsWith: DEMO_HASH_PREFIX },
    },
  });

  if (personalDemoCount !== 6) {
    throw new Error(`[Dashboard.route.test] Expected 6 personal demo transactions, found ${personalDemoCount}.`);
  }

  return {
    userId: joao.id,
    token: makeToken(joao.id),
    personalWorkspaceId: personalMembership.workspaceId,
    businessWorkspaceId: businessMembership.workspaceId,
  };
}

describe('GET /dashboard/summary - DB-backed route integration', () => {
  let ctx: RouteContext;

  beforeAll(async () => {
    ctx = await resolveRouteContext();
  });

  it('returns the seeded PERSONAL dashboard through the real route stack', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // The route uses Account.balance (sum of account balances where isIncludedInTotal=true)
    // and Transaction.isPaid for monthly flow — mirror that here.
    const [accountBalance, monthlyIncome, monthlyExpense] = await Promise.all([
      sysPrisma.account.aggregate({ where: { workspaceId: ctx.personalWorkspaceId, isIncludedInTotal: true }, _sum: { balance: true } }),
      sysPrisma.transaction.aggregate({ where: { workspaceId: ctx.personalWorkspaceId, type: 'INCOME', isPaid: true, date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
      sysPrisma.transaction.aggregate({ where: { workspaceId: ctx.personalWorkspaceId, type: 'EXPENSE', isPaid: true, date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
    ]);

    const expectedBalance = Number(accountBalance._sum.balance || 0);
    const expectedMonthlyIncome = Number(monthlyIncome._sum.amount || 0);
    const expectedMonthlyExpense = Number(monthlyExpense._sum.amount || 0);
    const expectedMonthlyResult = expectedMonthlyIncome - expectedMonthlyExpense;

    expect(res.status).toBe(200);
    expect(res.body.balance.total).toBeCloseTo(expectedBalance, 2);
    expect(res.body.flow.income).toBeCloseTo(expectedMonthlyIncome, 2);
    expect(res.body.flow.expense).toBeCloseTo(expectedMonthlyExpense, 2);
    expect(res.body.flow.result).toBeCloseTo(expectedMonthlyResult, 2);
  });

  it('does not return PERSONAL values for the BUSINESS workspace', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('x-workspace-id', String(ctx.businessWorkspaceId));

    expect(res.status).toBe(200);
    expect(res.body.balance.total).not.toBeCloseTo(2710.10, 2);
    expect(res.body.flow.income).not.toBeCloseTo(8500, 2);
    expect(res.body.flow.expense).not.toBeCloseTo(5789.90, 2);
  });

  it('returns 400 without x-workspace-id', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${ctx.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/x-workspace-id/i);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(401);
  });

  it('returns 403 when the authenticated user has no membership', async () => {
    const outsiderToken = makeToken(999999);

    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .set('x-workspace-id', String(ctx.personalWorkspaceId));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/denied/i);
  });
});
