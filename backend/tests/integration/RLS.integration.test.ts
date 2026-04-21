import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  applicationClient,
  managementClient,
  withTestWorkspace,
} from '../../src/test/prisma-test-clients';

describe('RLS integration smoke test', () => {
  const WORKSPACE_A_ID = 9001;
  const WORKSPACE_B_ID = 9002;
  const CATEGORY_ID = 9999;
  const ACCOUNT_ID = 9999;
  let transactionIdA: string;

  beforeAll(async () => {
    await managementClient.workspace.createMany({
      data: [
        { id: WORKSPACE_A_ID, name: 'Smoke Test WS A' },
        { id: WORKSPACE_B_ID, name: 'Smoke Test WS B' },
      ],
      skipDuplicates: true,
    });

    await managementClient.category.upsert({
      where: { id: CATEGORY_ID },
      update: {},
      create: { id: CATEGORY_ID, name: 'Smoke Category' },
    });

    await managementClient.account.upsert({
      where: { id: ACCOUNT_ID },
      update: {},
      create: { id: ACCOUNT_ID, name: 'Smoke Account', workspaceId: WORKSPACE_A_ID },
    });
  });

  afterAll(async () => {
    await managementClient.transaction.deleteMany({
      where: { workspaceId: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });

    await managementClient.account.deleteMany({
      where: { id: ACCOUNT_ID },
    });

    await managementClient.workspace.deleteMany({
      where: { id: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } },
    });
  });

  it('inserts a record isolated to workspace A through the restricted application client', async () => {
    await withTestWorkspace(WORKSPACE_A_ID.toString(), async () => {
      const transaction = await applicationClient.transaction.create({
        data: {
          description: 'Workspace A secret',
          amount: new Prisma.Decimal('15000.50'),
          date: new Date(),
          type: 'INCOME',
          accountId: ACCOUNT_ID,
          categoryId: CATEGORY_ID,
          workspaceId: WORKSPACE_A_ID,
        },
      });

      transactionIdA = transaction.id;
      expect(transaction.amount.toNumber()).toBe(15000.5);
    });
  });

  it('returns an empty result when workspace B tries to read workspace A data', async () => {
    await withTestWorkspace(WORKSPACE_B_ID.toString(), async () => {
      const leakedTransactions = await applicationClient.transaction.findMany({
        where: {
          id: transactionIdA,
          workspaceId: WORKSPACE_A_ID,
        },
      });

      expect(leakedTransactions).toHaveLength(0);
    });
  });
});
