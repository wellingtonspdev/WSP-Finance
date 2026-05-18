import { AuditAction } from '@prisma/client';
import { describe, expect, it, afterEach } from 'vitest';
import { AuditLogService, buildExportAuditNewState } from '../../src/services/AuditLogService';
import { managementClient } from '../../src/test/prisma-test-clients';
import { withTenantContext } from '../utils/withTenantContext';

describe('AuditLogService RLS', () => {

  afterEach(async () => {
    // Clean up all audit logs for test users first to avoid FK constraints
    const users = await managementClient.user.findMany({ where: { email: { startsWith: 'rls_test_user' } } });
    if (users.length > 0) {
      await managementClient.auditLog.deleteMany({
        where: { userId: { in: users.map(u => u.id) } }
      });
    }
    await managementClient.user.deleteMany({ where: { email: { startsWith: 'rls_test_user' } } });
    await managementClient.workspace.deleteMany({ where: { name: { startsWith: 'RLS_TEST_WS' } } });
  });

  it('successfully creates AuditLog EXPORT with valid tenant context (T1)', async () => {
    const workspaceName = `RLS_TEST_WS_A_${Date.now()}`;
    const workspace = await managementClient.workspace.create({
      data: { name: workspaceName, type: 'BUSINESS' }
    });

    const user = await managementClient.user.create({
      data: {
        email: `rls_test_user_a_${Date.now()}@example.com`,
        name: 'RLS Test User A',
        passwordHash: 'hash',
        memberships: {
          create: {
            workspaceId: workspace.id,
            role: 'OWNER'
          }
        }
      }
    });

    const uniqueEntityId = `rls-test-success-${Date.now()}`;

    await withTenantContext(workspace.id, async () => {
      await AuditLogService.logSync({
        userId: user.id,
        workspaceId: workspace.id,
        action: AuditAction.EXPORT,
        entity: 'AccountingExport',
        entityId: uniqueEntityId,
        newState: buildExportAuditNewState({
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          periodStart: '2023-01-01',
          periodEnd: '2023-01-31',
          recordCount: 10,
          warningsCount: 0,
          fileHash: 'testhash',
          fileName: 'test.txt'
        }) as any
      });
    });

    // Bypass context to fetch directly using managementClient
    const log = await managementClient.auditLog.findFirst({
      where: { entityId: uniqueEntityId }
    });

    expect(log).not.toBeNull();
    expect(log?.workspaceId).toBe(workspace.id);
    expect(log?.userId).toBe(user.id);
  });

  it('rejects workspace mismatch (T2)', async () => {
    const workspaceA = await managementClient.workspace.create({
      data: { name: `RLS_TEST_WS_A_${Date.now()}`, type: 'BUSINESS' }
    });

    const workspaceB = await managementClient.workspace.create({
      data: { name: `RLS_TEST_WS_B_${Date.now()}`, type: 'BUSINESS' }
    });

    const user = await managementClient.user.create({
      data: {
        email: `rls_test_user_b_${Date.now()}@example.com`,
        name: 'RLS Test User B',
        passwordHash: 'hash',
        memberships: {
          create: {
            workspaceId: workspaceB.id,
            role: 'OWNER'
          }
        }
      }
    });

    const uniqueEntityId = `rls-test-mismatch-${Date.now()}`;

    await expect(
      withTenantContext(workspaceA.id, () =>
        AuditLogService.logSync({
          userId: user.id,
          workspaceId: workspaceB.id,
          action: AuditAction.EXPORT,
          entity: 'AccountingExport',
          entityId: uniqueEntityId,
        })
      )
    ).rejects.toThrow(/Workspace mismatch/);
  });
});
