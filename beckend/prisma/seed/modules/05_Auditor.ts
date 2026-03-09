import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

export async function seedGovernanceLogs(prisma: PrismaClient, identities: any, structure: any) {

    // 1. Criamos a transação alvo
    const txAlvo = await prisma.transaction.create({
        data: {
            description: 'Compra Suspeita de Servidor',
            amount: new Decimal('500.00'),
            date: new Date(),
            type: 'EXPENSE',
            status: 'COMPLETED',
            accountId: structure.mariaB2B.checkingId,
            categoryId: structure.mariaB2B.catEnergyId,
            workspaceId: identities.mariaBusinessId
        }
    });

    // 2. Gravamos o primeiro LOG (CREATE)
    await prisma.auditLog.create({
        data: {
            userId: identities.maria.id,
            workspaceId: identities.mariaBusinessId,
            action: 'CREATE',
            entity: 'Transaction',
            entityId: txAlvo.id,
            newState: JSON.parse(JSON.stringify(txAlvo)),
            ipAddress: '192.168.0.1'
        }
    });

    // 3. Empregador/Dono tenta "mascarar" o valor (Editando o valor da DB)
    const transacaoAtualizada = await prisma.transaction.update({
        where: { id: txAlvo.id },
        data: { amount: new Decimal('200.00'), description: 'Compra de Cadernos' }
    });

    // 4. Audit Log Inviolável registra o Old x New State
    await prisma.auditLog.create({
        data: {
            userId: identities.maria.id,
            workspaceId: identities.mariaBusinessId,
            action: 'UPDATE',
            entity: 'Transaction',
            entityId: transacaoAtualizada.id,
            oldState: JSON.parse(JSON.stringify(txAlvo)),
            newState: JSON.parse(JSON.stringify(transacaoAtualizada)),
            ipAddress: '192.168.0.1'
        }
    });

    console.log(`  -> Audit Log Injetado para Transação ID: ${transacaoAtualizada.id} (Alteração de 500 para 200).`);
}
