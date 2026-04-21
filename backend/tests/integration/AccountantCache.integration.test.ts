import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// Usa managementClient (superuser) para seed/cleanup — padrão do projeto
// Usa sysPrisma para operações do service (simula runtime real)
let managementClient: any;
let sysPrismaReal: any;

describe('AccountantDashboardCache - Integração', () => {

  const TEST_USER_ID = 88801;
  const TEST_WORKSPACE_ID = 88801;

  beforeAll(async () => {
    const testClients = await import('../../src/test/prisma-test-clients');
    managementClient = testClients.managementClient;

    // sysPrisma real — importado após garantir que mocks não estão ativos
    const prismaLib = await import('../../src/lib/prisma');
    sysPrismaReal = prismaLib.sysPrisma;

    // Cleanup preventivo (superuser ignora RLS)
    await managementClient.accountantDashboardCache.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await managementClient.workspaceMember.deleteMany({
      where: { userId: TEST_USER_ID, workspaceId: TEST_WORKSPACE_ID },
    });
    await managementClient.account.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
    await managementClient.workspace.deleteMany({
      where: { id: TEST_WORKSPACE_ID },
    });
    await managementClient.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  afterAll(async () => {
    // Limpeza final (superuser)
    await managementClient.accountantDashboardCache.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await managementClient.workspaceMember.deleteMany({
      where: { userId: TEST_USER_ID, workspaceId: TEST_WORKSPACE_ID },
    });
    await managementClient.account.deleteMany({
      where: { workspaceId: TEST_WORKSPACE_ID },
    });
    await managementClient.workspace.deleteMany({
      where: { id: TEST_WORKSPACE_ID },
    });
    await managementClient.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  // ─── TI1: Upsert real + unique constraint ───
  describe('TI1 - Upsert real e unique constraint', () => {

    afterEach(async () => {
      await managementClient.accountantDashboardCache.deleteMany({
        where: { userId: TEST_USER_ID },
      });
    });

    it('deve criar registro e atualizar via upsert, mantendo 1 linha por [userId, workspaceId]', async () => {
      // Primeiro upsert — CREATE
      await managementClient.accountantDashboardCache.upsert({
        where: { userId_workspaceId: { userId: TEST_USER_ID, workspaceId: TEST_WORKSPACE_ID } },
        create: {
          userId: TEST_USER_ID,
          workspaceId: TEST_WORKSPACE_ID,
          totalBalance: new Decimal('1000.0000'),
          pendingMovements: 5,
          missingAttachments: 3,
          cashRiskAlert: false,
          certificateExpiresAt: null,
        },
        update: {
          totalBalance: new Decimal('1000.0000'),
          pendingMovements: 5,
          missingAttachments: 3,
          cashRiskAlert: false,
        },
      });

      // Segundo upsert — UPDATE (valores diferentes)
      await managementClient.accountantDashboardCache.upsert({
        where: { userId_workspaceId: { userId: TEST_USER_ID, workspaceId: TEST_WORKSPACE_ID } },
        create: {
          userId: TEST_USER_ID,
          workspaceId: TEST_WORKSPACE_ID,
          totalBalance: new Decimal('2500.5000'),
          pendingMovements: 0,
          missingAttachments: 1,
          cashRiskAlert: true,
          certificateExpiresAt: null,
        },
        update: {
          totalBalance: new Decimal('2500.5000'),
          pendingMovements: 0,
          missingAttachments: 1,
          cashRiskAlert: true,
        },
      });

      // Verificar: exatamente 1 registro com valores atualizados
      const rows = await managementClient.accountantDashboardCache.findMany({
        where: { userId: TEST_USER_ID, workspaceId: TEST_WORKSPACE_ID },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].totalBalance.toNumber()).toBe(2500.5);
      expect(rows[0].pendingMovements).toBe(0);
      expect(rows[0].missingAttachments).toBe(1);
      expect(rows[0].cashRiskAlert).toBe(true);
      expect(rows[0].certificateExpiresAt).toBeNull();
    });
  });

  // ─── TI2: refreshCache end-to-end mínimo ───
  describe('TI2 - refreshCache end-to-end com banco real', () => {

    beforeAll(async () => {
      // Seed mínimo controlado (superuser)
      await managementClient.user.create({
        data: {
          id: TEST_USER_ID,
          email: `cache-test-${TEST_USER_ID}@test.local`,
          name: 'Cache Test Accountant',
          passwordHash: 'not-a-real-hash',
          type: 'ACCOUNTANT',
        },
      });

      await managementClient.workspace.create({
        data: {
          id: TEST_WORKSPACE_ID,
          name: 'Cache Test Workspace',
          type: 'BUSINESS',
        },
      });

      await managementClient.workspaceMember.create({
        data: {
          userId: TEST_USER_ID,
          workspaceId: TEST_WORKSPACE_ID,
          role: 'ACCOUNTANT',
        },
      });

      await managementClient.account.create({
        data: {
          name: 'Conta Cache Test',
          type: 'CHECKING',
          balance: new Decimal('1000.0000'),
          isIncludedInTotal: true,
          workspaceId: TEST_WORKSPACE_ID,
        },
      });
    });

    afterEach(async () => {
      await managementClient.accountantDashboardCache.deleteMany({
        where: { userId: TEST_USER_ID },
      });
    });

    it('deve persistir cache correto para cenário mínimo (1 conta, 0 pendências)', async () => {
      const { AccountantCacheService } = await import('../../src/services/AccountantCacheService');
      const service = new AccountantCacheService();
      const result = await service.refreshCache(TEST_USER_ID);

      // Contrato do resultado
      expect(result.ok).toBe(true);
      expect(result.workspacesProcessed).toBe(1);
      expect(result.errors).toEqual([]);

      // Dados persistidos — lidos com superuser para evitar RLS
      const cached = await managementClient.accountantDashboardCache.findMany({
        where: { userId: TEST_USER_ID },
      });

      expect(cached).toHaveLength(1);
      expect(cached[0].workspaceId).toBe(TEST_WORKSPACE_ID);
      expect(cached[0].totalBalance.toNumber()).toBe(1000);
      expect(cached[0].pendingMovements).toBe(0);
      expect(cached[0].missingAttachments).toBe(0);
      expect(cached[0].cashRiskAlert).toBe(false);
      expect(cached[0].certificateExpiresAt).toBeNull();
    });
  });
});
