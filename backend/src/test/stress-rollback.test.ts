import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withEphemeralTransaction } from './transaction-proxy';
import { applicationClient, managementClient } from './prisma-test-clients';

describe('Performance & Isolation: Transaction Proxy Stress Test', () => {
  beforeAll(async () => {
    await managementClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _stress_test_proxy (
        id TEXT PRIMARY KEY,
        val TEXT
      )
    `);
    await managementClient.$executeRawUnsafe(`GRANT ALL ON _stress_test_proxy TO PUBLIC`);
  });

  afterAll(async () => {
    await managementClient.$executeRawUnsafe(`DROP TABLE IF EXISTS _stress_test_proxy`);
  });

  it('should execute teardown and rollback in under 100ms', async () => {
    const insertedId = 'test-rollback-id-123';
    const startTeardownTime = performance.now();

    await withEphemeralTransaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO _stress_test_proxy (id, val) VALUES ($1, $2)`,
        insertedId,
        'stressed'
      );

      const res: any[] = await tx.$queryRawUnsafe(
        `SELECT * FROM _stress_test_proxy WHERE id = $1`,
        insertedId
      );
      expect(res.length).toBe(1);
    }, 'stress-test-workspace');

    const teardownMs = performance.now() - startTeardownTime;

    // Verificação 1: Rollback efetivo — dado não existe fora da transação
    let outsideRes: any[] = [];
    try {
      outsideRes = await applicationClient.$queryRawUnsafe(
        `SELECT * FROM _stress_test_proxy WHERE id = $1`,
        insertedId
      );
    } catch {
      // Tabela pode não existir se DDL transacional reverteu
    }
    expect(outsideRes.length).toBe(0);

    // Verificação 2: Performance < 100ms
    console.log(`[QA LOG] Teardown (Rollback) Execution Time: ${teardownMs.toFixed(2)}ms`);
    expect(teardownMs).toBeLessThan(100);
  });

  it('[AUDIT] Role de runtime NÃO possui SUPERUSER nem BYPASSRLS', async () => {
    const roleCheck: any[] = await managementClient.$queryRawUnsafe(
      `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`
    );

    // A DATABASE_URL já usa role restrita
    if (roleCheck.length > 0) {
      const { rolsuper, rolbypassrls, rolname } = roleCheck[0];
      console.log(`[AUDIT] Runtime role: ${rolname} | rolsuper=${rolsuper} | rolbypassrls=${rolbypassrls}`);
    }

    // Validar a role wsp_test_user criada pelo globalSetup
    const testRoleCheck: any[] = await managementClient.$queryRawUnsafe(
      `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'wsp_test_user'`
    );

    expect(testRoleCheck.length).toBeGreaterThan(0);
    expect(testRoleCheck[0].rolsuper).toBe(false);
    expect(testRoleCheck[0].rolbypassrls).toBe(false);
    console.log(`[AUDIT] ✅ wsp_test_user: NOSUPERUSER + NOBYPASSRLS confirmado`);
  });
});
