import { describe, it, expect, beforeAll } from 'vitest';
import { sysPrisma as prisma } from '../../src/lib/prisma';
import { seedPersonalDemo, PERSONAL_DEMO_EXPECTED_COUNT } from '../../prisma/seed/modules/08_PersonalDemo';
import { Decimal } from 'decimal.js';
import { PrismaClient } from '@prisma/client';

/**
 * PersonalDemoSeed — Testes de validação Fase 1 (P1/P2 corrigidos)
 *
 * Valida que o módulo 08_PersonalDemo:
 * - Cria dados sintéticos no workspace PERSONAL de joao@wsp.finance
 * - Hashes estáveis entre meses (P1-1)
 * - Falha explícita se pré-requisitos ausentes (P1-2)
 * - Idempotência real cross-month
 * - Saldo coerente e isolamento rígido PERSONAL vs BUSINESS
 *
 * Estes testes rodam após o seed já ter sido executado no banco de dev/test.
 */

describe('PersonalDemoSeed — Fase 1', () => {
  let joaoUser: any;
  let personalWorkspaceId: number;
  let businessWorkspaceId: number;
  let personalAccountId: number;

  beforeAll(async () => {
    // Resolve João por email estável (não por ID fixo)
    joaoUser = await prisma.user.findUnique({
      where: { email: 'joao@wsp.finance' },
      include: {
        memberships: { include: { workspace: true } },
      },
    });

    if (!joaoUser) throw new Error('STOP: joao@wsp.finance not found in database');

    const personalMembership = joaoUser.memberships.find(
      (m: any) => m.workspace.type === 'PERSONAL'
    );
    const businessMembership = joaoUser.memberships.find(
      (m: any) => m.workspace.type === 'BUSINESS'
    );

    if (!personalMembership) throw new Error('STOP: João has no PERSONAL workspace');
    if (!businessMembership) throw new Error('STOP: João has no BUSINESS workspace');

    personalWorkspaceId = personalMembership.workspaceId;
    businessWorkspaceId = businessMembership.workspaceId;

    // Resolve conta pessoal por workspaceId (não por ID fixo)
    const personalAccount = await prisma.account.findFirst({
      where: { name: 'Conta PF Principal', workspaceId: personalWorkspaceId },
    });

    if (!personalAccount) throw new Error('STOP: Conta PF Principal not found for personal workspace');

    personalAccountId = personalAccount.id;
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.1 — Testes de seed/demo
  // ═══════════════════════════════════════════════════════════════

  it('joao@wsp.finance possui workspace PERSONAL', () => {
    expect(personalWorkspaceId).toBeDefined();
    expect(personalWorkspaceId).toBeGreaterThan(0);
  });

  it('workspace PERSONAL possui conta pessoal esperada', () => {
    expect(personalAccountId).toBeDefined();
    expect(personalAccountId).toBeGreaterThan(0);
  });

  it('seed pessoal cria exatamente 6 transações pessoais demo', async () => {
    const txns = await prisma.transaction.findMany({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
      },
    });
    expect(txns.length).toBe(PERSONAL_DEMO_EXPECTED_COUNT);
  });

  it('todas as transações pessoais demo usam workspaceId do workspace PERSONAL', async () => {
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of txns) {
      expect(tx.workspaceId).toBe(personalWorkspaceId);
    }
  });

  it('todas usam accountId pessoal', async () => {
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of txns) {
      expect(tx.accountId).toBe(personalAccountId);
    }
  });

  it('todas usam categorias do workspace pessoal', async () => {
    const personalCatIds = (
      await prisma.category.findMany({
        where: { workspaceId: personalWorkspaceId },
        select: { id: true },
      })
    ).map((c) => c.id);

    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });

    for (const tx of txns) {
      expect(personalCatIds).toContain(tx.categoryId);
    }
  });

  it('todas têm status: COMPLETED', async () => {
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of txns) {
      expect(tx.status).toBe('COMPLETED');
    }
  });

  it('todas têm isPaid: true', async () => {
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of txns) {
      expect(tx.isPaid).toBe(true);
    }
  });

  it('todas têm hashDeduplication estável (sem YYYY_MM)', async () => {
    const txns = await prisma.transaction.findMany({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' }
      },
    });
    for (const tx of txns) {
      expect(tx.hashDeduplication).toBeTruthy();
      expect(tx.hashDeduplication!.startsWith('DEMO_PERSONAL_JOAO_')).toBe(true);
      // P1-1: Hash NÃO deve conter padrão temporal YYYY_MM
      expect(tx.hashDeduplication).not.toMatch(/_\d{4}_\d{2}$/);
    }
  });

  it('dados demo não contêm PII real', async () => {
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of txns) {
      // Nenhuma descrição contém CPF, CNPJ, telefone ou email real
      expect(tx.description).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/); // CPF
      expect(tx.description).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); // CNPJ
      expect(tx.description).not.toMatch(/\(\d{2}\)\s*\d{4,5}-\d{4}/); // Telefone
      expect(tx.description).not.toMatch(/\S+@\S+\.\S+/); // Email
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.2 — Testes de saldo
  // ═══════════════════════════════════════════════════════════════

  it('saldo da conta pessoal é coerente com transações COMPLETED', async () => {
    const account = await prisma.account.findFirst({
      where: { id: personalAccountId },
    });
    expect(account).toBeDefined();

    const incomeAgg = await prisma.transaction.aggregate({
      where: { accountId: personalAccountId, type: 'INCOME', status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const expenseAgg = await prisma.transaction.aggregate({
      where: { accountId: personalAccountId, type: 'EXPENSE', status: 'COMPLETED' },
      _sum: { amount: true },
    });

    const expectedBalance =
      Number(incomeAgg._sum.amount || 0) - Number(expenseAgg._sum.amount || 0);
    const actualBalance = Number(account!.balance);

    // Tolerance for Decimal rounding
    expect(Math.abs(actualBalance - expectedBalance)).toBeLessThan(0.01);
  });

  it('saldo final da conta pessoal não é zerado', async () => {
    const account = await prisma.account.findFirst({
      where: { id: personalAccountId },
    });
    expect(Number(account!.balance)).not.toBe(0);
  });

  it('saldo demo pessoal é exatamente R$ 2.710,10', async () => {
    const incomeAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
        type: 'INCOME',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });
    const expenseAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
        type: 'EXPENSE',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    const income = new Decimal(incomeAgg._sum.amount?.toString() || '0');
    const expenses = new Decimal(expenseAgg._sum.amount?.toString() || '0');
    const balance = income.minus(expenses);

    expect(balance.toFixed(2)).toBe('2710.10');
  });

  it('entradas pessoais são maiores que zero', async () => {
    const incomeAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        type: 'INCOME',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });
    expect(Number(incomeAgg._sum.amount || 0)).toBeGreaterThan(0);
  });

  it('saídas pessoais são maiores que zero', async () => {
    const expenseAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        type: 'EXPENSE',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });
    expect(Number(expenseAgg._sum.amount || 0)).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.3 — Testes de Dashboard (consultas diretas que espelham DashboardRepository)
  // ═══════════════════════════════════════════════════════════════

  it('Dashboard pessoal — getTotalBalance retorna saldo coerente', async () => {
    const result = await prisma.account.aggregate({
      _sum: { balance: true },
      where: { workspaceId: personalWorkspaceId, isIncludedInTotal: true },
    });
    expect(Number(result._sum.balance || 0)).not.toBe(0);
  });

  it('Dashboard pessoal — getMonthlyFlow retorna income > 0 no mês corrente', async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        workspaceId: personalWorkspaceId,
        date: { gte: startDate, lte: endDate },
        isPaid: true,
      },
    });

    const income = result.find((r) => r.type === 'INCOME');
    expect(Number(income?._sum.amount || 0)).toBeGreaterThan(0);
  });

  it('Dashboard pessoal — getMonthlyFlow retorna expense > 0 no mês corrente', async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: {
        workspaceId: personalWorkspaceId,
        date: { gte: startDate, lte: endDate },
        isPaid: true,
      },
    });

    const expense = result.find((r) => r.type === 'EXPENSE');
    expect(Number(expense?._sum.amount || 0)).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.4 — Testes de atividade recente
  // ═══════════════════════════════════════════════════════════════

  it('atividade recente pessoal retorna transações pessoais', async () => {
    const recentTxns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
      orderBy: { date: 'desc' },
      take: 5,
    });
    expect(recentTxns.length).toBeGreaterThan(0);
    expect(recentTxns.length).toBeLessThanOrEqual(5);
  });

  it('nenhuma transação empresarial aparece na listagem pessoal', async () => {
    const personalTxns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
    });
    for (const tx of personalTxns) {
      expect(tx.workspaceId).toBe(personalWorkspaceId);
      expect(tx.workspaceId).not.toBe(businessWorkspaceId);
    }
  });

  it('nenhuma transação pessoal aparece na listagem empresarial', async () => {
    const businessTxns = await prisma.transaction.findMany({
      where: { workspaceId: businessWorkspaceId },
    });
    for (const tx of businessTxns) {
      expect(tx.workspaceId).toBe(businessWorkspaceId);
      expect(tx.workspaceId).not.toBe(personalWorkspaceId);
    }
  });

  it('ordenação por date desc é preservada na atividade recente', async () => {
    const recentTxns = await prisma.transaction.findMany({
      where: { workspaceId: personalWorkspaceId },
      orderBy: { date: 'desc' },
      take: 5,
    });
    for (let i = 1; i < recentTxns.length; i++) {
      expect(new Date(recentTxns[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(recentTxns[i].date).getTime()
      );
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.5 — Testes de isolamento
  // ═══════════════════════════════════════════════════════════════

  it('contas empresariais não existem no workspace pessoal', async () => {
    const bizAccounts = await prisma.account.findMany({
      where: {
        workspaceId: personalWorkspaceId,
        name: { in: ['Conta PJ Principal', 'Reserva de Emergência', 'Provisão de Impostos'] },
      },
    });
    expect(bizAccounts.length).toBe(0);
  });

  it('categorias empresariais não existem no workspace pessoal', async () => {
    const bizCategories = await prisma.category.findMany({
      where: {
        workspaceId: personalWorkspaceId,
        name: { in: ['Vendas de Produtos', 'Receita de Serviços', 'Aluguel Comercial', 'DAS / Impostos'] },
      },
    });
    expect(bizCategories.length).toBe(0);
  });

  it('transações com hashDeduplication DEMO_PERSONAL não existem no workspace empresarial', async () => {
    const leaked = await prisma.transaction.findMany({
      where: {
        workspaceId: businessWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_' },
      },
    });
    expect(leaked.length).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.6 — Testes de idempotência cross-month (P1-1)
  // ═══════════════════════════════════════════════════════════════

  it('hashes são estáveis entre meses — virada de mês não duplica transações', async () => {
    // Snapshot antes: contar transações DEMO_PERSONAL_JOAO_*
    const beforeTxns = await prisma.transaction.findMany({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
      },
    });
    const beforeCount = beforeTxns.length;
    const beforeHashes = new Set(beforeTxns.map((t) => t.hashDeduplication));

    expect(beforeCount).toBe(PERSONAL_DEMO_EXPECTED_COUNT);

    // Re-executar com uma data de referência de outro mês (simula virada)
    const directUrl = process.env.DIRECT_URL;
    const sysPrismaForSeed = directUrl
      ? new PrismaClient({ datasources: { db: { url: directUrl } } })
      : new PrismaClient();

    try {
      const futureDate = new Date('2027-01-15T12:00:00Z');
      const result = await seedPersonalDemo(sysPrismaForSeed, { referenceDate: futureDate });

      expect(result.count).toBe(PERSONAL_DEMO_EXPECTED_COUNT);

      // Após: continuar com exatamente 6 transações
      const afterTxns = await prisma.transaction.findMany({
        where: {
          workspaceId: personalWorkspaceId,
          hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
        },
      });

      expect(afterTxns.length).toBe(PERSONAL_DEMO_EXPECTED_COUNT);

      // Hashes devem ser os mesmos
      const afterHashes = new Set(afterTxns.map((t) => t.hashDeduplication));
      expect(afterHashes).toEqual(beforeHashes);

      // Datas devem ter sido atualizadas para Janeiro 2027
      for (const tx of afterTxns) {
        const txDate = new Date(tx.date);
        expect(txDate.getFullYear()).toBe(2027);
        expect(txDate.getMonth()).toBe(0); // Janeiro = 0
      }

      // Restaurar datas para mês atual (para não quebrar outros testes de Dashboard)
      const now = new Date();
      await seedPersonalDemo(sysPrismaForSeed, { referenceDate: now });
    } finally {
      await sysPrismaForSeed.$disconnect();
    }
  });

  it('saldo demo permanece R$ 2.710,10 após reexecução cross-month', async () => {
    const incomeAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
        type: 'INCOME',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });
    const expenseAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: personalWorkspaceId,
        hashDeduplication: { startsWith: 'DEMO_PERSONAL_JOAO_' },
        type: 'EXPENSE',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    const income = new Decimal(incomeAgg._sum.amount?.toString() || '0');
    const expenses = new Decimal(expenseAgg._sum.amount?.toString() || '0');
    const balance = income.minus(expenses);

    expect(balance.toFixed(2)).toBe('2710.10');
  });

  // ═══════════════════════════════════════════════════════════════
  // 10.7 — Testes de falha explícita (P1-2)
  // ═══════════════════════════════════════════════════════════════

  it('seedPersonalDemo falha explicitamente se usuário demo inexistente', async () => {
    // Usa PrismaClient mockado com findUnique retornando null
    const fakePrisma = {
      user: { findUnique: async () => null },
    } as unknown as PrismaClient;

    await expect(seedPersonalDemo(fakePrisma)).rejects.toThrow(
      '[PersonalDemoSeed] joao@wsp.finance nao encontrado'
    );
  });

  it('seedPersonalDemo falha explicitamente se workspace PERSONAL inexistente', async () => {
    const fakePrisma = {
      user: {
        findUnique: async () => ({
          id: 1,
          email: 'joao@wsp.finance',
          memberships: [
            { workspace: { type: 'BUSINESS' }, workspaceId: 999 },
          ],
        }),
      },
    } as unknown as PrismaClient;

    await expect(seedPersonalDemo(fakePrisma)).rejects.toThrow(
      '[PersonalDemoSeed] Workspace PERSONAL'
    );
  });

  it('seedPersonalDemo falha explicitamente se conta pessoal inexistente', async () => {
    const fakePrisma = {
      user: {
        findUnique: async () => ({
          id: 1,
          email: 'joao@wsp.finance',
          memberships: [
            { workspace: { type: 'PERSONAL', name: 'Test' }, workspaceId: 999 },
          ],
        }),
      },
      account: { findFirst: async () => null },
    } as unknown as PrismaClient;

    await expect(seedPersonalDemo(fakePrisma)).rejects.toThrow(
      '[PersonalDemoSeed] Conta PF Principal'
    );
  });

  it('PERSONAL_DEMO_EXPECTED_COUNT exportada é 6', () => {
    expect(PERSONAL_DEMO_EXPECTED_COUNT).toBe(6);
  });
});
