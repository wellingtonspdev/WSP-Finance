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
    let transactionIdA: string;

    beforeAll(async () => {
        // Vamos garantir que a base seja resetada (limpar lixo)
        // Precisaremos de bypass aqui para montar o cenário
        await tenantContext.run({ bypassRls: true }, async () => {
            try {
                // Em dev/CI, garantir que não somos superuser para o RLS funcionar
                await prisma.$executeRawUnsafe(`ALTER ROLE CURRENT_USER NOSUPERUSER;`);
            } catch (e) { }
            // Criar as 2 contas e a categoria para não quebrar a Foreign Key
            await prisma.workspace.createMany({
                data: [
                    { id: WORKSPACE_A_ID, name: 'Smoke Test WS A' },
                    { id: WORKSPACE_B_ID, name: 'Smoke Test WS B' }
                ],
                skipDuplicates: true
            });

            await prisma.category.upsert({
                where: { id: CATEGORY_ID },
                update: {},
                create: { id: CATEGORY_ID, name: 'Smoke Category' }
            });

            await prisma.account.upsert({
                where: { id: ACCOUNT_ID },
                update: {},
                create: { id: ACCOUNT_ID, name: 'Smoke Account', workspaceId: WORKSPACE_A_ID }
            });
        });
    });

    afterAll(async () => {
        // Limpeza segura dos dados
        await tenantContext.run({ bypassRls: true }, async () => {
            await prisma.transaction.deleteMany({
                where: { workspaceId: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } }
            });
            await prisma.account.deleteMany({
                where: { id: ACCOUNT_ID }
            });
            await prisma.workspace.deleteMany({
                where: { id: { in: [WORKSPACE_A_ID, WORKSPACE_B_ID] } }
            });
            try {
                await prisma.$executeRawUnsafe(`ALTER ROLE CURRENT_USER SUPERUSER;`);
            } catch (e) { }
        });
    });

    it('1. Deve inserir um registro isolado no Workspace A', async () => {
        await withTenantContext(WORKSPACE_A_ID, async () => {
            const transaction = await prisma.transaction.create({
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
            const transacoesVadidas = await prisma.transaction.findMany({
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
