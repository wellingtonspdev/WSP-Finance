import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { AuthService } from '../../src/services/AuthService';
import { managementClient } from '../../src/test/prisma-test-clients';

type SeededScenario = {
  userId: number;
  email: string;
  password: string;
  workspaceAId: number;
  workspaceBId: number;
  staleWorkspaceId: number;
  categoryId: number;
  accountIds: number[];
};

describe('Accountant cache auth integration', () => {
  it('builds a complete dashboardCache on a cold login using real database state', async () => {
    const scenario = await seedScenario('cold-cache');
    const authService = new AuthService();

    try {
      const result = await authService.authenticate(scenario.email, scenario.password);
      const workspaceIds = result.dashboardCache?.map((entry) => entry.workspaceId).sort((a, b) => a - b);

      expect(workspaceIds).toEqual([scenario.workspaceAId, scenario.workspaceBId].sort((a, b) => a - b));

      const persistedCache = await managementClient.accountantDashboardCache.findMany({
        where: { userId: scenario.userId },
        orderBy: { workspaceId: 'asc' },
      });

      expect(persistedCache).toHaveLength(2);
      expect(persistedCache.map((entry) => entry.workspaceId)).toEqual(
        [scenario.workspaceAId, scenario.workspaceBId].sort((a, b) => a - b)
      );
    } finally {
      await cleanupScenario(scenario);
    }
  });

  it('repairs a partial cache and physically prunes stale rows during login refresh', async () => {
    const scenario = await seedScenario('partial-cache');
    const authService = new AuthService();

    try {
      await managementClient.accountantDashboardCache.create({
        data: {
          userId: scenario.userId,
          workspaceId: scenario.workspaceAId,
          pendingMovements: 999,
          missingAttachments: 999,
          cashRiskAlert: true,
          totalBalance: new Prisma.Decimal('999.99'),
        },
      });

      await managementClient.accountantDashboardCache.create({
        data: {
          userId: scenario.userId,
          workspaceId: scenario.staleWorkspaceId,
          pendingMovements: 7,
          missingAttachments: 3,
          cashRiskAlert: false,
          totalBalance: new Prisma.Decimal('10.00'),
        },
      });

      const result = await authService.authenticate(scenario.email, scenario.password);
      const workspaceIds = result.dashboardCache?.map((entry) => entry.workspaceId).sort((a, b) => a - b);

      expect(workspaceIds).toEqual([scenario.workspaceAId, scenario.workspaceBId].sort((a, b) => a - b));
      expect(workspaceIds).not.toContain(scenario.staleWorkspaceId);

      const persistedCache = await managementClient.accountantDashboardCache.findMany({
        where: { userId: scenario.userId },
        orderBy: { workspaceId: 'asc' },
      });

      expect(persistedCache.map((entry) => entry.workspaceId)).toEqual(
        [scenario.workspaceAId, scenario.workspaceBId].sort((a, b) => a - b)
      );
    } finally {
      await cleanupScenario(scenario);
    }
  });

  it('cascades cache rows when the owning workspace is deleted', async () => {
    const suffix = `workspace-cascade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await managementClient.user.create({
      data: {
        name: `Cascade Accountant ${suffix}`,
        email: `cascade-${suffix}@wsp.finance`,
        passwordHash: 'not-used-in-this-test',
        emailVerifiedAt: new Date(),
        type: 'ACCOUNTANT',
      },
    });

    const workspace = await managementClient.workspace.create({
      data: {
        name: `Cascade Workspace ${suffix}`,
        type: 'BUSINESS',
      },
    });

    try {
      await managementClient.accountantDashboardCache.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          pendingMovements: 4,
          missingAttachments: 1,
          cashRiskAlert: false,
          totalBalance: new Prisma.Decimal('42.00'),
        },
      });

      await managementClient.workspace.delete({
        where: { id: workspace.id },
      });

      const persistedCache = await managementClient.accountantDashboardCache.findMany({
        where: { userId: user.id },
      });

      expect(persistedCache).toHaveLength(0);
    } finally {
      await managementClient.accountantDashboardCache.deleteMany({
        where: { userId: user.id },
      });

      await managementClient.workspace.deleteMany({
        where: { id: workspace.id },
      });

      await managementClient.user.deleteMany({
        where: { id: user.id },
      });
    }
  });
});

async function seedScenario(tag: string): Promise<SeededScenario> {
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 8);

  const accountant = await managementClient.user.create({
    data: {
      name: `Accountant ${suffix}`,
      email: `accountant-${suffix}@wsp.finance`,
      passwordHash,
      emailVerifiedAt: new Date(),
      type: 'ACCOUNTANT',
    },
  });

  const [workspaceA, workspaceB, staleWorkspace] = await Promise.all([
    managementClient.workspace.create({
      data: { name: `Workspace A ${suffix}`, type: 'BUSINESS' },
    }),
    managementClient.workspace.create({
      data: { name: `Workspace B ${suffix}`, type: 'BUSINESS' },
    }),
    managementClient.workspace.create({
      data: { name: `Workspace stale ${suffix}`, type: 'BUSINESS' },
    }),
  ]);

  await managementClient.workspaceMember.createMany({
    data: [
      { userId: accountant.id, workspaceId: workspaceA.id, role: 'ACCOUNTANT' },
      { userId: accountant.id, workspaceId: workspaceB.id, role: 'ACCOUNTANT' },
    ],
  });

  const category = await managementClient.category.create({
    data: {
      name: `Category ${suffix}`,
      workspaceId: null,
    },
  });

  const accountA = await managementClient.account.create({
    data: {
      name: `Checking A ${suffix}`,
      workspaceId: workspaceA.id,
      balance: new Prisma.Decimal('1200.00'),
      isIncludedInTotal: true,
    },
  });

  const accountB = await managementClient.account.create({
    data: {
      name: `Checking B ${suffix}`,
      workspaceId: workspaceB.id,
      balance: new Prisma.Decimal('-250.00'),
      isIncludedInTotal: true,
    },
  });

  await managementClient.bankMovement.create({
    data: {
      workspaceId: workspaceA.id,
      accountId: accountA.id,
      amount: new Prisma.Decimal('120.00'),
      date: new Date('2026-04-20T10:00:00.000Z'),
      description: `Pending movement A ${suffix}`,
      source: 'MANUAL',
      status: 'PENDING',
      rawPayload: { source: 'integration-test' },
      fitid: `fitid-a-${suffix}`,
      hashDeduplication: `hash-a-${suffix}`,
    },
  });

  await managementClient.bankMovement.create({
    data: {
      workspaceId: workspaceB.id,
      accountId: accountB.id,
      amount: new Prisma.Decimal('50.00'),
      date: new Date('2026-04-20T11:00:00.000Z'),
      description: `Pending movement B ${suffix}`,
      source: 'MANUAL',
      status: 'PENDING',
      rawPayload: { source: 'integration-test' },
      fitid: `fitid-b-${suffix}`,
      hashDeduplication: `hash-b-${suffix}`,
    },
  });

  await managementClient.transaction.create({
    data: {
      description: `Attachment missing A ${suffix}`,
      amount: new Prisma.Decimal('80.00'),
      date: new Date('2026-04-20T12:00:00.000Z'),
      type: 'EXPENSE',
      accountId: accountA.id,
      categoryId: category.id,
      workspaceId: workspaceA.id,
      attachmentUrl: null,
    },
  });

  await managementClient.transaction.create({
    data: {
      description: `Attachment present B ${suffix}`,
      amount: new Prisma.Decimal('90.00'),
      date: new Date('2026-04-20T13:00:00.000Z'),
      type: 'EXPENSE',
      accountId: accountB.id,
      categoryId: category.id,
      workspaceId: workspaceB.id,
      attachmentUrl: 'https://example.com/proof.pdf',
    },
  });

  return {
    userId: accountant.id,
    email: accountant.email,
    password,
    workspaceAId: workspaceA.id,
    workspaceBId: workspaceB.id,
    staleWorkspaceId: staleWorkspace.id,
    categoryId: category.id,
    accountIds: [accountA.id, accountB.id],
  };
}

async function cleanupScenario(scenario: SeededScenario) {
  await managementClient.accountantDashboardCache.deleteMany({
    where: { userId: scenario.userId },
  });

  await managementClient.refreshToken.deleteMany({
    where: { userId: scenario.userId },
  });

  await managementClient.transaction.deleteMany({
    where: {
      accountId: { in: scenario.accountIds },
    },
  });

  await managementClient.bankMovement.deleteMany({
    where: {
      accountId: { in: scenario.accountIds },
    },
  });

  await managementClient.account.deleteMany({
    where: { id: { in: scenario.accountIds } },
  });

  await managementClient.workspaceMember.deleteMany({
    where: { userId: scenario.userId },
  });

  await managementClient.user.delete({
    where: { id: scenario.userId },
  });

  await managementClient.workspace.deleteMany({
    where: {
      id: {
        in: [scenario.workspaceAId, scenario.workspaceBId, scenario.staleWorkspaceId],
      },
    },
  });

  await managementClient.category.delete({
    where: { id: scenario.categoryId },
  });
}
