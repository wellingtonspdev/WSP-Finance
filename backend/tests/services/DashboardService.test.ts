import { beforeAll, describe, expect, it } from 'vitest';
import { DashboardService } from '../../src/services/DashboardService';
import { sysPrisma as prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';

describe('DashboardService - Personal demo real calculation', () => {
  let personalWorkspaceId: number;
  let businessWorkspaceId: number;
  let dashboardService: DashboardService;

  beforeAll(async () => {
    dashboardService = new DashboardService();

    const joao = await prisma.user.findUnique({
      where: { email: 'joao@wsp.finance' },
      include: { memberships: { include: { workspace: true } } },
    });

    if (!joao) {
      throw new Error('STOP: joao@wsp.finance not found in database');
    }

    const personalMembership = joao.memberships.find(
      (membership) => membership.workspace.type === 'PERSONAL'
    );
    const businessMembership = joao.memberships.find(
      (membership) => membership.workspace.type === 'BUSINESS'
    );

    if (!personalMembership) {
      throw new Error('STOP: Joao has no PERSONAL workspace');
    }
    if (!businessMembership) {
      throw new Error('STOP: Joao has no BUSINESS workspace');
    }

    personalWorkspaceId = personalMembership.workspaceId;
    businessWorkspaceId = businessMembership.workspaceId;
  });

  it('returns the seeded personal balance and monthly flow using the real repository', async () => {
    const now = new Date();
    const summary = await tenantContext.run(
      { currentWorkspaceId: personalWorkspaceId, userRole: 'OWNER', workspaceType: 'PERSONAL' },
      () => dashboardService.getSummary(personalWorkspaceId, now.getMonth() + 1, now.getFullYear())
    );

    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [totalIncome, totalExpense, monthlyIncome, monthlyExpense] = await Promise.all([
      prisma.transaction.aggregate({ where: { workspaceId: personalWorkspaceId, type: 'INCOME', status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { workspaceId: personalWorkspaceId, type: 'EXPENSE', status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { workspaceId: personalWorkspaceId, type: 'INCOME', status: 'COMPLETED', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { workspaceId: personalWorkspaceId, type: 'EXPENSE', status: 'COMPLETED', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
    ]);

    const expectedBalance = Number(totalIncome._sum.amount || 0) - Number(totalExpense._sum.amount || 0);
    const expectedMonthlyIncome = Number(monthlyIncome._sum.amount || 0);
    const expectedMonthlyExpense = Number(monthlyExpense._sum.amount || 0);
    const expectedMonthlyResult = expectedMonthlyIncome - expectedMonthlyExpense;

    expect(summary.balance.total).toBeCloseTo(expectedBalance, 2);
    expect(summary.flow.income).toBeCloseTo(expectedMonthlyIncome, 2);
    expect(summary.flow.expense).toBeCloseTo(expectedMonthlyExpense, 2);
    expect(summary.flow.result).toBeCloseTo(expectedMonthlyResult, 2);
  });

  it('does not mix the personal demo summary into Joao business workspace', async () => {
    const now = new Date();
    const businessSummary = await tenantContext.run(
      { currentWorkspaceId: businessWorkspaceId, userRole: 'OWNER', workspaceType: 'BUSINESS' },
      () => dashboardService.getSummary(businessWorkspaceId, now.getMonth() + 1, now.getFullYear())
    );

    const leakedPersonalDemo = await prisma.transaction.count({
      where: {
        workspaceId: businessWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
      },
    });

    expect(leakedPersonalDemo).toBe(0);
    expect(businessSummary.balance.total).not.toBeCloseTo(2710.1, 2);
  });
});
