import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

export async function seedChaosAndStress(prisma: PrismaClient, identities: any, structure: any) {
    let count = 0;

    // 1. O Inadimplente (Pending de 3 Meses Atrás)
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 3);

    await prisma.transaction.create({
        data: {
            description: 'Documento Fictício Bloqueado Judicialmente (Inadimplência)',
            amount: new Decimal('5000.00'),
            date: pastDate,
            dueDate: pastDate, // Está vencido há 90 dias
            type: 'EXPENSE',
            status: 'PENDING',
            accountId: structure.joaoB2B.checkingId,
            categoryId: structure.joaoB2B.catFeesId,
            workspaceId: identities.joaoBusinessId,
            // Forçamos a ausência de documento para acionar o Linter do front
        }
    });
    count++;

    // 2. O Texto Infinito (Testando Line-Clamp Mobile)
    await prisma.transaction.create({
        data: {
            description: 'Aquisição de suprimentos de informática urgentes contendo 35 monitores, 12 teclados mecânicos importados da Alemanha onde o fornecedor atrasou a entrega no porto de Santos e gerou uma multa aduaneira massiva que precisamos contestar via tribunal federal de pequenas causas mas que contabilidade não aprovou o lançamento.',
            amount: new Decimal('125000.00'),
            date: new Date(),
            type: 'EXPENSE',
            status: 'COMPLETED',
            accountId: structure.mariaB2B.checkingId,
            categoryId: structure.mariaB2B.catEnergyId,
            workspaceId: identities.mariaBusinessId,
        }
    });
    count++;

    // 3. Estouro de Caixa (Cheque Especial Simulator)
    // O Caixa Local do João sofrerá um rombo absoluto
    await prisma.account.update({
        where: { id: structure.joaoB2B.cashId },
        data: { balance: new Decimal('-1450.99') }
    });

    // 4. Rateio Matemático (O problema dos .33 centavos)
    await prisma.transaction.create({
        data: {
            description: 'Rateio de Custo Fixo (1/3 de 1000)',
            amount: new Decimal('333.3333'), // O Prisma cortará em .3333, o Front exibirá .33
            date: new Date(),
            type: 'EXPENSE',
            status: 'COMPLETED',
            accountId: structure.joaoB2B.checkingId,
            categoryId: structure.joaoB2B.catEnergyId,
            workspaceId: identities.joaoBusinessId,
        }
    });
    count++;

    return { count };
}
