import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AccountingExportMappingService } from '../../src/services/AccountingExportMappingService';
import { prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';

describe('AccountingExportMappingService', () => {
  const layoutId = 'dominio-separated-v1';
  let service: AccountingExportMappingService;
  let workspaceA: { id: number };
  let workspaceB: { id: number };
  let macroCategory: { id: number };
  let secondaryMacroCategory: { id: number };
  let inactiveMacroCategory: { id: number };

  beforeEach(async () => {
    service = new AccountingExportMappingService();
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    workspaceA = await prisma.workspace.create({
      data: { name: `Accounting Mapping A ${suffix}`, type: 'BUSINESS' },
    });
    workspaceB = await prisma.workspace.create({
      data: { name: `Accounting Mapping B ${suffix}`, type: 'BUSINESS' },
    });
    macroCategory = await prisma.macroCategory.create({
      data: { code: `TEST_AEM_${suffix}`, name: 'Receitas teste', type: 'INCOME', isActive: true },
    });
    secondaryMacroCategory = await prisma.macroCategory.create({
      data: { code: `TEST_AEM_SECONDARY_${suffix}`, name: 'Despesas teste', type: 'EXPENSE', isActive: true },
    });
    inactiveMacroCategory = await prisma.macroCategory.create({
      data: { code: `TEST_AEM_INACTIVE_${suffix}`, name: 'Inativa teste', type: 'EXPENSE', isActive: false },
    });
  });

  afterEach(async () => {
    if (workspaceA?.id) {
      await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
        await prisma.accountingExportMapping.deleteMany({ where: { workspaceId: workspaceA.id } });
      });
    }

    if (workspaceB?.id) {
      await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
        await prisma.accountingExportMapping.deleteMany({ where: { workspaceId: workspaceB.id } });
      });
    }

    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceA?.id, workspaceB?.id].filter(Boolean) as number[] } },
    });

    await prisma.macroCategory.deleteMany({
      where: { code: { startsWith: 'TEST_AEM_' } },
    });
  });

  function validInput(overrides: Partial<Parameters<AccountingExportMappingService['create']>[0]> = {}) {
    return {
      workspaceId: workspaceA.id,
      macroCategoryId: macroCategory.id,
      layoutId,
      targetSystem: 'DOMINIO',
      debitAccountCode: ' 1001 ',
      creditAccountCode: '2002',
      ...overrides,
    };
  }

  it('cria mapping valido', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const mapping = await service.create(validInput({
        historyCode: ' 300 ',
        costCenterCode: ' 400 ',
        createdByUserId: 10,
      }));

      expect(mapping.workspaceId).toBe(workspaceA.id);
      expect(mapping.macroCategoryId).toBe(macroCategory.id);
      expect(mapping.layoutId).toBe(layoutId);
      expect(mapping.targetSystem).toBe('DOMINIO');
      expect(mapping.debitAccountCode).toBe('1001');
      expect(mapping.creditAccountCode).toBe('2002');
      expect(mapping.historyCode).toBe('300');
      expect(mapping.costCenterCode).toBe('400');
      expect(mapping.isActive).toBe(true);
      expect(mapping.createdByUserId).toBe(10);
    });
  });

  it('rejeita mapping sem debito', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ debitAccountCode: '   ' })))
        .rejects.toThrow('debitAccountCode is required');
    });
  });

  it('rejeita mapping sem credito', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ creditAccountCode: '' })))
        .rejects.toThrow('creditAccountCode is required');
    });
  });

  it('rejeita debito nao numerico', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ debitAccountCode: '10A1' })))
        .rejects.toThrow('debitAccountCode must be numeric');
    });
  });

  it('rejeita credito nao numerico', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ creditAccountCode: '20-02' })))
        .rejects.toThrow('creditAccountCode must be numeric');
    });
  });

  it('rejeita targetSystem diferente de DOMINIO', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ targetSystem: 'ALTERDATA' })))
        .rejects.toThrow('targetSystem must be DOMINIO');
    });
  });

  it('rejeita layoutId diferente de dominio-separated-v1', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ layoutId: 'layout-generico' })))
        .rejects.toThrow('layoutId must be dominio-separated-v1');
    });
  });

  it('rejeita duplicidade workspaceId + macroCategoryId + layoutId', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await service.create(validInput());

      await expect(service.create(validInput({ debitAccountCode: '3003', creditAccountCode: '4004' })))
        .rejects.toThrow('Accounting export mapping already exists for workspace/macroCategory/layout');
    });
  });

  it('permite mesmo macroCategoryId + layoutId em workspaces diferentes', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await service.create(validInput());
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const mapping = await service.create(validInput({ workspaceId: workspaceB.id }));

      expect(mapping.workspaceId).toBe(workspaceB.id);
      expect(mapping.macroCategoryId).toBe(macroCategory.id);
      expect(mapping.layoutId).toBe(layoutId);
    });
  });

  it('rejeita macroCategoryId inexistente', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ macroCategoryId: 999999 })))
        .rejects.toThrow('MacroCategory not found or inactive');
    });
  });

  it('rejeita MacroCategory inativa', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ macroCategoryId: inactiveMacroCategory.id })))
        .rejects.toThrow('MacroCategory not found or inactive');
    });
  });

  it('RLS impede workspace A de acessar mapping do workspace B', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      await service.create(validInput({ workspaceId: workspaceB.id }));
    });

    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const leaked = await service.findActiveForExport({
        workspaceId: workspaceB.id,
        macroCategoryId: macroCategory.id,
        layoutId,
      });

      expect(leaked).toBeNull();
    });
  });

  it('RLS bloqueia create cross-tenant e nao cria registro no workspace B', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({
        workspaceId: workspaceB.id,
        debitAccountCode: '300',
        creditAccountCode: '10',
      }))).rejects.toThrow();
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const mapping = await service.findActiveForExport({
        workspaceId: workspaceB.id,
        macroCategoryId: macroCategory.id,
        layoutId,
      });

      expect(mapping).toBeNull();
    });
  });

  it('mapping inativo nao e retornado por findActiveForExport', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const mapping = await service.create(validInput());

      await service.deactivate({ workspaceId: workspaceA.id, id: mapping.id, updatedByUserId: 20 });

      await expect(service.findActiveForExport({
        workspaceId: workspaceA.id,
        macroCategoryId: macroCategory.id,
        layoutId,
      })).resolves.toBeNull();
    });
  });

  it('historyCode opcional nao bloqueia criacao', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const mapping = await service.create(validInput({ historyCode: undefined }));

      expect(mapping.historyCode).toBeNull();
    });
  });

  it('costCenterCode opcional nao bloqueia criacao', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const mapping = await service.create(validInput({ costCenterCode: null }));

      expect(mapping.costCenterCode).toBeNull();
    });
  });

  it('rejeita historyCode nao numerico quando informado', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ historyCode: 'H300' })))
        .rejects.toThrow('historyCode must be numeric');
    });
  });

  it('rejeita costCenterCode nao numerico quando informado', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(validInput({ costCenterCode: 'CC400' })))
        .rejects.toThrow('costCenterCode must be numeric');
    });
  });

  it('listByWorkspaceAndLayout filtra por workspace e layout', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await service.create(validInput({ macroCategoryId: macroCategory.id }));
      await service.create(validInput({ macroCategoryId: secondaryMacroCategory.id }));
      await prisma.accountingExportMapping.create({
        data: {
          workspaceId: workspaceA.id,
          macroCategoryId: macroCategory.id,
          targetSystem: 'DOMINIO',
          layoutId: 'outro-layout',
          debitAccountCode: '5005',
          creditAccountCode: '6006',
        },
      });
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      await service.create(validInput({ workspaceId: workspaceB.id }));
    });

    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const mappings = await service.listByWorkspaceAndLayout({ workspaceId: workspaceA.id, layoutId });

      expect(mappings).toHaveLength(2);
      expect(mappings.every(mapping => mapping.workspaceId === workspaceA.id)).toBe(true);
      expect(mappings.every(mapping => mapping.layoutId === layoutId)).toBe(true);
    });
  });

  it('deactivate respeita workspace e nao afeta outro tenant', async () => {
    let mappingBId = 0;

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const mapping = await service.create(validInput({ workspaceId: workspaceB.id }));
      mappingBId = mapping.id;
    });

    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.deactivate({ workspaceId: workspaceA.id, id: mappingBId, updatedByUserId: 30 }))
        .rejects.toThrow('Accounting export mapping not found');
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const stillActive = await service.findActiveForExport({
        workspaceId: workspaceB.id,
        macroCategoryId: macroCategory.id,
        layoutId,
      });

      expect(stillActive?.isActive).toBe(true);
    });
  });

  it('RLS bloqueia deactivate/update cross-tenant e mantem mapping do workspace B ativo', async () => {
    let mappingBId = 0;

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const mapping = await service.create(validInput({ workspaceId: workspaceB.id }));
      mappingBId = mapping.id;
    });

    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.deactivate({
        workspaceId: workspaceB.id,
        id: mappingBId,
        updatedByUserId: 40,
      })).rejects.toThrow('Accounting export mapping not found');
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const stillActive = await service.findActiveForExport({
        workspaceId: workspaceB.id,
        macroCategoryId: macroCategory.id,
        layoutId,
      });

      expect(stillActive?.isActive).toBe(true);
      expect(stillActive?.updatedByUserId).toBeNull();
    });
  });
});
