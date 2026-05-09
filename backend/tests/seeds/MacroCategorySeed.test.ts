import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { seedMacroCategories } from '../../prisma/seed/modules/00_MacroCategories';

describe('MacroCategorySeed', () => {
  let initialCount = 0;

  beforeEach(async () => {
    // Pegar a contagem inicial antes do teste, não precisa truncar
    initialCount = await prisma.macroCategory.count();
  });

  afterEach(async () => {
    // Opcionalmente podemos limpar apenas o que foi gerado se o ambiente permitir
    // Como os códigos são fixos, o upsert resolve, então não precisa de deleção pesada.
  });

  it('deve rodar o seed duas vezes e ser idempotente (não duplicar)', async () => {
    // 1. Executa a primeira vez
    await seedMacroCategories(prisma);
    const countAfterFirst = await prisma.macroCategory.count();

    // O mínimo esperado após a primeira execução são 7 (quantidade de macros no seed)
    expect(countAfterFirst).toBeGreaterThanOrEqual(7);

    // 2. Executa a segunda vez
    await seedMacroCategories(prisma);
    const countAfterSecond = await prisma.macroCategory.count();

    // A contagem não deve ter mudado
    expect(countAfterSecond).toBe(countAfterFirst);
  });
});
