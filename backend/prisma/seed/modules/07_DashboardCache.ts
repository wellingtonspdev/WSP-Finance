import { PrismaClient } from '@prisma/client';
import { subMinutes, subHours, subDays } from 'date-fns';

export async function seedDashboardCache(prisma: PrismaClient, identities: any) {
    console.log('\n📦 [Fase 8] Inicializando módulo 07: Dashboard Cache (Accountant)');

    const wellingtonId = identities.wellington.id;
    const workspaces = identities.workspaces;
    const clients = identities.clients;

    const clientKeys = ['joao', 'maria', 'pedro', 'ana', 'lucas', 'carlos', 'rafael', 'bruno', 'thiago', 'daniel'];
    
    // Varied updatedAt scenarios
    const now = new Date();
    const updatedAtScenarios = [
        now,                               // joao: agora
        subMinutes(now, 15),               // maria: 15 min
        subMinutes(now, 45),               // pedro: 45 min
        subHours(now, 2),                  // ana: 2h (outdated)
        subHours(now, 5),                  // lucas: 5h
        subHours(now, 25),                 // carlos: 1d
        subDays(now, 2),                   // rafael: 2d
        subDays(now, 5),                   // bruno: 5d
        subMinutes(now, 2),                // thiago: 2 min
        subHours(now, 1),                  // daniel: 1h
    ];

    let i = 0;
    for (const key of clientKeys) {
        const workspaceId = workspaces[`${key}BusinessId`];
        const certExp = clients[key].memberships.find((m: any) => m.workspace.type === 'BUSINESS').workspace.certificateExpiresAt;

        // Calcula os valores reais agregados do banco!
        const pendingMovements = await prisma.bankMovement.count({
            where: { workspaceId, status: 'PENDING' }
        });

        const missingAttachments = await prisma.transaction.count({
            where: { workspaceId, attachmentSize: 0 }
        });

        const accounts = await prisma.account.findMany({
            where: { workspaceId }
        });

        const totalBalance = accounts.reduce((acc, account) => acc + Number(account.balance), 0);
        const cashRiskAlert = totalBalance < 0;
        
        const customUpdatedAt = updatedAtScenarios[i];
        i++;

        // Upsert standard para garantir a criação
        await prisma.accountantDashboardCache.upsert({
            where: {
                userId_workspaceId: {
                    userId: wellingtonId,
                    workspaceId
                }
            },
            update: {
                pendingMovements,
                missingAttachments,
                cashRiskAlert,
                totalBalance,
                certificateExpiresAt: certExp,
                updatedAt: customUpdatedAt
            },
            create: {
                userId: wellingtonId,
                workspaceId,
                pendingMovements,
                missingAttachments,
                cashRiskAlert,
                totalBalance,
                certificateExpiresAt: certExp,
                updatedAt: customUpdatedAt
            }
        });

        // Prisma @updatedAt pode forçar o update em alguns casos, 
        // por segurança fazemos um executeRaw com o updatedAt exato para teste visual
        await prisma.$executeRawUnsafe(`
            UPDATE "AccountantDashboardCache" 
            SET "updatedAt" = $1 
            WHERE "userId" = $2 AND "workspaceId" = $3
        `, customUpdatedAt, wellingtonId, workspaceId);
    }

    console.log(`  → Cache do dashboard populado para Wellington em 10 workspaces com datas de atualização variadas.`);

    return { cacheCount: 10 };
}
