import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';
import { ExportValidationService } from '../../src/services/ExportValidationService';
import * as crypto from 'node:crypto';

describe('ExportValidationService', () => {
  let workspaceId: number;
  let macroCategoryId: number;
  let categoryId: number;
  let accountId: number;

  // Unique codes per run to avoid collisions
  const uniqueCode = () => `TEST_MC_${crypto.randomUUID().slice(0, 8)}`;

  beforeEach(async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Validation Test WS',
        documentType: 'CNPJ',
        document: '12.345.678/0001-90',
      },
    });
    workspaceId = workspace.id;

    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.upsert({
        where: {
          workspaceId_layoutId: {
            workspaceId,
            layoutId: 'dominio-separated-v1',
          },
        },
        update: {
          companyCode: '123',
          isActive: true,
          historyCodeRequired: false,
        },
        create: {
          workspaceId,
          targetSystem: 'DOMINIO',
          layoutId: 'dominio-separated-v1',
          companyCode: '123',
          isActive: true,
          historyCodeRequired: false,
        },
      });

      const macroCategory = await prisma.macroCategory.create({
        data: {
          code: uniqueCode(),
          name: 'Test MacroCategory',
          type: 'INCOME',
          isActive: true,
        },
      });
      macroCategoryId = macroCategory.id;

      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          workspaceId,
          macroCategoryId,
        },
      });
      categoryId = category.id;

      await prisma.accountingExportMapping.create({
        data: {
          workspaceId,
          macroCategoryId,
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          debitAccountCode: '111',
          creditAccountCode: '222',
          historyCode: '333',
          isActive: true,
        },
      });

      const account = await prisma.account.create({
        data: {
          name: 'Test Account',
          workspaceId,
        },
      });
      accountId = account.id;
    });
  });

  afterEach(async () => {
    if (workspaceId) {
      await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
        await prisma.transaction.deleteMany({ where: { workspaceId } });
        await prisma.account.deleteMany({ where: { workspaceId } });
        await prisma.accountingExportMapping.deleteMany({ where: { workspaceId } });
        await prisma.category.deleteMany({ where: { workspaceId } });
        if (macroCategoryId) {
          await prisma.macroCategory.deleteMany({ where: { id: macroCategoryId } });
        }
        await prisma.accountingExportConfig.deleteMany({ where: { workspaceId } });
        await prisma.workspace.deleteMany({ where: { id: workspaceId } });
      });
    }
  });

  // Helper to run validation within tenant context
  async function validate(
    overrides: Partial<{
      workspaceId: number;
      layoutId: string;
      startDate: string;
      endDate: string;
    }> = {},
  ) {
    const service = new ExportValidationService();
    const request = {
      workspaceId: overrides.workspaceId ?? workspaceId,
      layoutId: overrides.layoutId ?? 'dominio-separated-v1',
      startDate: overrides.startDate ?? '2026-05-01',
      endDate: overrides.endDate ?? '2026-05-31',
    };
    return tenantContext.run(
      { currentWorkspaceId: request.workspaceId },
      async () => {
        return await service.validate(request);
      },
    );
  }

  // DB constraints prevent persisting these invalid states.
  // This explicit db double verifies service-level defensive validation.
  // DB-backed coverage for missing config/mapping remains in S07/S11.
  type ValidationDbDoubleOverrides = {
    accountingExportConfig?: {
      findFirst?: any;
    };
    accountingExportMapping?: {
      findMany?: any;
    };
  };

  function applySafeOverrides(target: any, overrides: any) {
    const obj = Object.create(target);
    for (const key of Object.keys(overrides)) {
      Object.defineProperty(obj, key, {
        value: overrides[key],
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return obj;
  }

  function createValidationDbDouble(
    overrides: ValidationDbDoubleOverrides,
  ): typeof prisma {
    const db = Object.create(prisma);

    if (overrides.accountingExportConfig) {
      Object.defineProperty(db, 'accountingExportConfig', {
        value: applySafeOverrides(prisma.accountingExportConfig, overrides.accountingExportConfig),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (overrides.accountingExportMapping) {
      Object.defineProperty(db, 'accountingExportMapping', {
        value: applySafeOverrides(prisma.accountingExportMapping, overrides.accountingExportMapping),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    return db as typeof prisma;
  }

  // Helper to create a transaction
  async function createTransaction(
    overrides: Partial<{
      amount: string;
      date: string;
      status: string;
      description: string;
      categoryId: number;
    }> = {},
  ) {
    return tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      return await prisma.transaction.create({
        data: {
          workspaceId,
          accountId,
          categoryId: overrides.categoryId ?? categoryId,
          type: 'INCOME',
          amount: new Decimal(overrides.amount ?? '150.00'),
          date: new Date(overrides.date ?? '2026-05-10T12:00:00Z'),
          description: overrides.description ?? 'Test Transaction',
          status: (overrides.status as any) ?? 'COMPLETED',
        },
      });
    });
  }

  // =====================================================================
  // S01 — Sucesso sem blockers
  // =====================================================================
  it('S01 - sucesso sem blockers', async () => {
    await createTransaction();
    const result = await validate();

    expect(result.valid).toBe(true);
    expect(result.totalRecords).toBe(3); // 2 + 1 exportable
    expect(result.blockers).toHaveLength(0);
    expect(result.summary.blockersCount).toBe(0);
    expect(result.layoutId).toBe('dominio-separated-v1');
  });

  // =====================================================================
  // S02 — layoutId string não suportada
  // =====================================================================
  it('S02 - layoutId string não suportada => blocker INVALID_LAYOUT_ID', async () => {
    const result = await validate({ layoutId: 'non-existent-layout' });

    expect(result.valid).toBe(false);
    expect(result.totalRecords).toBe(2); // fallback structural
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_LAYOUT_ID',
          severity: 'BLOCKER',
          field: 'layoutId',
        }),
      ]),
    );
  });

  // =====================================================================
  // S03 — Período sem nenhuma transação
  // =====================================================================
  it('S03 - período sem nenhuma transação', async () => {
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.totalRecords).toBe(2);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NO_EXPORTABLE_RECORDS' }),
      ]),
    );
    // NÃO deve conter STATUS_NOT_EXPORTABLE
    expect(result.blockers.find(b => b.code === 'STATUS_NOT_EXPORTABLE')).toBeUndefined();
  });

  // =====================================================================
  // S04 — Apenas PENDING no período
  // =====================================================================
  it('S04 - apenas PENDING => NO_EXPORTABLE_RECORDS + STATUS_NOT_EXPORTABLE', async () => {
    await createTransaction({ status: 'PENDING' });
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.totalRecords).toBe(2);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NO_EXPORTABLE_RECORDS' }),
        expect.objectContaining({ code: 'STATUS_NOT_EXPORTABLE' }),
      ]),
    );
  });

  // =====================================================================
  // S05 — COMPLETED + PENDING
  // =====================================================================
  it('S05 - COMPLETED + PENDING => STATUS_NOT_EXPORTABLE sem NO_EXPORTABLE_RECORDS', async () => {
    await createTransaction({ status: 'COMPLETED' });
    await createTransaction({ status: 'PENDING', amount: '200.00' });
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.totalRecords).toBe(3); // 2 + 1 exportable
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'STATUS_NOT_EXPORTABLE' }),
      ]),
    );
    expect(result.blockers.find(b => b.code === 'NO_EXPORTABLE_RECORDS')).toBeUndefined();
  });

  // =====================================================================
  // S06 — Somente COMPLETED/RECONCILED
  // =====================================================================
  it('S06 - somente COMPLETED/RECONCILED => sem blockers de status', async () => {
    await createTransaction({ status: 'COMPLETED' });
    await createTransaction({ status: 'RECONCILED', amount: '200.00' });
    const result = await validate();

    expect(result.totalRecords).toBe(4); // 2 + 2 exportable
    expect(result.blockers.find(b => b.code === 'NO_EXPORTABLE_RECORDS')).toBeUndefined();
    expect(result.blockers.find(b => b.code === 'STATUS_NOT_EXPORTABLE')).toBeUndefined();
  });

  // =====================================================================
  // S07 — Config ausente
  // =====================================================================
  it('S07 - config ausente => blocker MISSING_ACCOUNTING_CONFIG', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.deleteMany({ where: { workspaceId } });
    });
    await createTransaction();
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_ACCOUNTING_CONFIG' }),
      ]),
    );
    // NÃO deve gerar OPTIONAL_BRANCH_CODE_MISSING quando config está ausente
    expect(result.warnings.find(w => w.code === 'OPTIONAL_BRANCH_CODE_MISSING')).toBeUndefined();
  });

  // =====================================================================
  // S08 — companyCode ausente
  // =====================================================================
  it('S08 - companyCode ausente => blocker MISSING_COMPANY_CODE', async () => {
    // DB constraints prevent persisting this invalid state.
    // This test uses an explicit db double to verify service-level defense;
    // DB-backed coverage for missing config/mapping remains in S07/S11.
    await createTransaction();
    const dbOverride = createValidationDbDouble({
      accountingExportConfig: {
        findFirst: async () => ({
          id: 999,
          workspaceId,
          targetSystem: 'DOMINIO',
          layoutId: 'dominio-separated-v1',
          companyCode: '',
          branchCode: null,
          isActive: true,
          historyCodeRequired: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    });
    const service = new ExportValidationService(dbOverride);
    const result = await tenantContext.run(
      { currentWorkspaceId: workspaceId },
      async () => await service.validate({
        workspaceId,
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_COMPANY_CODE' }),
      ]),
    );
  });

  // =====================================================================
  // S09 — branchCode ausente com exportáveis
  // =====================================================================
  it('S09 - branchCode ausente com exportáveis => warning OPTIONAL_BRANCH_CODE_MISSING', async () => {
    // branchCode is already null by default in our setup
    await createTransaction();
    const result = await validate();

    const branchWarnings = result.warnings.filter(w => w.code === 'OPTIONAL_BRANCH_CODE_MISSING');
    expect(branchWarnings).toHaveLength(1); // aggregated unique warning
    expect(branchWarnings[0].severity).toBe('WARNING');
  });

  // =====================================================================
  // S10 — branchCode presente
  // =====================================================================
  it('S10 - branchCode presente => sem OPTIONAL_BRANCH_CODE_MISSING', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.update({
        where: { workspaceId_layoutId: { workspaceId, layoutId: 'dominio-separated-v1' } },
        data: { branchCode: 'BR01' },
      });
    });
    await createTransaction();
    const result = await validate();

    expect(result.warnings.find(w => w.code === 'OPTIONAL_BRANCH_CODE_MISSING')).toBeUndefined();
  });

  // =====================================================================
  // S11 — Mapping ausente
  // =====================================================================
  it('S11 - mapping ausente => blocker MISSING_ACCOUNTING_MAPPING', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportMapping.deleteMany({ where: { workspaceId } });
    });
    await createTransaction();
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_ACCOUNTING_MAPPING' }),
      ]),
    );
  });

  // =====================================================================
  // S12 — debitAccountCode ausente
  // =====================================================================
  it('S12 - debitAccountCode ausente => blocker MISSING_DEBIT_ACCOUNT_CODE', async () => {
    // DB constraints prevent persisting this invalid state.
    // This test uses an explicit db double to verify service-level defense;
    // DB-backed coverage for missing config/mapping remains in S07/S11.
    await createTransaction();
    const dbOverride = createValidationDbDouble({
      accountingExportMapping: {
        findMany: async () => [{
          id: 999,
          workspaceId,
          macroCategoryId,
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          debitAccountCode: '',
          creditAccountCode: '222',
          historyCode: '333',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      },
    });
    const service = new ExportValidationService(dbOverride);
    const result = await tenantContext.run(
      { currentWorkspaceId: workspaceId },
      async () => await service.validate({
        workspaceId,
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_DEBIT_ACCOUNT_CODE' }),
      ]),
    );
  });

  // =====================================================================
  // S13 — creditAccountCode ausente
  // =====================================================================
  it('S13 - creditAccountCode ausente => blocker MISSING_CREDIT_ACCOUNT_CODE', async () => {
    // DB constraints prevent persisting this invalid state.
    // This test uses an explicit db double to verify service-level defense;
    // DB-backed coverage for missing config/mapping remains in S07/S11.
    await createTransaction();
    const dbOverride = createValidationDbDouble({
      accountingExportMapping: {
        findMany: async () => [{
          id: 999,
          workspaceId,
          macroCategoryId,
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          debitAccountCode: '111',
          creditAccountCode: '',
          historyCode: '333',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      },
    });
    const service = new ExportValidationService(dbOverride);
    const result = await tenantContext.run(
      { currentWorkspaceId: workspaceId },
      async () => await service.validate({
        workspaceId,
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_CREDIT_ACCOUNT_CODE' }),
      ]),
    );
  });

  // =====================================================================
  // S14 — Categoria sem macro
  // =====================================================================
  it('S14 - categoria sem macro => blocker CATEGORY_WITHOUT_MACRO', async () => {
    let noMacroCatId: number;
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      const cat = await prisma.category.create({
        data: { name: 'No Macro Category', workspaceId },
      });
      noMacroCatId = cat.id;
    });
    await createTransaction({ categoryId: noMacroCatId! });
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CATEGORY_WITHOUT_MACRO' }),
      ]),
    );
  });

  // =====================================================================
  // S15 — MacroCategory OUT_GEN
  // =====================================================================
  it('S15 - MacroCategory OUT_GEN => warning GENERIC_OTHERS_CATEGORY_USED', async () => {
    let outGenCatId: number;
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      const outGenMacro = await prisma.macroCategory.upsert({
        where: { code: 'OUT_GEN' },
        update: { isActive: true },
        create: {
          code: 'OUT_GEN',
          name: 'Outros',
          type: 'INCOME',
          isActive: true,
        },
      });
      const cat = await prisma.category.create({
        data: { name: 'Generic Others', workspaceId, macroCategoryId: outGenMacro.id },
      });
      outGenCatId = cat.id;

      // Create mapping for OUT_GEN macro
      await prisma.accountingExportMapping.create({
        data: {
          workspaceId,
          macroCategoryId: outGenMacro.id,
          layoutId: 'dominio-separated-v1',
          targetSystem: 'DOMINIO',
          debitAccountCode: '777',
          creditAccountCode: '888',
          historyCode: '999',
          isActive: true,
        },
      });
    });
    await createTransaction({ categoryId: outGenCatId! });
    const result = await validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'GENERIC_OTHERS_CATEGORY_USED',
          severity: 'WARNING',
        }),
      ]),
    );

    // Cleanup OUT_GEN (workspace-scoped only; do NOT delete the global MacroCategory)
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.deleteMany({ where: { workspaceId } });
      await prisma.accountingExportMapping.deleteMany({
        where: { workspaceId, macroCategory: { code: 'OUT_GEN' } },
      });
      await prisma.category.deleteMany({ where: { name: 'Generic Others', workspaceId } });
    });
  });

  // =====================================================================
  // S16 — Texto com pipe/emoji
  // =====================================================================
  it('S16 - texto com pipe/emoji => warning TEXT_SANITIZED', async () => {
    await createTransaction({ description: 'Pagamento | Fornecedor 🚀 teste' });
    const result = await validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TEXT_SANITIZED',
          severity: 'WARNING',
        }),
      ]),
    );
    // Must NOT contain original text in response
    const json = JSON.stringify(result);
    expect(json).not.toContain('Pagamento | Fornecedor 🚀 teste');
  });

  // =====================================================================
  // S17 — Texto sanitizado pré-truncate maior que 255
  // =====================================================================
  it('S17 - texto sanitizado pré-truncate > 255 => warning FIELD_TRUNCATED', async () => {
    const longText = 'A'.repeat(300);
    await createTransaction({ description: longText });
    const result = await validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIELD_TRUNCATED',
          severity: 'WARNING',
        }),
      ]),
    );
  });

  // =====================================================================
  // S18 — 300 emojis removidos
  // =====================================================================
  it('S18 - 300 emojis removidos => TEXT_SANITIZED sem FIELD_TRUNCATED falso', async () => {
    const emojiText = '🚀'.repeat(300);
    await createTransaction({ description: emojiText });
    const result = await validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TEXT_SANITIZED',
          severity: 'WARNING',
        }),
      ]),
    );
    // After sanitization all emojis are removed, result is empty/short => no truncation
    expect(result.warnings.find(w => w.code === 'FIELD_TRUNCATED')).toBeUndefined();
  });

  // =====================================================================
  // S19 — historyCodeRequired=true sem historyCode
  // =====================================================================
  it('S19 - historyCodeRequired=true sem historyCode => blocker MISSING_HISTORY_CODE', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.update({
        where: { workspaceId_layoutId: { workspaceId, layoutId: 'dominio-separated-v1' } },
        data: { historyCodeRequired: true },
      });
      await prisma.accountingExportMapping.updateMany({
        where: { workspaceId },
        data: { historyCode: null },
      });
    });
    await createTransaction();
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_HISTORY_CODE',
          severity: 'BLOCKER',
        }),
      ]),
    );
  });

  // =====================================================================
  // S20 — historyCodeRequired=false sem historyCode
  // =====================================================================
  it('S20 - historyCodeRequired=false sem historyCode => warning MISSING_HISTORY_CODE', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportMapping.updateMany({
        where: { workspaceId },
        data: { historyCode: null },
      });
    });
    await createTransaction();
    const result = await validate();

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_HISTORY_CODE',
          severity: 'WARNING',
        }),
      ]),
    );
  });

  // =====================================================================
  // S21 — Amount zero/negativo
  // =====================================================================
  it('S21 - amount zero/negativo => blocker INVALID_AMOUNT', async () => {
    await createTransaction({ amount: '0.00' });
    await createTransaction({ amount: '-50.00' });
    const result = await validate();

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_AMOUNT' }),
      ]),
    );
  });

  // =====================================================================
  // S22 — RLS cross-tenant
  // =====================================================================
  it('S22 - RLS cross-tenant: enforcement real do isolamento por tenant', async () => {
    // 1. Criamos Workspace B
    const ws2 = await prisma.workspace.create({
      data: {
        name: 'Cross Tenant WS',
        documentType: 'CNPJ',
        document: '99.999.999/0001-99',
      },
    });
    const workspace2Id = ws2.id;

    // 2. Contexto do Workspace B: Criamos dados imperfeitos
    let bTxId: number;
    let bCatId: number;
    let macro2Id: number;
    await tenantContext.run({ currentWorkspaceId: workspace2Id }, async () => {
      // NÃO vamos criar AccountingExportConfig, ou seja, WS2 não tem config!
      // Se RLS falhar, validar WS2 leria a config do WS1 e passaria. Validar WS1 não pode falhar por falta de config no WS2.

      // Criamos transação COMPLETED no WS2, MAS sem mapping! (Geraria blocker MISSING_MAPPING se a config existisse)
      const mc2 = await prisma.macroCategory.create({
        data: { code: uniqueCode(), name: 'MC B', type: 'INCOME', isActive: true },
      });
      macro2Id = mc2.id;

      const cat2 = await prisma.category.create({
        data: { name: 'Cat B', workspaceId: workspace2Id, macroCategoryId: mc2.id },
      });
      bCatId = cat2.id;

      const acc2 = await prisma.account.create({
        data: { name: 'Acc B', workspaceId: workspace2Id },
      });

      const txB = await prisma.transaction.create({
        data: {
          workspaceId: workspace2Id,
          accountId: acc2.id,
          categoryId: cat2.id,
          type: 'INCOME',
          amount: new Decimal('500.00'),
          date: new Date('2026-05-15T12:00:00Z'),
          description: 'TRANSACT-WS-B', // Texto para testar se vaza em warnings
          status: 'COMPLETED',
        },
      });
      bTxId = txB.id;
    });

    // 3. Contexto do Workspace A: Criamos 1 transação perfeitamente válida
    // Lembrando: Workspace A já tem Config e Mapping válidos (criados no beforeEach)
    const txAId = await createTransaction({ description: 'TRANSACT-WS-A' });

    // 4. Validamos Workspace A (Service usa o ID do WS A internamente pelo validate() helper)
    const resultA = await validate();

    // EXPECT: A é perfeitamente válido. Não importa que WS2 não tenha config ou tenha tx sem mapping.
    expect(resultA.valid).toBe(true);
    // 2 registros de header/footer + 1 transação de A. A transação de B foi ignorada.
    expect(resultA.totalRecords).toBe(3);

    // EXPECT: Não vazou nenhum ID ou descrição de B
    const jsonA = JSON.stringify(resultA);
    expect(jsonA).not.toContain('TRANSACT-WS-B');
    expect(jsonA).not.toContain(bTxId.toString());
    expect(jsonA).not.toContain(bCatId.toString());

    // 5. Validamos Workspace B explicitamente.
    // Prova que WS2 não consegue usar a config ou mappings do WS1
    const service = new ExportValidationService();
    const resultB = await tenantContext.run({ currentWorkspaceId: workspace2Id }, async () => {
      return await service.validate({
        workspaceId: workspace2Id,
        layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });
    });

    // EXPECT: Falha. B não tem config.
    expect(resultB.valid).toBe(false);
    expect(resultB.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_ACCOUNTING_CONFIG' })
      ])
    );

    // Cleanup WS2
    await tenantContext.run({ currentWorkspaceId: workspace2Id }, async () => {
      await prisma.transaction.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.account.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.category.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.macroCategory.deleteMany({ where: { id: macro2Id } });
      await prisma.workspace.deleteMany({ where: { id: workspace2Id } });
    });
  });

  // =====================================================================
  // S23 — DTO sem PII completa
  // =====================================================================
  it('S23 - DTO sem PII completa', async () => {
    const sensitiveDescription = 'Pagamento CPF 123.456.789-00 para fulano@email.com conta 9999';
    await createTransaction({ description: sensitiveDescription });
    const result = await validate();

    const json = JSON.stringify(result);
    // Must not contain original description
    expect(json).not.toContain(sensitiveDescription);
    // Must not contain fake CPF from description
    expect(json).not.toContain('123.456.789-00');
    // Must not contain email from description
    expect(json).not.toContain('fulano@email.com');
    // Must not contain stack traces
    expect(json).not.toContain('Error:');
    expect(json).not.toContain('at ');
    // Must not contain raw payload or complete objects
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('rawPayload');

    // Should contain safe fields
    expect(result.layoutId).toBe('dominio-separated-v1');
    expect(typeof result.valid).toBe('boolean');
    expect(typeof result.totalRecords).toBe('number');
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.blockers)).toBe(true);
  });

  // =====================================================================
  // S24 — RLS cross-tenant (mismatch enforcing)
  // =====================================================================
  it('S24 - RLS cross-tenant: mismatch de tenant impede acesso', async () => {
    // 1. Criar Workspace B
    const ws2 = await prisma.workspace.create({
      data: {
        name: 'Target WS',
        documentType: 'CNPJ',
        document: '99.999.999/0002-99',
      },
    });
    const workspaceB = ws2.id;
    let bTxId: number;
    let mcBId: number | undefined;

    try {
      // 2. Setup completo e válido em B
      await tenantContext.run({ currentWorkspaceId: workspaceB }, async () => {
        await prisma.accountingExportConfig.create({
          data: {
            workspaceId: workspaceB,
            targetSystem: 'DOMINIO',
            layoutId: 'dominio-separated-v1',
            companyCode: '999',
            isActive: true,
          },
        });

        const mcB = await prisma.macroCategory.create({
          data: { code: uniqueCode(), name: 'MC B', type: 'INCOME', isActive: true },
        });
        mcBId = mcB.id;

        const catB = await prisma.category.create({
          data: { name: 'Cat B', workspaceId: workspaceB, macroCategoryId: mcB.id },
        });
        await prisma.accountingExportMapping.create({
          data: {
            workspaceId: workspaceB,
            macroCategoryId: mcB.id,
            layoutId: 'dominio-separated-v1',
            targetSystem: 'DOMINIO',
            debitAccountCode: '444',
            creditAccountCode: '555',
            historyCode: '666',
            isActive: true,
          },
        });
        const accB = await prisma.account.create({
          data: { name: 'Acc B', workspaceId: workspaceB },
        });

        const txB = await prisma.transaction.create({
          data: {
            workspaceId: workspaceB,
            accountId: accB.id,
            categoryId: catB.id,
            type: 'INCOME',
            amount: new Decimal('100.00'),
            date: new Date('2026-05-15T12:00:00Z'),
            description: 'EXCLUSIVE-WS-B',
            status: 'COMPLETED',
          },
        });
        bTxId = txB.id;
      });

      // 3. Força tenantContext = A, tenta acessar workspaceId = B
      const service = new ExportValidationService();
      const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
        // O service vai tentar ler os dados do workspace B porque passamos workspaceB,
        // mas o Prisma (RLS) vai aplicar o filtro workspaceId = workspaceId (que é A)
        return await service.validate({
          workspaceId: workspaceB,
          layoutId: 'dominio-separated-v1',
          startDate: '2026-05-01',
          endDate: '2026-05-31',
        });
      });

      // 4. Verificações
      expect(result.valid).toBe(false);

      // O RLS filtrou a configuração do B porque o contexto é A
      expect(result.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'MISSING_ACCOUNTING_CONFIG' }),
          expect.objectContaining({ code: 'NO_EXPORTABLE_RECORDS' }),
        ])
      );

      // A descrição de B não pode aparecer
      const json = JSON.stringify(result);
      expect(json).not.toContain('EXCLUSIVE-WS-B');
      expect(json).not.toContain(bTxId.toString());
    } finally {
      // Cleanup
      await tenantContext.run({ currentWorkspaceId: workspaceB }, async () => {
        await prisma.transaction.deleteMany({ where: { workspaceId: workspaceB } });
        await prisma.account.deleteMany({ where: { workspaceId: workspaceB } });
        await prisma.accountingExportMapping.deleteMany({ where: { workspaceId: workspaceB } });
        await prisma.category.deleteMany({ where: { workspaceId: workspaceB } });
        await prisma.accountingExportConfig.deleteMany({ where: { workspaceId: workspaceB } });
      });

      if (mcBId) {
        await prisma.macroCategory.deleteMany({ where: { id: mcBId } });
      }

      await prisma.workspace.deleteMany({ where: { id: workspaceB } });
    }
  });
});
