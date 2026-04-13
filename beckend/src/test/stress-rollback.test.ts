import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withEphemeralTransaction } from './transaction-proxy';
import { applicationClient } from './prisma-test-clients';

describe('Performance & Isolation: Transaction Proxy Stress Test', () => {
  it('should execute teardown and rollback in under 100ms', async () => {
    let insertedId = "test-rollback-id-123";
    let startTeardownTime = 0;
    let endTeardownTime = 0;

    const startExecution = performance.now();

    await withEphemeralTransaction(async (tx) => {
      // 1. Simula Injeção de RLS (mesmo fake aqui só pra testar que tx aceita comando)
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_workspace_id', 'test-tenant', true)`);
      
      // Como não sabemos a modelagem real, testamos a latência criando e revertendo via RAW
      // porque Prisma requer Schema válido, e como QA/DevSecOps eu executo contra DB direto.
      
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _stress_test_proxy (
          id TEXT PRIMARY KEY,
          val TEXT
        )
      `);
      
      await tx.$executeRawUnsafe(`INSERT INTO _stress_test_proxy (id, val) VALUES ($1, $2)`, insertedId, "stressed");
      
      const res: any[] = await tx.$queryRawUnsafe(`SELECT * FROM _stress_test_proxy WHERE id = $1`, insertedId);
      expect(res.length).toBe(1);

      // Marca o tempo imediatamente antes de disparar o erro de rollback
      startTeardownTime = performance.now();
    });

    endTeardownTime = performance.now();

    const teardownDurationMs = endTeardownTime - startTeardownTime;
    
    // Verificação 1: O rollback ocorreu de fato?
    // Fazemos a query fora do bloco, logo deve ter sido apagada / revertida.
    let outsideRes: any[] = [];
    try {
      outsideRes = await applicationClient.$queryRawUnsafe(`SELECT * FROM _stress_test_proxy WHERE id = $1`, insertedId);
    } catch(e) {
      // A tabela pode até sumir no DDL se DDL suporta transacionamento (Postgres suporta!)
    }
    expect(outsideRes.length).toBe(0);

    // Verificação 2: Performance foi inferior a 100ms?
    console.log(`[QA LOG] Teardown (Rollback) Execution Time: ${teardownDurationMs.toFixed(2)}ms`);
    expect(teardownDurationMs).toBeLessThan(100);
  });
});
