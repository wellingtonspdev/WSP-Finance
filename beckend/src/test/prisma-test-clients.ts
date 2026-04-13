import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.test explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Management Client uses DIRECT_URL (Superuser for Setup/Seeding)
export const managementClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

// Application Client uses DATABASE_URL (Restricted user)
const baseApplicationClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Create the extension that mocks the RLS context
export const applicationClient = baseApplicationClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        // Obtains workspace_id from some async context or test fixture state if needed limit
        // Or injects the test workspace ID directly
        // Currently, we'll read it from a global variable that the test runner sets
        const workspaceId = (global as any).__TEST_WORKSPACE_ID__ || process.env.TEST_WORKSPACE_ID;
        
        if (workspaceId) {
          // This must be inside a transaction to set_config locally.
          // Wait, Prisma Extensions run per-query. To set context cleanly, we use it via Prisma Client extension.
          // In a test with transaction proxy, we already run inside a transaction, so we can just set it?
          // Prisma doesn't natively support wrapping EVERY query in a precursor set_config unless we use interactive transactions ($transaction).
          // However, Prisma Extensions query callback allows us to just run `set_config`?
          // Since Prisma uses a connection pool, setting config outside a transaction is VERY DANGEROUS unless is_local=true AND we're in a transaction.
          // Since tests will run entirely inside a transaction proxy (SAVEPOINT), `is_local = true` works perfectly to scope it to the current test transaction.
        }
        return query(args);
      },
    },
  },
});

/**
 * Helper to get an application client wrapped with a specific workspace_id context.
 * Best used inside the Transaction Proxy context.
 */
export async function withWorkspaceContext(tx: any, workspaceId: string, callback: () => Promise<any>) {
  await tx.$executeRawUnsafe(`SELECT set_config('app.current_workspace_id', '${workspaceId}', true)`);
  return callback();
}

/**
 * Factory for tests to dynamically set context within their specific Transaction Proxy context.
 */
export function createMockRlsClient(txClient: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, workspaceId: string) {
  return (txClient as any).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: any) {
          // Em um teste, a extensão garante a injeção per-query (se não tiver feito no hook)
          // Mas cuidado: executar $executeRawUnsafe antes de cada query pode ser custoso.
          // Recomendado: Injetar uma única vez no beforeEach() usando o txClient passado.
          await (txClient as any).$executeRawUnsafe(`SELECT set_config('app.current_workspace_id', '${workspaceId}', true)`);
          return query(args);
        }
      }
    }
  });
}
