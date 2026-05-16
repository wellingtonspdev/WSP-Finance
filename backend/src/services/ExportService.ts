import { prisma } from '../lib/prisma';
import { tenantContext } from '../lib/tenantContext';
import { ExportFormatter } from './ExportFormatter';
import { ExportLayoutEngine } from './ExportLayoutEngine';
import { encodeWindows1252, sha256 } from '../lib/encoding';

export interface ExportRequest {
  workspaceId: number;
  userId: number;
  layoutId: string;
  startDate: string;
  endDate: string;
}

export interface ExportWarning {
  code: string;
  field?: string;
  transactionId?: string;
  recordType?: string;
  maxLength?: number;
  actualLength?: number;
  message: string;
}

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  contentType: 'text/plain; charset=windows-1252';
  encoding: 'windows-1252';
  hash: string;
  recordCount: number;
  warnings: ExportWarning[];
}

export class ExportService {
  async generate(request: ExportRequest): Promise<ExportResult> {
    const store = tenantContext.getStore();

    if (!store || !store.currentWorkspaceId) {
      throw new Error('Tenant context is missing');
    }

    if (store.currentWorkspaceId !== request.workspaceId) {
      throw new Error('Tenant context mismatch');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: request.workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const cleanCnpj = ExportFormatter.formatCnpj(workspace.documentType, workspace.document);

    const config = await prisma.accountingExportConfig.findFirst({
      where: {
        workspaceId: request.workspaceId,
        layoutId: request.layoutId,
        isActive: true,
      },
    });

    if (!config) {
      throw new Error('Accounting export config not found or inactive');
    }

    const startDateUtc = new Date(`${request.startDate}T00:00:00.000Z`);

    // add 1 day to endDate to make it inclusive (lt next day)
    const endRaw = new Date(`${request.endDate}T00:00:00.000Z`);
    const dayAfterEndDateUtc = new Date(endRaw.getTime());
    dayAfterEndDateUtc.setUTCDate(dayAfterEndDateUtc.getUTCDate() + 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId: request.workspaceId,
        status: { in: ['COMPLETED', 'RECONCILED'] },
        date: {
          gte: startDateUtc,
          lt: dayAfterEndDateUtc,
        },
      },
      orderBy: [
        { date: 'asc' },
        { id: 'asc' },
      ],
      include: {
        category: true,
      },
    });

    if (transactions.length === 0) {
      throw new Error('No exportable transactions found in the given period');
    }

    const mappings = await prisma.accountingExportMapping.findMany({
      where: {
        workspaceId: request.workspaceId,
        layoutId: request.layoutId,
        isActive: true,
      },
    });

    const mappingByMacroCatId = new Map(mappings.map(m => [m.macroCategoryId, m]));

    const engine = new ExportLayoutEngine(request.layoutId);
    const warnings: ExportWarning[] = [];

    engine.addRecord0000(cleanCnpj, config.companyCode);
    engine.addRecord6000();

    for (const t of transactions) {
      if (t.amount.lte(0)) {
        throw new Error(`Transaction amount must be greater than zero for transaction ${t.id}`);
      }

      if (!t.category.macroCategoryId) {
        throw new Error(`Transaction category has no macroCategoryId for transaction ${t.id}`);
      }

      const mapping = mappingByMacroCatId.get(t.category.macroCategoryId);
      if (!mapping) {
        throw new Error(`No mapping found for MacroCategory ${t.category.macroCategoryId}`);
      }

      if (config.historyCodeRequired && !mapping.historyCode) {
        throw new Error(`historyCode is required by config but missing in mapping for MacroCategory ${t.category.macroCategoryId}`);
      }

      const formattedDate = ExportFormatter.formatDate(t.date);
      const amountImplicitCents = ExportFormatter.formatAmountImplicitCents(t.amount);
      const complement = ExportFormatter.sanitizeComplement(t.description);

      const isTruncated = t.description.length > 255;
      const isSanitized = complement !== t.description;

      if (isTruncated || isSanitized) {
        warnings.push({
          code: isTruncated ? 'TRUNCATED_COMPLEMENT' : 'SANITIZED_COMPLEMENT',
          field: 'description',
          transactionId: t.id,
          recordType: '6100',
          maxLength: 255,
          actualLength: t.description.length,
          message: isTruncated
            ? 'Complement was truncated to fit constraints'
            : 'Complement was sanitized to fit constraints',
        });
      }

      engine.addRecord6100(
        formattedDate,
        mapping.debitAccountCode,
        mapping.creditAccountCode,
        amountImplicitCents,
        mapping.historyCode,
        complement,
        config.sourceLabel,
        config.branchCode
      );
    }

    const txtContent = engine.generate();
    const buffer = encodeWindows1252(txtContent);
    const hash = sha256(buffer);
    const fileName = `wsp-dominio-${request.startDate}_${request.endDate}.txt`;

    return {
      buffer,
      fileName,
      contentType: 'text/plain; charset=windows-1252',
      encoding: 'windows-1252',
      hash,
      recordCount: engine.getRecordCount(),
      warnings,
    };
  }
}
