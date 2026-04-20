import { applicationClient, injectRlsContext } from './prisma-test-clients';

const ROLLBACK_SIG = 'TRANSACTION_ROLLBACK';

type TransactionClient = Parameters<Parameters<typeof applicationClient.$transaction>[0]>[0];

/**
 * Transação Efêmera para Testes (Transaction Proxy).
 * Roda o teste isolado dentro de uma transaction e obriga o banco a voltar
 * ao estado original via rollback forçado.
 *
 * @param testFn - Função de teste que recebe o transaction client (tx)
 * @param workspaceId - Workspace ID para injetar no RLS context (is_local=true)
 */
export async function withEphemeralTransaction(
  testFn: (tx: TransactionClient) => Promise<void>,
  workspaceId?: string
) {
  const startTime = performance.now();

  try {
    await applicationClient.$transaction(
      async (tx) => {
        // Injeta contexto RLS se workspace fornecido
        if (workspaceId) {
          await injectRlsContext(tx, workspaceId);
        }

        await testFn(tx);

        // Gatilho do Rollback
        throw new Error(ROLLBACK_SIG);
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );
  } catch (error: any) {
    if (error.message !== ROLLBACK_SIG) {
      throw error;
    }
  }

  const teardownMs = performance.now() - startTime;
  if (teardownMs > 100) {
    console.warn(`⚠️ [Transaction Proxy] Teardown lento: ${teardownMs.toFixed(2)}ms (> 100ms)`);
  }
}
