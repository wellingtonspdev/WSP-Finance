import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { buildRestrictedDatabaseUrl } from './test-role-config';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface TestTenantContext {
  workspaceId?: string;
}

export const testTenantCtx = new AsyncLocalStorage<TestTenantContext>();

export const managementClient = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL },
  },
});

export const applicationDatabaseUrl = buildRestrictedDatabaseUrl(process.env.DATABASE_URL);

const baseApplicationClient = new PrismaClient({
  datasources: {
    db: { url: applicationDatabaseUrl },
  },
});

/**
 * applicationClient always connects using the restricted test role and injects
 * the RLS workspace context for operations that need tenant isolation.
 */
export const applicationClient = baseApplicationClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const ctx = testTenantCtx.getStore();
        const workspaceId = ctx?.workspaceId;

        if (!workspaceId) {
          return query(args);
        }

        const [, result] = await baseApplicationClient.$transaction([
          baseApplicationClient.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`,
          query(args),
        ]);

        return result;
      },
    },
  },
});

export async function withTestWorkspace<T>(workspaceId: string, callback: () => Promise<T>): Promise<T> {
  return testTenantCtx.run({ workspaceId }, callback);
}

export async function injectRlsContext(tx: { $executeRawUnsafe: (sql: string) => Promise<unknown> }, workspaceId: string) {
  await tx.$executeRawUnsafe(`SELECT set_config('app.current_workspace_id', '${workspaceId}', true)`);
}
