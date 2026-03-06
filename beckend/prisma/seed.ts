import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

// ==============================================================================
// 1. EARTHQUAKE PROTOCOL (RESET)
// ==============================================================================
async function earthquakeReset() {
  console.log('🧹 Iniciando Protocolo Earthquake (Reset Determinístico)...');
  try {
    const tableNames = [
      'AuditLog',
      'Transaction',
      'Account',
      'Category',
      'WorkspaceInvite',
      'WorkspaceMember',
      'Workspace',
      'User'
    ];
    for (const tableName of tableNames) {
      console.log(`- Truncando: ${tableName}`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
    }
    console.log('✅ Ground Zero Estabelecido. Todos os IDs resetados para 1.\n');
  } catch (err) {
    console.warn('⚠️ Falha no TRUNCATE CASCADE. Tentando fallback para SQLite (deleteMany)...');
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.category.deleteMany(),
      prisma.workspaceInvite.deleteMany(),
      prisma.workspaceMember.deleteMany(),
      prisma.workspace.deleteMany(),
      prisma.user.deleteMany()
    ]);
  }
}

// ==============================================================================
// 2. IDENTIDADES
// ==============================================================================
async function seedIdentities() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const wellington = await prisma.user.create({
    data: { name: 'Wellington Contador', email: 'auditoria@wsp.finance', passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'WSP Consultoria', type: 'BUSINESS' } } } } },
    include: { memberships: true }
  });

  const joao = await prisma.user.create({
    data: { name: 'João Silva', email: 'joao@wsp.finance', passwordHash, memberships: { create: [{ role: 'OWNER', workspace: { create: { name: 'Conta Pessoal do João', type: 'PERSONAL' } } }, { role: 'OWNER', workspace: { create: { name: 'João Dropshipping LTDA', type: 'BUSINESS', taxRate: 6.00 } } }] } },
    include: { memberships: { include: { workspace: true } } }
  });

  const maria = await prisma.user.create({
    data: { name: 'Maria Oliveira', email: 'maria@wsp.finance', passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'Maria Tech Solutions', type: 'BUSINESS', taxRate: 15.50 } } } } },
    include: { memberships: { include: { workspace: true } } }
  });

  const carlos = await prisma.user.create({
    data: { name: 'Carlos O Vazio', email: 'vazio@wsp.finance', passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'Empresa do Carlos', type: 'BUSINESS' } } } } }
  });

  const joaoBusinessId = joao.memberships.find(m => m.workspace.type === 'BUSINESS')?.workspaceId!;
  await prisma.workspaceMember.create({ data: { userId: wellington.id, workspaceId: joaoBusinessId, role: 'ACCOUNTANT' } });

  const mariaBusinessId = maria.memberships[0].workspaceId;
  await prisma.workspaceMember.create({ data: { userId: wellington.id, workspaceId: mariaBusinessId, role: 'ACCOUNTANT' } });

  const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 2);
  await prisma.workspaceInvite.create({ data: { email: 'novo_auditor@teste.com', role: 'ACCOUNTANT', token: 'token_fake_123', status: 'PENDING', workspaceId: joaoBusinessId, inviterId: joao.id, expiresAt: new Date(new Date().setDate(new Date().getDate() + 5)) } });
  await prisma.workspaceInvite.create({ data: { email: 'perdido@teste.com', role: 'ACCOUNTANT', token: 'token_perdido_123', status: 'EXPIRED', workspaceId: mariaBusinessId, inviterId: maria.id, expiresAt: pastDate } });

  return { wellington, joao, joaoBusinessId, joaoPersonalId: joao.memberships.find(m => m.workspace.type === 'PERSONAL')?.workspaceId!, maria, mariaBusinessId, carlos };
}

