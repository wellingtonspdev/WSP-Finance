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
    { name: 'Vendas de Produtos', icon: '🛒', macroCode: 'REV_PRO' },
    { name: 'Receita de Serviços', icon: '💼', macroCode: 'REV_SRV' },
    { name: 'Rendimentos Financeiros', icon: '📈', macroCode: 'REV_SRV' },
    // Despesas
    { name: 'Aluguel Comercial', icon: '🏢', macroCode: 'DES_ALU' },
    { name: 'Energia Elétrica', icon: '⚡', macroCode: 'DES_TAR' },
    { name: 'Internet / Telecom', icon: '📡', macroCode: 'DES_TAR' },
    { name: 'Salários / Pró-Labore', icon: '👨‍💼', macroCode: 'PRO_LAB' },
    { name: 'DAS / Impostos', icon: '🏛️', macroCode: 'TAX_SIM' },
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
        // Contas Bancárias (3 por workspace) — idempotente
        const findOrCreateAccount = async (name: string, type: 'CHECKING' | 'SAVINGS') => {
            let account = await prisma.account.findFirst({ where: { name, workspaceId } });
            if (!account) {
                console.log('Creating account', name, 'for workspace', workspaceId);
                account = await prisma.account.create({
                    data: { name, type, balance: 0, workspaceId }
                });
            }
            return account;
        };

        const checking = await findOrCreateAccount('Conta PJ Principal', 'CHECKING');
        const reserve = await findOrCreateAccount('Reserva de Emergência', 'SAVINGS');
        const taxAccount = await findOrCreateAccount('Provisão de Impostos', 'SAVINGS');

        // Categorias (8 por workspace) — idempotente + fix duplicates from legacy seeds
        const cats = [];
        for (const cat of CATEGORY_BLUEPRINT) {
            const macro = await prisma.macroCategory.findUnique({ where: { code: cat.macroCode } });
            let created = await prisma.category.findFirst({ where: { name: cat.name, workspaceId } });
            if (!created) {
                console.log('Creating category', cat.name, 'for workspace', workspaceId);
                created = await prisma.category.create({
                    data: { name: cat.name, icon: cat.icon, workspaceId, macroCategoryId: macro?.id }
                });
            }
            // Update ALL categories with this name in this workspace to the correct macro
            // (fixes duplicates created by previous non-idempotent seed runs)
            if (macro) {
                const updated = await prisma.category.updateMany({
                    where: { name: cat.name, workspaceId, NOT: { macroCategoryId: macro.id } },
                    data: { macroCategoryId: macro.id }
                });
                if (updated.count > 0) {
                    console.log(`Updated ${updated.count} duplicate(s) of category ${cat.name} in workspace ${workspaceId}`);
                }
            }
            cats.push(created);
        }

        // Configuração de Exportação Contábil
        console.log('Upserting accounting config for workspace', workspaceId);
        await prisma.accountingExportConfig.upsert({
            where: { workspaceId_layoutId: { workspaceId, layoutId: 'dominio-separated-v1' } },
            update: { targetSystem: 'DOMINIO', companyCode: '000001', branchCode: '0001', sourceLabel: 'WSP', historyCodeRequired: false, isActive: true },
            create: { workspaceId, layoutId: 'dominio-separated-v1', targetSystem: 'DOMINIO', companyCode: '000001', branchCode: '0001', sourceLabel: 'WSP', historyCodeRequired: false, isActive: true }
        });

        // Mapeamentos de Exportação para todas as macros do catálogo WSP (inclui OUT_GEN para legacy)
        const mappingsDict: Record<string, { debit: string; credit: string; history: string }> = {
            'REV_SRV': { debit: '11201', credit: '31101', history: '001' },
            'REV_PRO': { debit: '11201', credit: '31201', history: '002' },
            'DES_TAR': { debit: '42101', credit: '11201', history: '101' },
            'DES_ALU': { debit: '42201', credit: '11201', history: '102' },
            'TAX_SIM': { debit: '43101', credit: '11201', history: '201' },
            'PRO_LAB': { debit: '44101', credit: '11201', history: '301' },
            'OUT_GEN': { debit: '49999', credit: '11201', history: '999' },
        };

        for (const code of Object.keys(mappingsDict)) {
            const macro = await prisma.macroCategory.findUnique({ where: { code } });
            if (macro) {
                const mapValues = mappingsDict[code];
                console.log(`Upserting accounting mapping for macro ${code} in workspace`, workspaceId);
                await prisma.accountingExportMapping.upsert({
                    where: { workspaceId_macroCategoryId_layoutId: { workspaceId, macroCategoryId: macro.id, layoutId: 'dominio-separated-v1' } },
                    update: { debitAccountCode: mapValues.debit, creditAccountCode: mapValues.credit, historyCode: mapValues.history, targetSystem: 'DOMINIO', isActive: true },
                    create: { workspaceId, macroCategoryId: macro.id, layoutId: 'dominio-separated-v1', targetSystem: 'DOMINIO', debitAccountCode: mapValues.debit, creditAccountCode: mapValues.credit, historyCode: mapValues.history, isActive: true }
                });
            }
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
        let checking = await prisma.account.findFirst({ where: { name: 'Conta PF Principal', workspaceId } });
        if (!checking) {
            checking = await prisma.account.create({
                data: { name: 'Conta PF Principal', type: 'CHECKING', balance: 0, workspaceId }
            });
        }
        let catSalary = await prisma.category.findFirst({ where: { name: 'Salário / Pró-Labore', workspaceId } });
        if (!catSalary) {
            catSalary = await prisma.category.create({
                data: { name: 'Salário / Pró-Labore', icon: '💰', workspaceId }
            });
        }
        let catPersonal = await prisma.category.findFirst({ where: { name: 'Despesas Pessoais', workspaceId } });
        if (!catPersonal) {
            catPersonal = await prisma.category.create({
                data: { name: 'Despesas Pessoais', icon: '🏠', workspaceId }
            });
        }
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
