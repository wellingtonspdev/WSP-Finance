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

    expect(summary.balance.total).toBeCloseTo(2710.1, 2);
    expect(summary.flow.income).toBeCloseTo(8500, 2);
    expect(summary.flow.expense).toBeCloseTo(5789.9, 2);
    expect(summary.flow.result).toBeCloseTo(2710.1, 2);
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