// ==============================================================================
// 3. ESTRUTURAS BÁSICAS (BANCO)
// ==============================================================================
async function seedCategoriesAndAccounts(identities: any) {
  const createStructureForWorkspace = async (workspaceId: number) => {
    const checkingAccount = await prisma.account.create({ data: { name: 'Conta PJ Nubank', type: 'CHECKING', balance: 0, workspaceId } });
    const cashAccount = await prisma.account.create({ data: { name: 'Caixa Local', type: 'CASH', balance: 0, workspaceId } });
    const catSales = await prisma.category.create({ data: { name: 'Vendas de Produtos', workspaceId } });
    const catEnergy = await prisma.category.create({ data: { name: 'Energia Elétrica', workspaceId } });
    const catFees = await prisma.category.create({ data: { name: 'Taxas e Impostos', workspaceId } });
    return { checkingId: checkingAccount.id, cashId: cashAccount.id, catSalesId: catSales.id, catEnergyId: catEnergy.id, catFeesId: catFees.id };
  };

  const joaoBusinessStruct = await createStructureForWorkspace(identities.joaoBusinessId);
  const mariaBusinessStruct = await createStructureForWorkspace(identities.mariaBusinessId);
  const joaoPersonalAcct = await prisma.account.create({ data: { name: 'Itaú Pessoa Física', type: 'CHECKING', balance: 0, workspaceId: identities.joaoPersonalId } });

  return { joaoB2B: joaoBusinessStruct, mariaB2B: mariaBusinessStruct, joaoPersonal: { checkingId: joaoPersonalAcct.id } };
}

// ==============================================================================
// 4. MOTOR DO TEMPO
// ==============================================================================
async function seedSazonalTransactions(identities: any, structure: any) {
  let count = 0;
  const generateRetroactiveMonths = async (workspaceId: number, acctId: number, catIncomeId: number, catExpenseId: number, taxRate: number) => {
    const today = new Date();
    for (let m = 6; m >= 0; m--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
      const isBlackFriday = targetDate.getMonth() === 10;
      const salesVolumeCount = isBlackFriday ? 45 : 15;

      for (let i = 0; i < salesVolumeCount; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const txDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
        const gross = new Decimal(Math.random() * 500 + 50);
        const platformFee = gross.mul(0.18);
        const taxAmount = gross.mul(taxRate / 100);
        const net = gross.minus(platformFee).minus(taxAmount);

        await prisma.transaction.create({ data: { accountId: acctId, categoryId: catIncomeId, workspaceId: workspaceId, type: 'INCOME', status: 'COMPLETED', description: `Venda E-commerce #${m}${i}`, date: txDate, grossAmount: gross, feeAmount: platformFee, platformFeeRate: new Decimal(18.0), taxAmount: taxAmount, amount: net, netValue: net } });
        count++;
      }
      await prisma.transaction.create({ data: { accountId: acctId, categoryId: catExpenseId, workspaceId: workspaceId, type: 'EXPENSE', status: 'COMPLETED', description: `Conta de Energia B2B - Mês ${targetDate.getMonth() + 1}`, date: new Date(targetDate.getFullYear(), targetDate.getMonth(), 10), amount: new Decimal("250.75") } });
      count++;
    }
  };

  await generateRetroactiveMonths(identities.joaoBusinessId, structure.joaoB2B.checkingId, structure.joaoB2B.catSalesId, structure.joaoB2B.catEnergyId, 6.0);
  await generateRetroactiveMonths(identities.mariaBusinessId, structure.mariaB2B.checkingId, structure.mariaB2B.catSalesId, structure.mariaB2B.catEnergyId, 15.5);
  return count;
}

// ==============================================================================
// 5. CAOS ENGINE E AUDITORIA
// ==============================================================================
async function executeChaosAndAudit(identities: any, structure: any) {
  let count = 0;
  const pastDate = new Date(); pastDate.setMonth(pastDate.getMonth() - 3);

  await prisma.transaction.create({ data: { description: 'Documento Fictício Bloqueado Judicialmente (Inadimplência)', amount: new Decimal('5000.00'), date: pastDate, dueDate: pastDate, type: 'EXPENSE', status: 'PENDING', accountId: structure.joaoB2B.checkingId, categoryId: structure.joaoB2B.catFeesId, workspaceId: identities.joaoBusinessId } }); count++;
  await prisma.transaction.create({ data: { description: 'Aquisição de suprimentos de informática urgentes contendo 35 monitores, 12 teclados mecânicos importados da Alemanha onde o fornecedor atrasou a entrega no porto de Santos e gerou uma multa aduaneira massiva que precisamos contestar.', amount: new Decimal('125000.00'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.mariaB2B.checkingId, categoryId: structure.mariaB2B.catEnergyId, workspaceId: identities.mariaBusinessId } }); count++;
  await prisma.account.update({ where: { id: structure.joaoB2B.cashId }, data: { balance: new Decimal('-1450.99') } });
  await prisma.transaction.create({ data: { description: 'Rateio de Custo Fixo (1/3 de 1000)', amount: new Decimal('333.3333'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.joaoB2B.checkingId, categoryId: structure.joaoB2B.catEnergyId, workspaceId: identities.joaoBusinessId } }); count++;

  // Audit
  const txAlvo = await prisma.transaction.create({ data: { description: 'Compra Suspeita de Servidor', amount: new Decimal('500.00'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.mariaB2B.checkingId, categoryId: structure.mariaB2B.catEnergyId, workspaceId: identities.mariaBusinessId } }); count++;
  await prisma.auditLog.create({ data: { userId: identities.maria.id, workspaceId: identities.mariaBusinessId, action: 'CREATE', entity: 'Transaction', entityId: txAlvo.id, newState: JSON.parse(JSON.stringify(txAlvo)), ipAddress: '192.168.0.1' } });
  const transAtualizada = await prisma.transaction.update({ where: { id: txAlvo.id }, data: { amount: new Decimal('200.00'), description: 'Compra de Cadernos' } });
  await prisma.auditLog.create({ data: { userId: identities.maria.id, workspaceId: identities.mariaBusinessId, action: 'UPDATE', entity: 'Transaction', entityId: transAtualizada.id, oldState: JSON.parse(JSON.stringify(txAlvo)), newState: JSON.parse(JSON.stringify(transAtualizada)), ipAddress: '192.168.0.1' } });

  return count;
}

// ==============================================================================
// MASTER ORCHESTRATOR
// ==============================================================================
async function main() {
  console.log('🏭 WSP Finance - The Realistic Engine (Seed V2.2) 🏭\n');
  await earthquakeReset();

  console.log('🚀 [Fase 1] Criando Atores (Owner, Negócios e Contador)...');
  const identitiesMap = await seedIdentities();

  console.log('🏗️ [Fase 2] Montando Categorias e Contas Correntes...');
  const structureMap = await seedCategoriesAndAccounts(identitiesMap);

  console.log('⏳ [Fase 3] Iniciando Viagem no Tempo e Picos de Vendas (M-6)...');
  const txCount = await seedSazonalTransactions(identitiesMap, structureMap);

  console.log('🌪️ [Fase 4 e 5] Injetando Casos de Borda, Stress Decimal e Governança Sintética...');
  const mixCount = await executeChaosAndAudit(identitiesMap, structureMap);

  console.log('\n=============================================');
  console.log('🏁 SEED FINALIZADO COM SUCESSO (V2.2)');
  console.log('=============================================');
  console.log(`\n👨‍💼 Login Contador (Wellington): auditoria@wsp.finance | password123`);
  console.log(`👨‍🔧 Login Cliente (João): joao@wsp.finance | password123`);
  console.log(`👩‍💼 Login Cliente (Maria): maria@wsp.finance | password123`);
  console.log(`👻 Login Fantasma (Carlos): vazio@wsp.finance | password123`);
}

main()
  .catch((e) => {
    console.error('❌ ERRO FATAL NO SEED ENGINE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });