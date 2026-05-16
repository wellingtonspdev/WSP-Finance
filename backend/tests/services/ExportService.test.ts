import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';
import { ExportService } from '../../src/services/ExportService';
import { encodeWindows1252, sha256 } from '../../src/lib/encoding';
import * as crypto from 'node:crypto';
import * as iconv from 'iconv-lite';

describe('ExportService', () => {
  let workspaceId: number;
  let macroCategoryId: number;
  let categoryId: number;
  let accountId: number;

  beforeEach(async () => {
    // Setup test data
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Export Test WS',
        documentType: 'CNPJ',
        document: '12.345.678/0001-90',
      }
    });
    workspaceId = workspace.id;

    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.upsert({
        where: {
          workspaceId_layoutId: {
            workspaceId,
            layoutId: 'dominio-separated-v1',
          }
        },
        update: {
          companyCode: '123',
          isActive: true,
        },
        create: {
          workspaceId,
          targetSystem: 'DOMINIO',
          layoutId: 'dominio-separated-v1',
          companyCode: '123',
          isActive: true,
        }
      });

      const macroCategory = await prisma.macroCategory.create({
        data: {
          code: `TEST_MC_${crypto.randomUUID()}`,
          name: 'Test MacroCategory',
          type: 'INCOME',
          isActive: true,
        }
      });
      macroCategoryId = macroCategory.id;

      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          workspaceId,
          macroCategoryId,
        }
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
        }
      });

      const account = await prisma.account.create({
        data: {
          name: 'Test Account',
          workspaceId,
        }
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
      });
    }
    // Workspace must be deleted outside tenantContext or using bypass if it also has RLS
    if (workspaceId) {
      await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
        await prisma.workspace.deleteMany({ where: { id: workspaceId } });
      });
    }
  });

  it('T7 - ExportService fluxo feliz', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: {
          workspaceId,
          accountId,
          categoryId,
          amount: new Decimal('150.00'),
          date: new Date('2026-05-10T12:00:00Z'),
          description: 'Venda de Serviço',
          type: 'INCOME',
          status: 'COMPLETED',
        }
      });
    });

    const service = new ExportService();
    const request = {
      workspaceId,
      userId: 1,
      layoutId: 'dominio-separated-v1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    };

    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate(request);
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.encoding).toBe('windows-1252');
    expect(result.contentType).toBe('text/plain; charset=windows-1252');
    expect(result.fileName).toBe('wsp-dominio-2026-05-01_2026-05-31.txt');
    expect(result.recordCount).toBe(3); // 0000 + 6000 + 1x 6100
    expect(result.hash).toBe(sha256(result.buffer));

    const decoded = iconv.decode(result.buffer, 'win1252');
    expect(decoded).toContain('0000|12345678000190|123|');
    expect(decoded).toContain('6000|X|1||');
    expect(decoded).toContain('6100|10/05/2026|111|222|15000|333|VENDA DE SERVIÇO|WSP||');
  });

  it('T8 - ExportService filtra status', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.createMany({
        data: [
          {
            workspaceId, accountId, categoryId, type: 'INCOME',
            amount: new Decimal('100.00'), date: new Date('2026-05-10T12:00:00Z'),
            description: 'Completed', status: 'COMPLETED',
          },
          {
            workspaceId, accountId, categoryId, type: 'INCOME',
            amount: new Decimal('200.00'), date: new Date('2026-05-11T12:00:00Z'),
            description: 'Reconciled', status: 'RECONCILED',
          },
          {
            workspaceId, accountId, categoryId, type: 'INCOME',
            amount: new Decimal('300.00'), date: new Date('2026-05-12T12:00:00Z'),
            description: 'Pending', status: 'PENDING',
          }
        ]
      });
    });

    const service = new ExportService();
    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    });

    expect(result.recordCount).toBe(4); // 0000 + 6000 + 2x 6100
  });

  it('T9 - ExportService ordena por date asc + id asc', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('10.00'), date: new Date('2026-05-15T12:00:00Z'), description: 'T1', status: 'COMPLETED' }
      });
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('20.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'T2', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    });

    const decoded = iconv.decode(result.buffer, 'win1252');
    const lines = decoded.split('\n').filter(l => l.startsWith('6100'));
    // T2 should be before T1
    expect(lines[0]).toContain('2000'); // amount 20.00
    expect(lines[1]).toContain('1000'); // amount 10.00
  });

  it('T10 - Período vazio falha', async () => {
    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('No exportable transactions found in the given period');
  });

  it('T11 - Config ausente falha', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.accountingExportConfig.deleteMany({ where: { workspaceId } });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Accounting export config not found or inactive');
  });

  it('T12 - Mapping ausente falha', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'Test', status: 'COMPLETED' }
      });
      await prisma.accountingExportMapping.deleteMany({ where: { workspaceId } });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('No mapping found for MacroCategory');
  });

  it('T13 - Category sem MacroCategory falha', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      const cat2 = await prisma.category.create({ data: { name: 'No Macro', workspaceId } });
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId: cat2.id, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'Test', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Transaction category has no macroCategoryId');
  });

  it('T14 - Workspace sem CNPJ válido falha', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.workspace.update({ where: { id: workspaceId }, data: { documentType: 'CPF' } });
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'Test', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Workspace document must be CNPJ');
  });

  it('T15 - Buffer Windows-1252, CRLF, sem BOM e hash final', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'AÇÃO', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.indexOf(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(-1); // no BOM
    expect(result.buffer.includes(Buffer.from('\r\n'))).toBe(true);
    // Since we sanitize AÇÃO to ACAO, it won't have non-ascii if we just toDominioText,
    // but we check if the encoding fn works. The lib handles win1252.
    expect(result.hash).toBe(sha256(result.buffer));
  });

  it('T16 - Warnings/metadados sem PII e com sanitização curta', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'A'.repeat(300), status: 'COMPLETED' }
      });
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('200.00'), date: new Date('2026-05-11T12:00:00Z'), description: 'CURTO | COM | PIPE', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    });

    expect(result.warnings.length).toBe(2);

    const truncWarning = result.warnings.find(w => w.code === 'TRUNCATED_COMPLEMENT');
    expect(truncWarning).toBeDefined();
    expect(truncWarning).not.toHaveProperty('description'); // NO PII
    expect(truncWarning).not.toHaveProperty('cnpj'); // NO PII
    expect(truncWarning?.field).toBe('description');
    expect(truncWarning?.recordType).toBe('6100');

    const sanitizeWarning = result.warnings.find(w => w.code === 'SANITIZED_COMPLEMENT');
    expect(sanitizeWarning).toBeDefined();
    expect(sanitizeWarning?.actualLength).toBeLessThanOrEqual(255);
  });

  it('T17 - tenantContext ausente falha', async () => {
    const service = new ExportService();
    await expect(service.generate({
      workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
      startDate: '2026-05-01', endDate: '2026-05-31',
    })).rejects.toThrow('Tenant context is missing');
  });

  it('T18 - tenantContext divergente de workspaceId falha', async () => {
    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: 9999 }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Tenant context mismatch');
  });

  it('T19 - Amount negativo falha e não gera ExportResult', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('-100.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'Negativo', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Transaction amount must be greater than zero');
  });

  it('T20 - Amount zero falha e não gera ExportResult', async () => {
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('0.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'Zero', status: 'COMPLETED' }
      });
    });

    const service = new ExportService();
    await expect(tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    })).rejects.toThrow('Transaction amount must be greater than zero');
  });

  it('T21 - Cross-tenant/RLS vaza dados? Deve exportar apenas os dados do workspace solicitado', async () => {
    let workspace2Id: number;
    const ws2 = await prisma.workspace.create({
      data: {
        name: 'Export Test WS 2',
        documentType: 'CNPJ',
        document: '99.999.999/0001-99',
      }
    });
    workspace2Id = ws2.id;

    await tenantContext.run({ currentWorkspaceId: workspace2Id }, async () => {
      await prisma.accountingExportConfig.upsert({
        where: { workspaceId_layoutId: { workspaceId: workspace2Id, layoutId: 'dominio-separated-v1' } },
        update: { companyCode: '999', isActive: true },
        create: { workspaceId: workspace2Id, targetSystem: 'DOMINIO', layoutId: 'dominio-separated-v1', companyCode: '999', isActive: true }
      });

      const mc2 = await prisma.macroCategory.create({
        data: { code: `TEST_MC2_${crypto.randomUUID()}`, name: 'Test MacroCategory 2', type: 'INCOME', isActive: true }
      });
      const cat2 = await prisma.category.create({
        data: { name: 'Test Category 2', workspaceId: workspace2Id, macroCategoryId: mc2.id }
      });
      await prisma.accountingExportMapping.create({
        data: { workspaceId: workspace2Id, macroCategoryId: mc2.id, layoutId: 'dominio-separated-v1', targetSystem: 'DOMINIO', debitAccountCode: '444', creditAccountCode: '555', historyCode: '666', isActive: true }
      });
      const acc2 = await prisma.account.create({
        data: { name: 'Test Account 2', workspaceId: workspace2Id }
      });

      await prisma.transaction.create({
        data: { workspaceId: workspace2Id, accountId: acc2.id, categoryId: cat2.id, type: 'INCOME', amount: new Decimal('999.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'VAZAMENTO', status: 'COMPLETED' }
      });
    });

    // Transaction on workspace 1
    await tenantContext.run({ currentWorkspaceId: workspaceId }, async () => {
      await prisma.transaction.create({
        data: { workspaceId, accountId, categoryId, type: 'INCOME', amount: new Decimal('150.00'), date: new Date('2026-05-10T12:00:00Z'), description: 'SEGURO', status: 'COMPLETED' }
      });
    });

    // Export using workspace 1 context
    const service = new ExportService();
    const result = await tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      return service.generate({
        workspaceId, userId: 1, layoutId: 'dominio-separated-v1',
        startDate: '2026-05-01', endDate: '2026-05-31',
      });
    });

    const decoded = iconv.decode(result.buffer, 'win1252');

    // Validate it contains workspace 1 data
    expect(decoded).toContain('12345678000190'); // WS1 CNPJ
    expect(decoded).toContain('SEGURO'); // WS1 Transaction

    // Validate it DOES NOT contain workspace 2 data
    expect(decoded).not.toContain('99999999000199'); // WS2 CNPJ
    expect(decoded).not.toContain('VAZAMENTO'); // WS2 Transaction
    expect(decoded).not.toContain('99900'); // WS2 Amount
    expect(decoded).not.toContain('444'); // WS2 Debit
    expect(decoded).not.toContain('555'); // WS2 Credit
    expect(decoded).not.toContain('666'); // WS2 History Code

    // Cleanup workspace 2
    await tenantContext.run({ currentWorkspaceId: workspace2Id }, async () => {
      await prisma.transaction.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.account.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.accountingExportMapping.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.category.deleteMany({ where: { workspaceId: workspace2Id } });
      const mcs = await prisma.macroCategory.findMany({ where: { name: 'Test MacroCategory 2' } });
      for (const mc of mcs) {
        await prisma.macroCategory.deleteMany({ where: { id: mc.id } });
      }
      await prisma.accountingExportConfig.deleteMany({ where: { workspaceId: workspace2Id } });
      await prisma.workspace.deleteMany({ where: { id: workspace2Id } });
    });
  });
});
