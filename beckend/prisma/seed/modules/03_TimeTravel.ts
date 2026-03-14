import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * MÓDULO 03 — TIME TRAVEL (Séries Temporais) — Seed V3.0
 * 
 * Gera 6 meses de transações para cada workspace BUSINESS com:
 * - Receitas distribuídas aleatoriamente pelos dias do mês
 * - 5 tipos de despesas fixas recorrentes (Aluguel, Energia, Internet, Salário, DAS)
 * - Sazonalidade: Novembro (Black Friday) gera 3x mais vendas
 * - Precisão Decimal(19,4) em todos os campos monetários
 * 
 * Parâmetros de "Saúde Financeira" são controlados pelo healthProfile:
 *   - 'healthy': attachmentUrl em 100% das transações
 *   - 'risky': attachmentUrl em 0% das transações recentes (últimos 2 meses)
 *   - 'transition': poucas transações, perfil recém-criado
 *   - 'empty': nenhuma transação
 */

type HealthProfile = 'healthy' | 'risky' | 'transition' | 'empty';

interface TimeTravelConfig {
    workspaceId: number;
    accountId: number;
    structure: any; // Mapeamento de catIds
    taxRate: number;
    healthProfile: HealthProfile;
    salesPerMonth?: number; // Override do volume base
}

const EXPENSE_TEMPLATES = [
    { descPrefix: 'Aluguel Comercial', catKey: 'catRentId', baseAmount: 2800, variation: 0 },
    { descPrefix: 'Conta de Energia', catKey: 'catEnergyId', baseAmount: 320, variation: 80 },
    { descPrefix: 'Internet / Telecom', catKey: 'catInternetId', baseAmount: 159.90, variation: 0 },
    { descPrefix: 'Pró-Labore', catKey: 'catPayrollId', baseAmount: 4500, variation: 500 },
    { descPrefix: 'DAS Simples Nacional', catKey: 'catTaxId', baseAmount: 0, variation: 0 }, // Calculado
];

const FUZZY_SALE_DESCRIPTIONS = [
    // Cluster UBER
    'Uber *Trip 102', 'UBER DO BRASIL TECNOLOG', 'Uber Brasil', 'UBR* PENDING',
    // Cluster AMAZON
    'Amazon AWS Cloud', 'AMZN AWS', 'Amzn Prime', 'AMAZON.COM.BR',
    // Cluster 99APP
    '99App *Corrida', '99 POP', '99APP *PAGAMENTO', 'NINENINECORP',
    // Cluster iFood
    'IFood *Pedido', 'IFOOD.COM', 'iFood Restaurante', 'IFOOD PAG',
    // Descrições normais
    'Venda E-commerce Shopee', 'Venda Mercado Livre', 'Serviço de Consultoria',
    'Projeto Freelance', 'Manutenção Mensal', 'Venda Balcão',
];

export async function seedTimeTravel(prisma: PrismaClient, configs: TimeTravelConfig[]) {
    let totalCount = 0;

    for (const cfg of configs) {
        if (cfg.healthProfile === 'empty') continue;

        const today = new Date();
        const monthsBack = cfg.healthProfile === 'transition' ? 3 : 12; // 12 meses em instead de 6
        const baseSalesPerMonth = cfg.salesPerMonth ? (cfg.salesPerMonth * 4) : (cfg.healthProfile === 'transition' ? 15 : 40); // 40 * 12 = 480 vendas + despesas -> >500 txnts

        let workspaceCount = 0;

        for (let m = monthsBack; m >= 0; m--) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
            const isBlackFriday = targetDate.getMonth() === 10; // Novembro
            const salesCount = isBlackFriday ? baseSalesPerMonth * 3 : baseSalesPerMonth;

            // Flag: Meses recentes sem anexo para empresas "risky"
            const isRecentMonth = m <= 1;
            const shouldHaveAttachment = cfg.healthProfile === 'healthy' ||
                (cfg.healthProfile === 'risky' && !isRecentMonth);

            let monthIncome = new Decimal(0);

            // ── RECEITAS ──
            for (let i = 0; i < salesCount; i++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const txDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);

                const gross = new Decimal(Math.random() * 500 + 50).toDecimalPlaces(4);
                const platformFee = gross.mul(0.18).toDecimalPlaces(4);
                const taxAmount = gross.mul(cfg.taxRate / 100).toDecimalPlaces(4);
                const net = gross.minus(platformFee).minus(taxAmount).toDecimalPlaces(4);
                monthIncome = monthIncome.plus(net);

                const desc = FUZZY_SALE_DESCRIPTIONS[Math.floor(Math.random() * FUZZY_SALE_DESCRIPTIONS.length)];

                await prisma.transaction.create({
                    data: {
                        accountId: cfg.accountId,
                        categoryId: cfg.structure.catSalesId,
                        workspaceId: cfg.workspaceId,
                        type: 'INCOME',
                        status: 'COMPLETED',
                        description: `${desc} #${targetDate.getMonth() + 1}-${String(i + 1).padStart(3, '0')}`,
                        date: txDate,
                        grossAmount: gross,
                        feeAmount: platformFee,
                        platformFeeRate: new Decimal(18.0),
                        taxAmount,
                        amount: net,
                        netValue: net,
                        attachmentUrl: shouldHaveAttachment
                            ? `https://storage.wsp.finance/receipts/${cfg.workspaceId}/${txDate.toISOString().split('T')[0]}_${i}.pdf`
                            : null,
                    }
                });
                workspaceCount++;
            }

            // ── DESPESAS FIXAS ──
            for (const template of EXPENSE_TEMPLATES) {
                let amount: Decimal;

                if (template.descPrefix.includes('DAS')) {
                    // DAS calculado sobre a receita bruta do mês
                    amount = monthIncome.mul(cfg.taxRate / 100).toDecimalPlaces(4);
                    if (amount.lte(0)) amount = new Decimal(67.00); // Mínimo DAS MEI
                } else {
                    amount = new Decimal(template.baseAmount + (Math.random() * template.variation * 2 - template.variation)).toDecimalPlaces(4);
                }

                const expenseDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 10);

                await prisma.transaction.create({
                    data: {
                        accountId: cfg.accountId,
                        categoryId: cfg.structure[template.catKey],
                        workspaceId: cfg.workspaceId,
                        type: 'EXPENSE',
                        status: 'COMPLETED',
                        description: `${template.descPrefix} - ${String(targetDate.getMonth() + 1).padStart(2, '0')}/${targetDate.getFullYear()}`,
                        date: expenseDate,
                        amount,
                        attachmentUrl: shouldHaveAttachment
                            ? `https://storage.wsp.finance/invoices/${cfg.workspaceId}/${template.descPrefix.replace(/\s/g, '_')}_${targetDate.getMonth() + 1}.pdf`
                            : null,
                    }
                });
                workspaceCount++;
            }
        }

        totalCount += workspaceCount;
        console.log(`    • Workspace ${cfg.workspaceId} (${cfg.healthProfile}): ${workspaceCount} transações`);
    }

    return { count: totalCount };
}
