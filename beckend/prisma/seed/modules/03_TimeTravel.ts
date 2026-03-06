import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

export async function seedSazonalTransactions(prisma: PrismaClient, identities: any, structure: any) {
    let totalCount = 0;

    const generateRetroactiveMonths = async (workspaceId: number, acctId: number, catIncomeId: number, catExpenseId: number, taxRate: number) => {
        const today = new Date();
        const monthsBack = 6;

        let localCount = 0;

        for (let m = monthsBack; m >= 0; m--) {
            // Configurar a data base do mês retroativo
            const targetDate = new Date(today.getFullYear(), today.getMonth() - m, 15);

            // Sazonalidade Simples: Novembro (Black Friday) vende 3x mais.
            const isBlackFriday = targetDate.getMonth() === 10;
            const salesVolumeCount = isBlackFriday ? 45 : 15;

            // 1. Receitas do Mês (Fracionadas)
            for (let i = 0; i < salesVolumeCount; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const txDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);

                // Valor Bruto de Venda (Stress Decimal Simulado)
                const gross = new Decimal(Math.random() * 500 + 50); // Entre 50 e 550
                const platformFee = gross.mul(0.18); // 18% ML/Shopee
                const taxAmount = gross.mul(taxRate / 100);
                const net = gross.minus(platformFee).minus(taxAmount);

                await prisma.transaction.create({
                    data: {
                        accountId: acctId,
                        categoryId: catIncomeId,
                        workspaceId: workspaceId,
                        type: 'INCOME',
                        status: 'COMPLETED',
                        description: `Venda E-commerce #${m}${i}`,
                        date: txDate,
                        grossAmount: gross,
                        feeAmount: platformFee,
                        platformFeeRate: new Decimal(18.0),
                        taxAmount: taxAmount,
                        amount: net, // O PACT armazena o Liquido aqui
                        netValue: net
                    }
                });
                localCount++;
            }

            // 2. Despesas Fixas Mensais (Aluguel, Software, Energia)
            await prisma.transaction.create({
                data: {
                    accountId: acctId,
                    categoryId: catExpenseId,
                    workspaceId: workspaceId,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                    description: `Conta de Energia B2B - Mês ${targetDate.getMonth() + 1}`,
                    date: new Date(targetDate.getFullYear(), targetDate.getMonth(), 10),
                    amount: new Decimal("250.75"),
                }
            });
            localCount++;
        }

        return localCount;
    };

    // Roda o simulador para a Empresa do João (Dropshipping - Gross Flow)
    totalCount += await generateRetroactiveMonths(
        identities.joaoBusinessId,
        structure.joaoB2B.checkingId,
        structure.joaoB2B.catSalesId,
        structure.joaoB2B.catEnergyId,
        6.0 // João paga 6% SIMPLES
    );

    // Roda o simulador para a Empresa da Maria (Tech - High Ticket)
    totalCount += await generateRetroactiveMonths(
        identities.mariaBusinessId,
        structure.mariaB2B.checkingId,
        structure.mariaB2B.catServicesId,
        structure.mariaB2B.catEnergyId,
        15.5 // Maria paga 15.5% (Lucro Presumido)
    );

    return { count: totalCount };
}
