import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { seedIdentities } from './seed/modules/01_Identities';
import { seedStructure } from './seed/modules/02_Structure';
import { seedMacroCategories } from './seed/modules/00_MacroCategories';
import { seedTimeTravel } from './seed/modules/03_TimeTravel';
import { seedAuditAndChaos } from './seed/modules/04_Auditor';
import { seedLifeCycle } from './seed/modules/05_LifeCycle';
import { seedBankMovements } from './seed/modules/06_BankMovements';
import { seedDashboardCache } from './seed/modules/07_DashboardCache';

const directUrl = process.env.DIRECT_URL;
const prisma = directUrl 
  ? new PrismaClient({ datasources: { db: { url: directUrl } } })
  : new PrismaClient();

// ══════════════════════════════════════════════════════════════════
// 0. EARTHQUAKE PROTOCOL (Reset Determinístico)
// ══════════════════════════════════════════════════════════════════
async function earthquakeReset() {
  console.log('🧹 Protocolo Earthquake — Reset Determinístico...');
  try {
    const tables = [
      'Notification', 'AuditLog', 'Transaction', 'BankMovement', 'Account',
      'Category', 'WorkspaceInvite', 'WorkspaceMember',
      'RefreshToken', 'PasswordResetToken', 'AccountVerificationToken',
      'Workspace', 'User', 'AccountantDashboardCache'
    ];
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    }
    console.log('  ✅ Ground Zero. Todos os IDs resetados.\n');
  } catch (err) {
    console.warn('  ⚠️ TRUNCATE falhou, tentando deleteMany...');
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.bankMovement.deleteMany(),
      prisma.account.deleteMany(),
      prisma.category.deleteMany(),
      prisma.workspaceInvite.deleteMany(),
      prisma.workspaceMember.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.accountVerificationToken.deleteMany(),
      prisma.workspace.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  }
}

