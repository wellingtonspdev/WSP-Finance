import { prisma } from '../lib/prisma';
import { tenantContext } from '../lib/tenantContext';
import {
  normalizeText,
  removeDelimiter,
  removeEmojis,
  removeUnsupportedUnicode,
  removeControlChars,
  toDominioText,
} from '../lib/sanitizer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportValidationSeverity = 'WARNING' | 'BLOCKER';

export type ExportValidationWarningCode =
  | 'FIELD_TRUNCATED'
  | 'TEXT_SANITIZED'
  | 'GENERIC_OTHERS_CATEGORY_USED'
  | 'MISSING_HISTORY_CODE'
  | 'OPTIONAL_BRANCH_CODE_MISSING';

export type ExportValidationBlockerCode =
  | 'NO_EXPORTABLE_RECORDS'
  | 'MISSING_ACCOUNTING_CONFIG'
  | 'MISSING_COMPANY_CODE'
  | 'MISSING_ACCOUNTING_MAPPING'
  | 'MISSING_DEBIT_ACCOUNT_CODE'
  | 'MISSING_CREDIT_ACCOUNT_CODE'
  | 'CATEGORY_WITHOUT_MACRO'
  | 'STATUS_NOT_EXPORTABLE'
  | 'INVALID_TRANSACTION_DATE'
  | 'INVALID_AMOUNT'
  | 'INVALID_LAYOUT_ID'
  | 'UNSUPPORTED_RATE_ALLOCATION'
  | 'MISSING_HISTORY_CODE';

export interface ExportValidationIssueBase {
  code: ExportValidationWarningCode | ExportValidationBlockerCode;
  severity: ExportValidationSeverity;
  field?: string;
  transactionId?: string;
  affectedRows?: number;
  message: string;
}

export interface ExportValidationWarning extends ExportValidationIssueBase {
  severity: 'WARNING';
  code: ExportValidationWarningCode;
}

export interface ExportValidationBlocker extends ExportValidationIssueBase {
  severity: 'BLOCKER';
  code: ExportValidationBlockerCode;
}

export interface ExportValidationResponse {
  valid: boolean;
  layoutId: string;
  totalRecords: number;
  warnings: ExportValidationWarning[];
  blockers: ExportValidationBlocker[];
  summary: {
    warningsCount: number;
    blockersCount: number;
  };
}

