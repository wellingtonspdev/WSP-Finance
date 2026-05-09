import { PrismaClient, TransactionType } from '@prisma/client';

export async function seedMacroCategories(prisma: PrismaClient) {
  console.log('📖 [Fase 0] Semeando Macro Categorias do Catálogo WSP...');

  const macroCategories = [
    { code: 'REV_SRV', name: 'Receita de Serviços', type: TransactionType.INCOME, group: 'Receitas', isActive: true },
    { code: 'REV_PRO', name: 'Receita de Produtos', type: TransactionType.INCOME, group: 'Receitas', isActive: true },
    { code: 'DES_ALU', name: 'Aluguel', type: TransactionType.EXPENSE, group: 'Despesas Administrativas', isActive: true },
    { code: 'DES_TAR', name: 'Tarifas Bancárias', type: TransactionType.EXPENSE, group: 'Despesas Financeiras', isActive: true },
    { code: 'TAX_SIM', name: 'Simples Nacional', type: TransactionType.EXPENSE, group: 'Impostos', isActive: true },
    { code: 'PRO_LAB', name: 'Pró-labore', type: TransactionType.EXPENSE, group: 'Folha/Pró-labore', isActive: true },
    { code: 'OUT_GEN', name: 'Outros', type: TransactionType.EXPENSE, group: 'Outros', isActive: true }
  ];

  let count = 0;
  for (const macro of macroCategories) {
    await prisma.macroCategory.upsert({
      where: { code: macro.code },
      update: { name: macro.name, type: macro.type, group: macro.group, isActive: macro.isActive },
      create: macro
    });
    count++;
  }

  console.log(`  → ${count} Macro Categorias sincronizadas (idempotente).`);
  return { count };
}