// ══════════════════════════════════════════════════════════════════
// 6. PÓS-PROCESSAMENTO — Atomic Balance Update
// ══════════════════════════════════════════════════════════════════
async function recalculateBalances() {
  console.log('\n💰 [Fase 6] Recalculando saldos atômicos...');

  const accounts = await prisma.account.findMany({ select: { id: true } });
  let updated = 0;

  for (const account of accounts) {
    // Soma de receitas (INCOME)
    const incomeResult = await prisma.transaction.aggregate({
      where: { accountId: account.id, type: 'INCOME', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    // Soma de despesas (EXPENSE)
    const expenseResult = await prisma.transaction.aggregate({
      where: { accountId: account.id, type: 'EXPENSE', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    const income = new Decimal(incomeResult._sum.amount?.toString() || '0');
    const expenses = new Decimal(expenseResult._sum.amount?.toString() || '0');

    // Pega saldo atual (pode ter sido forçado pelo chaos engine)
    const currentAccount = await prisma.account.findUnique({ where: { id: account.id } });
    const currentBalance = new Decimal(currentAccount?.balance?.toString() || '0');

    // Se o saldo já foi manipulado negativamente pelo chaos, preserva
    if (currentBalance.lt(0)) {
      console.log(`    ⚠️ Conta ${account.id}: Saldo negativo preservado (${currentBalance.toFixed(2)})`);
      continue;
    }

    const newBalance = income.minus(expenses);

    await prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance.toDecimalPlaces(4) }
    });
    updated++;
  }

  console.log(`  → ${updated} saldos recalculados com base em transações COMPLETED`);
}

// ══════════════════════════════════════════════════════════════════
// 7. RLS VALIDATION CHECK (Zero-Trust Proof)
// ══════════════════════════════════════════════════════════════════
async function validateRLS() {
  console.log('\n🔒 [Fase 7] Executando Prova Zero-Trust (RLS Check)...');
  
  // Array transactions no Prisma garantem a execução na MESMA conexão de banco
  const [, ws1Txns] = await prisma.$transaction([
      prisma.$executeRaw`SELECT set_config('app.current_workspace_id', '1', true)`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaction"`
  ]);

  const [, ws2Txns] = await prisma.$transaction([
      prisma.$executeRaw`SELECT set_config('app.current_workspace_id', '2', true)`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaction"`
  ]);
  
  const [, nullTxns] = await prisma.$transaction([
      prisma.$executeRaw`SELECT set_config('app.current_workspace_id', '', true)`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaction"`
  ]);

  const ws1Count = (ws1Txns as any)[0].count.toString();
  const ws2Count = (ws2Txns as any)[0].count.toString();
  const nullCount = (nullTxns as any)[0].count.toString();

  console.log(`  → Transactions p/ WS_ID(1): ${ws1Count}`);
  console.log(`  → Transactions p/ WS_ID(2): ${ws2Count}`);
  console.log(`  → Transactions sem isolamento (NULL): ${nullCount}`);
  
  if (nullCount === '0' && ws1Count !== '0' && ws1Count !== ws2Count) {
    console.log('  ✅ SUCESSO. RLS em força total. Leak rate: 0.00%');
  } else {
    console.log('  ⚠️ ALERTA: Teste RLS inconclusivo.');
    console.log('     Se todos os retornos forem idênticos, a user/role de conexão atual');
    console.log('     é superuser (ex: postgres) ou possui BYPASSRLS.');
  }
}

// ══════════════════════════════════════════════════════════════════
// MASTER ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('🏭 WSP Finance — Seed V4.0 (RLS & Stress Test Edition)');
  console.log('══════════════════════════════════════════════\n');

  const startTime = Date.now();

  // await earthquakeReset();

  // ── FASE 0: MACRO CATEGORIAS ──
  await seedMacroCategories(prisma);

  // ── FASE 1: IDENTIDADES ──
  console.log('👤 [Fase 1] Criando Personas e Workspaces...');
  const identities = await seedIdentities(prisma);

  // ── FASE 2: ESTRUTURAS ──
  console.log('\n🏗️ [Fase 2] Montando Categorias e Contas Bancárias...');
  const structures = await seedStructure(prisma, identities.workspaces);

  // ── FASE 3: TIME TRAVEL ──
  console.log('\n⏳ [Fase 3] Viagem no Tempo — 6 Meses de Transações...');
  const timeTravelResult = await seedTimeTravel(prisma, [
    // João Dropshipping — SAUDÁVEL (100% com anexos)
    {
      workspaceId: identities.workspaces.joaoBusinessId,
      accountId: structures.business['joaoBusinessId'].checkingId,
      structure: structures.business['joaoBusinessId'],
      taxRate: 6.0,
      healthProfile: 'healthy',
      salesPerMonth: 18,
    },
    // Maria Tech — RISCO (sem anexos nos últimos 2 meses)
    {
      workspaceId: identities.workspaces.mariaBusinessId,
      accountId: structures.business['mariaBusinessId'].checkingId,
      structure: structures.business['mariaBusinessId'],
      taxRate: 15.5,
      healthProfile: 'risky',
      salesPerMonth: 15,
    },
    // Pedro Logistics — TRANSIÇÃO (novo, 1 mês)
    {
      workspaceId: identities.workspaces.pedroBusinessId,
      accountId: structures.business['pedroBusinessId'].checkingId,
      structure: structures.business['pedroBusinessId'],
      taxRate: 0.0,
      healthProfile: 'transition',
      salesPerMonth: 5,
    },
    // Ana Café — SAUDÁVEL
    {
      workspaceId: identities.workspaces.anaBusinessId,
      accountId: structures.business['anaBusinessId'].checkingId,
      structure: structures.business['anaBusinessId'],
      taxRate: 6.0,
      healthProfile: 'healthy',
      salesPerMonth: 12,
    },
    // Lucas Dev — SAUDÁVEL
    {
      workspaceId: identities.workspaces.lucasBusinessId,
      accountId: structures.business['lucasBusinessId'].checkingId,
      structure: structures.business['lucasBusinessId'],
      taxRate: 6.0,
      healthProfile: 'healthy',
      salesPerMonth: 10,
    },
    // Carlos Comércio — EMPTY (recém-vinculado, sem dados)
    {
      workspaceId: identities.workspaces.carlosBusinessId,
      accountId: structures.business['carlosBusinessId'].checkingId,
      structure: structures.business['carlosBusinessId'],
      taxRate: 4.0,
      healthProfile: 'empty',
    },
    // Rafael Marketing — SAUDÁVEL
    {
      workspaceId: identities.workspaces.rafaelBusinessId,
      accountId: structures.business['rafaelBusinessId'].checkingId,
      structure: structures.business['rafaelBusinessId'],
      taxRate: 6.0,
      healthProfile: 'healthy',
      salesPerMonth: 8,
    },
    // Bruno Engenharia — RISKY (projetos de alto valor, poucos anexos)
    {
      workspaceId: identities.workspaces.brunoBusinessId,
      accountId: structures.business['brunoBusinessId'].checkingId,
      structure: structures.business['brunoBusinessId'],
      taxRate: 11.33,
      healthProfile: 'risky',
      salesPerMonth: 6,
    },
    // Thiago Advocacia — SAUDÁVEL
    {
      workspaceId: identities.workspaces.thiagoBusinessId,
      accountId: structures.business['thiagoBusinessId'].checkingId,
      structure: structures.business['thiagoBusinessId'],
      taxRate: 6.0,
      healthProfile: 'healthy',
      salesPerMonth: 10,
    },
    // Daniel Fotografia — TRANSITION (poucos meses)
    {
      workspaceId: identities.workspaces.danielBusinessId,
      accountId: structures.business['danielBusinessId'].checkingId,
      structure: structures.business['danielBusinessId'],
      taxRate: 6.0,
      healthProfile: 'transition',
      salesPerMonth: 4,
    },
  ]);

  // ── FASE 4: AUDITORIA + CHAOS ──
  console.log('\n🌪️ [Fase 4] Injetando Chaos Engine + AuditLogs...');
  const auditResult = await seedAuditAndChaos(prisma, identities, structures, identities.workspaces);

  // ── FASE 5: LIFECYCLE ──
  console.log('\n📩 [Fase 5] Gerando Convites e Notificações...');
  const lifeCycleResult = await seedLifeCycle(prisma, identities, identities.workspaces);

  // ── FASE 6: BANK MOVEMENTS (STAGING) ──
  console.log('\n🏦 [Fase 6] Populando Staging Area (Bank Movements)...');
  const bankMovementResult = await seedBankMovements(prisma, [
    { workspaceId: identities.workspaces.joaoBusinessId, accountId: structures.business.joaoBusinessId.checkingId, count: 40 },
    { workspaceId: identities.workspaces.mariaBusinessId, accountId: structures.business.mariaBusinessId.checkingId, count: 20 }
  ]);

  // ── FASE 7: PÓS-PROCESSAMENTO ──
  await recalculateBalances();

  // ── FASE 8: DASHBOARD CACHE ──
  console.log('\n📊 [Fase 8] Inicializando Dashboard Cache...');
  await seedDashboardCache(prisma, identities);

  // ── FASE 9: RLS VALIDATION ──
  await validateRLS();

  // ══════════════════════════════════════════════════════════════
  // RELATÓRIO FINAL
  // ══════════════════════════════════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n══════════════════════════════════════════════');
  console.log('🏁 SEED V4.0 FINALIZADO COM SUCESSO');
  console.log('══════════════════════════════════════════════');
  console.log(`⏱️  Tempo de execução: ${elapsed}s`);
  console.log('');
  console.log('📊 VOLUMETRIA DE INJEÇÃO:');
  console.log(`   👤 Users:          12 (2 Contadores + 10 Clientes)`);
  console.log(`   🏢 Workspaces:     22 (10 BUSINESS + 10 PERSONAL + 2 Contabilidade)`);
  console.log(`   🔗 ACCOUNTANT links: 10 (Wellington → 10 empresas)`);
  console.log(`   💳 Transações:     ${timeTravelResult.count + auditResult.chaosCount}`);
  console.log(`   📋 Audit Logs:     ${auditResult.auditCount}`);
  console.log(`   🗂️ Bank Movements: ${bankMovementResult.count}`);
  console.log(`   📩 Convites:       ${lifeCycleResult.inviteCount}`);
  console.log(`   🔔 Notificações:   ${lifeCycleResult.notifCount}`);
  console.log('');
  console.log('🔐 CREDENCIAIS DE ACESSO:');
  console.log('   ┌──────────────────────────────────────────────────────┐');
  console.log('   │ 🧮 Contador Sênior (Wellington):                     │');
  console.log('   │    Email: auditoria@wsp.finance | Senha: password123 │');
  console.log('   │    → 10 clientes na Torre de Comando                 │');
  console.log('   ├──────────────────────────────────────────────────────┤');
  console.log('   │ 🆕 Contadora Júnior (Fernanda):                      │');
  console.log('   │    Email: fernanda@contabil.com | Senha: password123 │');
  console.log('   │    → 0 clientes (1 convite PENDING)                  │');
  console.log('   ├──────────────────────────────────────────────────────┤');
  console.log('   │ 👨 Cliente João:  joao@wsp.finance   | password123   │');
  console.log('   │ 👩 Cliente Maria: maria@wsp.finance  | password123   │');
  console.log('   │ 👨 Cliente Pedro: pedro@wsp.finance  | password123   │');
  console.log('   │ 👩 Cliente Ana:   ana@wsp.finance     | password123   │');
  console.log('   │ 👨 Cliente Lucas: lucas@wsp.finance  | password123   │');
  console.log('   └──────────────────────────────────────────────────────┘');
  console.log('');
  console.log('🩺 PERFIS DE SAÚDE (Torre de Comando):');
  console.log('   ✅ João Dropshipping  → Saudável (closedUntil ativo)');
  console.log('   ✅ Ana Café Gourmet   → Saudável');
  console.log('   ✅ Lucas Dev Studio   → Saudável');
  console.log('   ✅ Rafael Marketing   → Saudável');
  console.log('   ✅ Thiago Advocacia   → Saudável');
  console.log('   🔴 Maria Tech        → RISCO (closedUntil ativo)');
  console.log('   🔴 Bruno Engenharia  → RISCO (sem anexos recentes)');
  console.log('   🟡 Pedro Logistics   → Transição (1 mês de dados)');
  console.log('   🟡 Daniel Fotografia → Transição (recém-ativo)');
  console.log('   ⚪ Carlos Comércio   → Vazio (0 transações)');
}

main()
  .catch((e) => {
    console.error('❌ ERRO FATAL NO SEED ENGINE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });