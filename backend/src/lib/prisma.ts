import { PrismaClient, Prisma } from '@prisma/client';
import { tenantContext } from './tenantContext';
import 'dotenv/config';

const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '5';
let databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && !databaseUrl.includes('connection_limit=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=${connectionLimit}`;
}

const basePrisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
});

/**
 * sysPrisma — Conexão superusuário (DIRECT_URL) para bypass natural de RLS.
 * Usado pelo AdminService para métricas agregadas globais e pelo OutboxService
 * para polling/claim/update de eventos de infraestrutura.
 * Se DIRECT_URL não estiver configurada, fallback para basePrisma (dev/test).
 */
const directUrl = process.env.DIRECT_URL;
export const sysPrisma = directUrl
  ? new PrismaClient({
      datasources: { db: { url: directUrl } },
    })
  : basePrisma;





export const prisma = basePrisma.$extends({
    client: {
        async $transaction(...args: any[]) {
            const store = tenantContext.getStore();
            const workspaceId = store?.currentWorkspaceId;

            if (!workspaceId || store?.bypassRls) {
                return (basePrisma.$transaction as any)(...args);
            }

            if (typeof args[0] === 'function') {
                const fn = args[0];
                return tenantContext.run({ ...store, inTransaction: true }, () => {
                    return basePrisma.$transaction(async (tx) => {
                        await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`;
                        return fn(tx);
                    }, args[1] as any);
                });
            }

            if (Array.isArray(args[0])) {
                return basePrisma.$transaction([
                    basePrisma.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`,
                    ...args[0]
                ], args[1] as any);
            }

            return (basePrisma.$transaction as any)(...args);
        }
    },
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const store = tenantContext.getStore();
                const workspaceId = store?.currentWorkspaceId;

                if (store?.bypassRls || !workspaceId) {
                    return query(args);
                }

                if (store?.inTransaction) {
                    return query(args);
                }

                const [, result] = await basePrisma.$transaction([
                    basePrisma.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`,
                    query(args),
                ]);

                return result;
            }
        }
    }
});

export type ExtendedTransactionClient = Omit<
    typeof prisma,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
