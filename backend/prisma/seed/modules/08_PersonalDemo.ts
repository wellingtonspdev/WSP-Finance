import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * MÓDULO 08 — PERSONAL DEMO (Dados Pessoais Sintéticos) — Fase 1
 *
 * Popula o workspace PERSONAL de joao@wsp.finance com transações
 * financeiras sintéticas, idempotentes e tenant-scoped.
 *
 * Regras:
 *  - Resolve usuário, workspace, conta e categorias por chaves estáveis
 *  - Usa upsert com unique composto [workspaceId, hashDeduplication]
 *  - Hashes estáveis entre meses (sem YYYY_MM) — P1-1 corrigido
 *  - Datas atualizadas no upsert.update para mês corrente (Dashboard mensal)
 *  - Dados 100% sintéticos (sem PII real)
 *  - status: COMPLETED, isPaid: true
 *  - Narrativa: pró-labore + despesas pessoais comuns
 *  - Falha explícita se pré-requisitos obrigatórios ausentes — P1-2 corrigido
 */

export const PERSONAL_DEMO_EXPECTED_COUNT = 6;

export interface PersonalDemoResult {
  count: number;
  workspaceId: number;
}

export interface PersonalDemoOptions {
  /** Data de referência para gerar as datas das transações (testes de idempotência cross-month) */
  referenceDate?: Date;
}

/**
 * Transações pessoais demo para a narrativa MVP.
 *
 * Padrão do hash: DEMO_PERSONAL_JOAO_{TIPO} (estável entre meses)
 * Isso garante idempotência verdadeira: rodar em qualquer mês não duplica.
 * A date é atualizada via upsert.update para manter Dashboard mensal funcional.
 */
function getPersonalTransactions() {
  return [
    // INCOME: Retirada demonstrativa do sócio
    {
      type: 'INCOME' as const,
      description: 'Retirada demonstrativa do sócio',
      amount: new Decimal('8500.0000'),
      catKey: 'salary', // Salário / Pró-Labore
      hashDeduplication: 'DEMO_PERSONAL_JOAO_PROLABORE',
      day: 5,
    },
    // EXPENSES
    {
      type: 'EXPENSE' as const,
      description: 'Mercado demonstrativo',
      amount: new Decimal('1850.0000'),
      catKey: 'personal', // Despesas Pessoais
      hashDeduplication: 'DEMO_PERSONAL_JOAO_MERCADO',
      day: 8,
    },
    {
      type: 'EXPENSE' as const,
      description: 'Aluguel residencial demonstrativo',
      amount: new Decimal('2200.0000'),
      catKey: 'personal',
      hashDeduplication: 'DEMO_PERSONAL_JOAO_ALUGUEL',
      day: 10,
    },
    {
      type: 'EXPENSE' as const,
      description: 'Transporte demonstrativo',
      amount: new Decimal('450.0000'),
      catKey: 'personal',
      hashDeduplication: 'DEMO_PERSONAL_JOAO_TRANSPORTE',
      day: 15,
    },
    {
      type: 'EXPENSE' as const,
      description: 'Cartao demonstrativo',
      amount: new Decimal('1200.0000'),
      catKey: 'personal',
      hashDeduplication: 'DEMO_PERSONAL_JOAO_CARTAO',
      day: 20,
    },
    {
      type: 'EXPENSE' as const,
      description: 'Assinatura servico pessoal demonstrativo',
      amount: new Decimal('89.9000'),
      catKey: 'personal',
      hashDeduplication: 'DEMO_PERSONAL_JOAO_ASSINATURA',
      day: 12,
    },
  ];
}

