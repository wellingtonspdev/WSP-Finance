import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AccountingExportConfigService } from '../../src/services/AccountingExportConfigService';
import { prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';

describe('AccountingExportConfigService', () => {
  const layoutId = 'dominio-separated-v1';
  let service: AccountingExportConfigService;
  let workspaceA: { id: number };
  let workspaceB: { id: number };

  beforeEach(async () => {
    service = new AccountingExportConfigService();
    workspaceA = await prisma.workspace.create({
      data: { name: `Accounting Export A ${Date.now()}`, type: 'BUSINESS' },
    });
    workspaceB = await prisma.workspace.create({
      data: { name: `Accounting Export B ${Date.now()}`, type: 'BUSINESS' },
    });
  });

  afterEach(async () => {
    if (workspaceA?.id) {
      await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
        await prisma.accountingExportConfig.deleteMany({ where: { workspaceId: workspaceA.id } });
      });
    }

    if (workspaceB?.id) {
      await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
        await prisma.accountingExportConfig.deleteMany({ where: { workspaceId: workspaceB.id } });
      });
    }

    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceA?.id, workspaceB?.id].filter(Boolean) as number[] } },
    });
  });

  function validInput(overrides: Partial<Parameters<AccountingExportConfigService['create']>[1]> = {}) {
    return {
      targetSystem: 'DOMINIO',
      layoutId,
      companyCode: '12345',
      ...overrides,
    };
  }

  it('cria config valida por workspace', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const config = await service.create(workspaceA.id, validInput({ branchCode: ' 001 ' }));

      expect(config.workspaceId).toBe(workspaceA.id);
      expect(config.targetSystem).toBe('DOMINIO');
      expect(config.layoutId).toBe(layoutId);
      expect(config.companyCode).toBe('12345');
      expect(config.branchCode).toBe('001');
    });
  });

  it('aplica sourceLabel = WSP quando ausente', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const config = await service.create(workspaceA.id, validInput());

      expect(config.sourceLabel).toBe('WSP');
      expect(config.historyCodeRequired).toBe(false);
      expect(config.isActive).toBe(true);
    });
  });

  it('rejeita config sem companyCode', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(
        service.create(workspaceA.id, validInput({ companyCode: undefined as any }))
      ).rejects.toThrow('companyCode is required');
    });
  });

  it('rejeita companyCode vazio ou so com espacos', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(workspaceA.id, validInput({ companyCode: '' })))
        .rejects.toThrow('companyCode is required');

      await expect(service.create(workspaceA.id, validInput({ companyCode: '   ' })))
        .rejects.toThrow('companyCode is required');
    });
  });

  it('rejeita targetSystem diferente de DOMINIO', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(workspaceA.id, validInput({ targetSystem: 'ALTERDATA' })))
        .rejects.toThrow('targetSystem must be DOMINIO');
    });
  });

  it('rejeita layoutId diferente de dominio-separated-v1', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.create(workspaceA.id, validInput({ layoutId: 'dominio-fixed-v1' })))
        .rejects.toThrow('layoutId must be dominio-separated-v1');
    });
  });

  it('rejeita duplicidade de workspaceId + layoutId', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await service.create(workspaceA.id, validInput({ companyCode: '12345' }));

      await expect(service.create(workspaceA.id, validInput({ companyCode: '67890' })))
        .rejects.toThrow('Accounting export config already exists for workspace/layout');
    });
  });

  it('permite mesmo layout em workspaces diferentes', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await service.create(workspaceA.id, validInput({ companyCode: '12345' }));
    });

    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      const config = await service.create(workspaceB.id, validInput({ companyCode: '67890' }));

      expect(config.workspaceId).toBe(workspaceB.id);
      expect(config.layoutId).toBe(layoutId);
    });
  });

  it('workspace A nao le config do workspace B por RLS', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceB.id }, async () => {
      await service.create(workspaceB.id, validInput({ companyCode: '67890' }));
    });

    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      const leaked = await service.getByLayout(workspaceB.id, layoutId);

      expect(leaked).toBeNull();
    });
  });

  it('config ausente retorna null para futuro blocker do ExportValidationService', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceA.id }, async () => {
      await expect(service.getByLayout(workspaceA.id, layoutId)).resolves.toBeNull();
      await expect(service.getActiveByLayout(workspaceA.id, layoutId)).resolves.toBeNull();
    });
  });
});
