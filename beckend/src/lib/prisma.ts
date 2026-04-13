import { PrismaClient, Prisma } from '@prisma/client';
import { tenantContext } from './tenantContext';
import 'dotenv/config';

const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '1';
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

export const sysPrisma = process.env.DIRECT_URL 
    ? new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })
    : basePrisma;


export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const store = tenantContext.getStore();
                const workspaceId = store?.currentWorkspaceId;

                // Se estiver num contexto de script (Cron) que ativou o Bypass, ou se não houver workspaceId (ex: login global)
                if (store?.bypassRls || !workspaceId) {
                    // Quando não há workspaceId, o RLS das policies (USING workspace_id = ...) vai falhar 
                    // caso tente ler dados protegidos, garantindo o "Zero-Trust".
                    return query(args);
                }

                // Injeta a variável local transacional para a requisição, e avalia a query.
                // Array transactions no Prisma garantem a execução na MESMA conexão de banco.
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