export async function seedPersonalDemo(
  prisma: PrismaClient,
  options?: PersonalDemoOptions
): Promise<PersonalDemoResult> {
  console.log('\n👤 [Fase 8] Populando workspace PERSONAL demo (joao@wsp.finance)...');

  // ═══════════════════════════════════════════════════════════════
  // 1. Resolver João por email estável
  // ═══════════════════════════════════════════════════════════════
  const joao = await prisma.user.findUnique({
    where: { email: 'joao@wsp.finance' },
    include: {
      memberships: { include: { workspace: true } },
    },
  });

  if (!joao) {
    throw new Error('[PersonalDemoSeed] joao@wsp.finance nao encontrado no banco. Seed pessoal abortado.');
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Resolver workspace PERSONAL por membership/tipo
  // ═══════════════════════════════════════════════════════════════
  const personalMembership = joao.memberships.find(
    (m) => m.workspace.type === 'PERSONAL'
  );

  if (!personalMembership) {
    throw new Error('[PersonalDemoSeed] Workspace PERSONAL de joao@wsp.finance nao encontrado. Seed pessoal abortado.');
  }

  const workspaceId = personalMembership.workspaceId;
  console.log(`  → Workspace PERSONAL encontrado: ID ${workspaceId} ("${personalMembership.workspace.name}")`);

  // ═══════════════════════════════════════════════════════════════
  // 3. Resolver conta pessoal por workspaceId
  // ═══════════════════════════════════════════════════════════════
  const personalAccount = await prisma.account.findFirst({
    where: { name: 'Conta PF Principal', workspaceId },
  });

  if (!personalAccount) {
    throw new Error('[PersonalDemoSeed] Conta PF Principal nao encontrada no workspace PERSONAL. Seed pessoal abortado.');
  }

  console.log(`  → Conta PF Principal encontrada: ID ${personalAccount.id}`);

  // ═══════════════════════════════════════════════════════════════
  // 4. Resolver categorias pessoais por workspaceId
  // ═══════════════════════════════════════════════════════════════
  const catSalary = await prisma.category.findFirst({
    where: { name: 'Salário / Pró-Labore', workspaceId },
  });

  const catPersonal = await prisma.category.findFirst({
    where: { name: 'Despesas Pessoais', workspaceId },
  });

  if (!catSalary) {
    throw new Error('[PersonalDemoSeed] Categoria "Salario / Pro-Labore" nao encontrada no workspace PERSONAL. Seed pessoal abortado.');
  }

  if (!catPersonal) {
    throw new Error('[PersonalDemoSeed] Categoria "Despesas Pessoais" nao encontrada no workspace PERSONAL. Seed pessoal abortado.');
  }

  console.log(`  → Categorias encontradas: Salário (ID ${catSalary.id}), Pessoais (ID ${catPersonal.id})`);

  // ═══════════════════════════════════════════════════════════════
  // 5. Criar transações pessoais demo com upsert idempotente
  //    Usando @@unique([workspaceId, hashDeduplication])
  //    Hash estável (sem YYYY_MM) + date atualizada no upsert.update
  // ═══════════════════════════════════════════════════════════════
  const refDate = options?.referenceDate ?? new Date();
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-indexed

  const transactions = getPersonalTransactions();

  const catMap: Record<string, number> = {
    salary: catSalary.id,
    personal: catPersonal.id,
  };

  let count = 0;

  for (const tx of transactions) {
    const txDate = new Date(currentYear, currentMonth, tx.day, 10, 0, 0);
    const categoryId = catMap[tx.catKey];

    if (!categoryId) {
      throw new Error(`[PersonalDemoSeed] Categoria nao mapeada para catKey="${tx.catKey}". Seed pessoal abortado.`);
    }

    await prisma.transaction.upsert({
      where: {
        workspaceId_hashDeduplication: {
          workspaceId,
          hashDeduplication: tx.hashDeduplication,
        },
      },
      update: {
        // Atualiza apenas campos seguros caso já exista (idempotência)
        // Date atualizada para mês de referência para manter Dashboard mensal
        description: tx.description,
        amount: tx.amount,
        date: txDate,
      },
      create: {
        description: tx.description,
        amount: tx.amount,
        date: txDate,
        type: tx.type,
        status: 'COMPLETED',
        isPaid: true,
        hashDeduplication: tx.hashDeduplication,
        accountId: personalAccount.id,
        categoryId,
        workspaceId,
      },
    });

    count++;
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. Validação pós-execução — P1-2: nunca retornar sucesso silencioso
  // ═══════════════════════════════════════════════════════════════
  if (count !== PERSONAL_DEMO_EXPECTED_COUNT) {
    throw new Error(
      `[PersonalDemoSeed] Esperava ${PERSONAL_DEMO_EXPECTED_COUNT} transacoes demo, mas processou ${count}. Seed pessoal abortado.`
    );
  }

  console.log(`  → ${count} transações pessoais demo criadas/atualizadas (idempotente)`);
  console.log(`  → Narrativa: 1 pró-labore + 5 despesas pessoais demonstrativas`);

  return { count, workspaceId };
}
