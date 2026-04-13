import { PrismaClient } from '@prisma/client';

/**
 * MÓDULO 02 — ESTRUTURA (Categorias + Contas) — Seed V3.0
 * 
 * - 8 categorias por workspace BUSINESS (3 receitas + 5 despesas)
 * - 3 contas por workspace BUSINESS (Principal, Reserva, Impostos)
 * - Conta Pessoal para cada cliente que tem workspace PERSONAL
 */

const CATEGORY_BLUEPRINT = [
    // Receitas
    { name: 'Vendas de Produtos', icon: '🛒' },
    { name: 'Receita de Serviços', icon: '💼' },
    { name: 'Rendimentos Financeiros', icon: '📈' },
    // Despesas
    { name: 'Aluguel Comercial', icon: '🏢' },
    { name: 'Energia Elétrica', icon: '⚡' },
    { name: 'Internet / Telecom', icon: '📡' },
    { name: 'Salários / Pró-Labore', icon: '👨‍💼' },
    { name: 'DAS / Impostos', icon: '🏛️' },
];

interface WorkspaceStructure {
    checkingId: number;
    reserveId: number;
    taxAccountId: number;
    catSalesId: number;
    catServicesId: number;
    catYieldId: number;
    catRentId: number;
    catEnergyId: number;
    catInternetId: number;
    catPayrollId: number;
    catTaxId: number;
}

export async function seedStructure(prisma: PrismaClient, workspaces: any) {

    const createBusinessStructure = async (workspaceId: number): Promise<WorkspaceStructure> => {
        // Contas Bancárias (3 por workspace)
        const checking = await prisma.account.create({
            data: { name: 'Conta PJ Principal', type: 'CHECKING', balance: 0, workspaceId }
        });
        const reserve = await prisma.account.create({
            data: { name: 'Reserva de Emergência', type: 'SAVINGS', balance: 0, workspaceId }
        });
        const taxAccount = await prisma.account.create({
            data: { name: 'Provisão de Impostos', type: 'SAVINGS', balance: 0, workspaceId }
        });

        // Categorias (8 por workspace)
        const cats = [];
        for (const cat of CATEGORY_BLUEPRINT) {
            const created = await prisma.category.create({
                data: { name: cat.name, icon: cat.icon, workspaceId }
            });
            cats.push(created);
        }

        return {
            checkingId: checking.id,
            reserveId: reserve.id,
            taxAccountId: taxAccount.id,
            catSalesId: cats[0].id,
            catServicesId: cats[1].id,
            catYieldId: cats[2].id,
            catRentId: cats[3].id,
            catEnergyId: cats[4].id,
            catInternetId: cats[5].id,
            catPayrollId: cats[6].id,
            catTaxId: cats[7].id,
        };
    };

    const createPersonalStructure = async (workspaceId: number) => {
        const checking = await prisma.account.create({
            data: { name: 'Conta PF Principal', type: 'CHECKING', balance: 0, workspaceId }
        });
        const catSalary = await prisma.category.create({
            data: { name: 'Salário / Pró-Labore', icon: '💰', workspaceId }
        });
        const catPersonal = await prisma.category.create({
            data: { name: 'Despesas Pessoais', icon: '🏠', workspaceId }
        });
        return { checkingId: checking.id, catSalaryId: catSalary.id, catPersonalId: catPersonal.id };
    };

    // BUSINESS structures para todos os clientes
    const structures: Record<string, WorkspaceStructure> = {};
    const businessKeys = [
        'joaoBusinessId', 'mariaBusinessId', 'pedroBusinessId',
        'anaBusinessId', 'lucasBusinessId', 'carlosBusinessId',
        'rafaelBusinessId', 'brunoBusinessId', 'thiagoBusinessId', 'danielBusinessId'
    ];

    for (const key of businessKeys) {
        const wsId = workspaces[key];
        if (wsId) {
            structures[key] = await createBusinessStructure(wsId);
        }
    }

    // PERSONAL structures
    const personalStructures: Record<string, any> = {};
    const personalKeys = [
        'joaoPersonalId', 'mariaPersonalId', 'pedroPersonalId',
        'anaPersonalId', 'lucasPersonalId', 'rafaelPersonalId',
        'brunoPersonalId', 'thiagoPersonalId', 'danielPersonalId'
    ];

    for (const key of personalKeys) {
        const wsId = workspaces[key];
        if (wsId) {
            personalStructures[key] = await createPersonalStructure(wsId);
        }
    }

    const totalAccounts = businessKeys.length * 3 + personalKeys.length;
    const totalCategories = businessKeys.length * 8 + personalKeys.length * 2;
    console.log(`  → ${totalAccounts} contas bancárias criadas`);
    console.log(`  → ${totalCategories} categorias criadas`);

    return { business: structures, personal: personalStructures };
}
