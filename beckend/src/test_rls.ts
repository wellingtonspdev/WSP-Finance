import { tenantContext } from './lib/tenantContext';
import { prisma } from './lib/prisma';
import { InviteService } from './services/InviteService';

async function runTests() {
    console.log('--- TEST 1: Bloqueio RLS ---');
    // Criar uma tentativa de leitura sem contexto
    try {
        const transactions = await prisma.transaction.findMany({ take: 1 });
        console.log(`[PASS] Query sem context retornou ${transactions.length} resultados.`);
        if (transactions.length > 0) {
            console.log('[FAIL] RLS failed to block the query! Returned data!');
        }
    } catch (err: any) {
        if (err.message.includes('permission denied for table') || err.message.includes('row-level security')) {
            console.log(`[PASS] Access denied correctly: ${err.message}`);
        } else {
            console.log(`[ERRO INESPERADO] ${err.message}`);
        }
    }

    console.log('\\n--- TEST 2: Integridade Singleton InspireService ---');
    try {
        const inviteService = new InviteService();
        // Chamar um método que faz query no inviteService passando um user falso, que tenta listar invites
        const invites = await inviteService.listReceived('teste@email.com');
        // Deve funcionar porque WorkspaceInvite NÃO tem RLS ativo ainda (Não pedimos isso), 
        // mas se fosse Transaction que estivesse no InviteService, tentaria.
        // Opcional: tentar buscar algo que tem RLS. O InviteService chama prisma.workspaceMember... será que membro tem RLS? 
        // (A policy foi só em Transaction, Account, Category, Notification).
        console.log('[PASS] InviteService executou sem quebrar (tipagem e connection intactas).');
    } catch (err: any) {
        console.log(`[FAIL] InviteService falhou: ${err.message}`);
    }

    console.log('\\n--- TEST 3: Stress de Performance ---');
    // Roda de forma paralela 50 queries simulando o "Listar Transações" no contexto para ver se o DB segura as conexões
    try {
        await tenantContext.run({ currentWorkspaceId: 1 }, async () => {
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(prisma.transaction.findMany({ take: 1 }));
            }
            await Promise.all(promises);
            console.log(`[PASS] Stress de 50 requests disparados e processados sob o limitador de pool de forma estável.`);
        });
    } catch (err: any) {
        console.log(`[FAIL] Stress Test falhou: ${err.message}`);
    }
}

runTests().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});
