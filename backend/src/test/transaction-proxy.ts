import { applicationClient } from './prisma-test-clients';

// Símbolo para reconhecer erro de rollback
const ROLLBACK_SIG = "TRANSACTION_ROLLBACK";

/**
 * Transação Efêmera para Testes (Transaction Proxy).
 * Roda o teste isolado e obriga o banco a voltar ao estado original,
 * sem corromper o seed ou outros testes.
 */
export async function withEphemeralTransaction(testFn: (tx: Parameters<Parameters<typeof applicationClient.$transaction>[0]>[0]) => Promise<void>) {
  try {
    await applicationClient.$transaction(async (tx) => {
      // Executamos o teste injetando a transação (tx)
      await testFn(tx);

      // Gatilho do Rollback
      throw new Error(ROLLBACK_SIG);
    }, {
      maxWait: 5000,
      timeout: 10000,
    });
  } catch (error: any) {
    // Se o erro foi o nosso rollback forçado, o teste passou e finaliza supostamente "limpo".
    // Se for outro erro, é uma falha genuina do teste e repassamos pra estourar no vitest.
    if (error.message !== ROLLBACK_SIG) {
      throw error;
    }
  }
}
