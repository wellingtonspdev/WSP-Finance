import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { withTenantContext } from '../utils/withTenantContext';
import { tenantContext } from '../../src/lib/tenantContext';

describe('INTEGRAÇÃO RLS - Smoke Test de Segurança Zero-Trust', () => {

    // IDs e variáveis de escopo
    const WORKSPACE_A_ID = 9001;
    const WORKSPACE_B_ID = 9002;
    const CATEGORY_ID = 9999;
    const ACCOUNT_ID = 9999;
    let testPrisma: any;
    let transactionIdA: string;

    beforeAll(async () => {
        // Criar usuário não-privilegiado para teste genuíno de RLS
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rls_tester') THEN
                    CREATE ROLE rls_tester WITH LOGIN PASSWORD 'password';
                END IF;
            END
            $$;
        `);
        // Grant permissions for tests
        await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO rls_tester;`);
        await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rls_tester;`);
        await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rls_tester;`);

        const { PrismaClient } = await import('@prisma/client');

        let url = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/wsp_test_db?schema=public';
        // Substituindo as credenciais padrões pelas de 'rls_tester'
        url = url.replace('postgres:password', 'rls_tester:password').replace('postgres:270520', 'rls_tester:password');

        const baseTestPrisma = new PrismaClient({ datasourceUrl: url });
        testPrisma = baseTestPrisma.$extends({
            query: {
                $allModels: {
                    async $allOperations({ args, query }) {
                        const store = tenantContext.getStore();
                        const workspaceId = store?.currentWorkspaceId;
                        if (store?.bypassRls || !workspaceId) return query(args);
                        const [, result] = await baseTestPrisma.$transaction([
                            baseTestPrisma.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId.toString()}, true)`,
                            query(args),
                        ]);
                        return result;
                    }
                }
            }
        });

        // Vamos garantir que a base seja resetada (limpar lixo)
        // Usamos managementClient para ignorar o RLS
        const { managementClient } = await import('../../src/test/prisma-test-clients');
        
        // Criar as 2 contas e a categoria para não quebrar a Foreign Key
        await managementClient.workspace.createMany({
            data: [
                { id: WORKSPACE_A_ID, name: 'Smoke Test WS A' },
                { id: WORKSPACE_B_ID, name: 'Smoke Test WS B' }
            ],
            skipDuplicates: true
        });

        await managementClient.category.upsert({
            where: { id: CATEGORY_ID },
            update: {},
            create: { id: CATEGORY_ID, name: 'Smoke Category' }
        });

        await managementClient.account.upsert({
            where: { id: ACCOUNT_ID },
            update: {},
            create: { id: ACCOUNT_ID, name: 'Smoke Account', workspaceId: WORKSPACE_A_ID }
        });
    });

    afterAll(async () => {
        const { managementClient } = await import('../../src/test/prisma-test-clients');
        // Limpeza segura dos dados
        await managementClient.transaction.deleteMany({
            where: { workspaceId: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } }
        });
        await managementClient.account.deleteMany({
            where: { id: ACCOUNT_ID }
        });
        await managementClient.workspace.deleteMany({
            where: { id: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } }
        });
        await testPrisma?.$disconnect();
    });

    it('1. Deve inserir um registro isolado no Workspace A', async () => {
        await withTenantContext(WORKSPACE_A_ID, async () => {
            const transaction = await testPrisma.transaction.create({
                data: {
                    description: 'Segredo Financeiro do Workspace A',
                    amount: 15000.50,
                    date: new Date(),
                    type: 'INCOME',
                    accountId: ACCOUNT_ID,
                    categoryId: CATEGORY_ID,
                    workspaceId: WORKSPACE_A_ID
                }
            });

            transactionIdA = transaction.id;
            expect(transaction).toBeDefined();
            expect(transaction.amount.toNumber()).toBe(15000.50);
        });
    });

    it('2. [CRÍTICO] Deve retornar VAZIO ao tentar ler do Workspace B (RLS Multi-Tenant BLOCKED)', async () => {
        // Executa a query com o current_workspace_id falso fingindo ser o HACKER (Workspace B)
        await withTenantContext(WORKSPACE_B_ID, async () => {
            const transacoesVadidas = await testPrisma.transaction.findMany({
                where: {
                    // O Hacker até descobre/chuta o ID do Workspace Alheio no código Node
                    workspaceId: WORKSPACE_A_ID
                }
            });

            // ASSERT: Se o Array tiver registros, o Banco de Dados FALHOU em isolar os locatários
            expect(transacoesVadidas.length).toBe(0);
        });
    });

});
