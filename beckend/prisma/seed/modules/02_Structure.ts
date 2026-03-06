import { PrismaClient } from '@prisma/client';

export async function seedCategoriesAndAccounts(prisma: PrismaClient, identities: any) {

    const createStructureForWorkspace = async (workspaceId: number) => {
        // 1. Contas Correntes
        const checkingAccount = await prisma.account.create({
            data: { name: 'Conta PJ Nubank', type: 'CHECKING', balance: 0, workspaceId }
        });

        const cashAccount = await prisma.account.create({
            data: { name: 'Caixa Local', type: 'CASH', balance: 0, workspaceId }
        });

        // 2. Plano de Categorias Padrão
        const catSales = await prisma.category.create({ data: { name: 'Vendas de Produtos', workspaceId } });
        const catServices = await prisma.category.create({ data: { name: 'Receita de Serviços', workspaceId } });
        const catPayroll = await prisma.category.create({ data: { name: 'Pagamento Pró-Labore', workspaceId } });
        const catEnergy = await prisma.category.create({ data: { name: 'Energia Elétrica', workspaceId } });
        const catFees = await prisma.category.create({ data: { name: 'Taxas e Impostos', workspaceId } });

        return {
            checkingId: checkingAccount.id,
            cashId: cashAccount.id,
            catSalesId: catSales.id,
            catServicesId: catServices.id,
            catPayrollId: catPayroll.id,
            catEnergyId: catEnergy.id,
            catFeesId: catFees.id
        };
    };

    const joaoBusinessStruct = await createStructureForWorkspace(identities.joaoBusinessId);
    const mariaBusinessStruct = await createStructureForWorkspace(identities.mariaBusinessId);

    // A Conta Pessoal do João tem estrutura diferente
    const joaoPersonalAcct = await prisma.account.create({
        data: { name: 'Itaú Pessoa Física', type: 'CHECKING', balance: 0, workspaceId: identities.joaoPersonalId }
    });
    const catSalaryPersonal = await prisma.category.create({ data: { name: 'Salário/Pró-Labore', workspaceId: identities.joaoPersonalId } });

    return {
        joaoB2B: joaoBusinessStruct,
        mariaB2B: mariaBusinessStruct,
        joaoPersonal: { checkingId: joaoPersonalAcct.id, catSalaryId: catSalaryPersonal.id }
    };
}