export interface ExportValidationRequest {
  workspaceId: number;
  layoutId: string;
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// Supported layouts
// ---------------------------------------------------------------------------
const SUPPORTED_LAYOUT_IDS = new Set(['dominio-separated-v1']);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ExportValidationService {
  private readonly db: typeof prisma;

  constructor(dbClient?: typeof prisma) {
    this.db = dbClient ?? prisma;
  }

  async validate(request: ExportValidationRequest): Promise<ExportValidationResponse> {
    const warnings: ExportValidationWarning[] = [];
    const blockers: ExportValidationBlocker[] = [];

    const { workspaceId, layoutId, startDate, endDate } = request;

    // ----- Layout validation -----
    if (!SUPPORTED_LAYOUT_IDS.has(layoutId)) {
      blockers.push({
        code: 'INVALID_LAYOUT_ID',
        severity: 'BLOCKER',
        field: 'layoutId',
        message: 'Layout de exportação não suportado.',
      });

      return buildResponse(layoutId, 2, warnings, blockers);
    }

    // ----- Config validation -----
    const config = await this.db.accountingExportConfig.findFirst({
      where: {
        workspaceId,
        layoutId,
        isActive: true,
      },
    });

    if (!config) {
      blockers.push({
        code: 'MISSING_ACCOUNTING_CONFIG',
        severity: 'BLOCKER',
        field: 'config',
        message: 'Configuração de exportação contábil não encontrada ou inativa.',
      });
    }

    if (config && (!config.companyCode || config.companyCode.trim() === '')) {
      blockers.push({
        code: 'MISSING_COMPANY_CODE',
        severity: 'BLOCKER',
        field: 'companyCode',
        message: 'Código da empresa obrigatório está ausente na configuração.',
      });
    }

    // ----- Fetch all transactions in period (without status filter) -----
    const startDateUtc = new Date(`${startDate}T00:00:00.000Z`);
    const endRaw = new Date(`${endDate}T00:00:00.000Z`);
    const dayAfterEndDateUtc = new Date(endRaw.getTime());
    dayAfterEndDateUtc.setUTCDate(dayAfterEndDateUtc.getUTCDate() + 1);

    const allTransactions = await this.db.transaction.findMany({
      where: {
        workspaceId,
        date: {
          gte: startDateUtc,
          lt: dayAfterEndDateUtc,
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      include: {
        category: {
          include: {
            macroCategory: true,
          },
        },
      },
    });

    // ----- Separate exportable vs non-exportable -----
    const exportableTransactions = allTransactions.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'RECONCILED',
    );
    const nonExportableTransactions = allTransactions.filter(
      (t) => t.status !== 'COMPLETED' && t.status !== 'RECONCILED',
    );

    // ----- Status blockers -----
    if (exportableTransactions.length === 0) {
      blockers.push({
        code: 'NO_EXPORTABLE_RECORDS',
        severity: 'BLOCKER',
        message: 'Nenhuma transação exportável encontrada no período.',
      });
    }

    if (nonExportableTransactions.length > 0) {
      blockers.push({
        code: 'STATUS_NOT_EXPORTABLE',
        severity: 'BLOCKER',
        affectedRows: nonExportableTransactions.length,
        message: `${nonExportableTransactions.length} transação(ões) com status não exportável no período.`,
      });
    }

    // ----- branchCode warning (aggregate, only if config exists and companyCode exists) -----
    if (
      config &&
      config.companyCode &&
      config.companyCode.trim() !== '' &&
      !config.branchCode &&
      exportableTransactions.length > 0
    ) {
      warnings.push({
        code: 'OPTIONAL_BRANCH_CODE_MISSING',
        severity: 'WARNING',
        field: 'branchCode',
        message: 'Código da filial ausente na configuração. A exportação usará campo vazio.',
      });
    }

    // ----- Mappings validation -----
    const mappings = config
      ? await this.db.accountingExportMapping.findMany({
          where: {
            workspaceId,
            layoutId,
            isActive: true,
          },
        })
      : [];

    const mappingByMacroCatId = new Map(mappings.map((m) => [m.macroCategoryId, m]));

    // ----- Per-transaction validations (only for exportable) -----
    for (const t of exportableTransactions) {
      // Amount validation
      if (t.amount.lte(0)) {
        blockers.push({
          code: 'INVALID_AMOUNT',
          severity: 'BLOCKER',
          field: 'amount',
          transactionId: t.id,
          message: 'Valor da transação deve ser maior que zero.',
        });
      }

      // Category macro validation
      if (!t.category.macroCategoryId || !t.category.macroCategory) {
        blockers.push({
          code: 'CATEGORY_WITHOUT_MACRO',
          severity: 'BLOCKER',
          field: 'category',
          transactionId: t.id,
          message: 'Categoria da transação não possui MacroCategory vinculada.',
        });
        continue; // Can't validate mapping without macro
      }

      // Generic "Outros" warning
      if (t.category.macroCategory && t.category.macroCategory.code === 'OUT_GEN') {
        warnings.push({
          code: 'GENERIC_OTHERS_CATEGORY_USED',
          severity: 'WARNING',
          field: 'category',
          transactionId: t.id,
          message: 'Transação usa categoria genérica "Outros".',
        });
      }

      // Mapping validation
      const mapping = mappingByMacroCatId.get(t.category.macroCategoryId);
      if (!mapping) {
        blockers.push({
          code: 'MISSING_ACCOUNTING_MAPPING',
          severity: 'BLOCKER',
          field: 'mapping',
          transactionId: t.id,
          message: 'Mapeamento contábil ausente para a MacroCategory da transação.',
        });
        continue;
      }

      // debitAccountCode validation
      if (!mapping.debitAccountCode || mapping.debitAccountCode.trim() === '') {
        blockers.push({
          code: 'MISSING_DEBIT_ACCOUNT_CODE',
          severity: 'BLOCKER',
          field: 'debitAccountCode',
          transactionId: t.id,
          message: 'Código da conta de débito ausente no mapeamento.',
        });
      }

      // creditAccountCode validation
      if (!mapping.creditAccountCode || mapping.creditAccountCode.trim() === '') {
        blockers.push({
          code: 'MISSING_CREDIT_ACCOUNT_CODE',
          severity: 'BLOCKER',
          field: 'creditAccountCode',
          transactionId: t.id,
          message: 'Código da conta de crédito ausente no mapeamento.',
        });
      }

      // historyCode validation
      if (!mapping.historyCode || mapping.historyCode.trim() === '') {
        if (config && config.historyCodeRequired) {
          blockers.push({
            code: 'MISSING_HISTORY_CODE',
            severity: 'BLOCKER',
            field: 'historyCode',
            transactionId: t.id,
            message: 'Código de histórico obrigatório está ausente no mapeamento.',
          });
        } else {
          warnings.push({
            code: 'MISSING_HISTORY_CODE',
            severity: 'WARNING',
            field: 'historyCode',
            transactionId: t.id,
            message: 'Código de histórico ausente no mapeamento.',
          });
        }
      }

      // ----- Text sanitization/truncation validation -----
      validateTextSanitization(t.id, t.description, warnings);
    }

    const totalRecords = 2 + exportableTransactions.length;
    return buildResponse(layoutId, totalRecords, warnings, blockers);
  }
}

// ---------------------------------------------------------------------------
// Helpers (private module scope)
// ---------------------------------------------------------------------------

/**
 * Sanitize text through the same pipeline as toDominioText but detect
 * intermediate changes (sanitization and truncation) separately.
 */
function sanitizeWithoutTruncate(input: string | null | undefined): string {
  const safe = input ?? '';
  const normalized = normalizeText(safe);
  const withoutDelimiter = removeDelimiter(normalized);
  const withoutEmojis = removeEmojis(withoutDelimiter);
  const withoutUnsupported = removeUnsupportedUnicode(withoutEmojis);
  const withoutControl = removeControlChars(withoutUnsupported);
  // Normalize spaces again after removals
  const result = withoutControl.replace(/\s+/g, ' ').trim();
  return result.toLocaleUpperCase('pt-BR');
}

function validateTextSanitization(
  transactionId: string,
  description: string,
  warnings: ExportValidationWarning[],
): void {
  const sanitizedPreTruncate = sanitizeWithoutTruncate(description);
  const finalText = toDominioText(description, 255);

  const isSanitized = sanitizedPreTruncate !== description.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');

  if (isSanitized) {
    warnings.push({
      code: 'TEXT_SANITIZED',
      severity: 'WARNING',
      field: 'description',
      transactionId,
      message: 'Texto da transação foi sanitizado para compatibilidade com o layout.',
    });
  }

  if (sanitizedPreTruncate.length > 255) {
    warnings.push({
      code: 'FIELD_TRUNCATED',
      severity: 'WARNING',
      field: 'description',
      transactionId,
      message: 'Texto da transação será truncado para caber no limite de 255 caracteres.',
    });
  }
}

function buildResponse(
  layoutId: string,
  totalRecords: number,
  warnings: ExportValidationWarning[],
  blockers: ExportValidationBlocker[],
): ExportValidationResponse {
  return {
    valid: blockers.length === 0,
    layoutId,
    totalRecords,
    warnings,
    blockers,
    summary: {
      warningsCount: warnings.length,
      blockersCount: blockers.length,
    },
  };
}
