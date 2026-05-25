import { AiInsightCode, AiInsightSeverity, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { maskFinancialText } from '../lib/piiMasking';
import { NotFoundError } from '../errors/NotFoundError';

const MESSAGE_MAX_LENGTH = 500;
const REASON_MAX_LENGTH = 1000;

const VALID_SEVERITIES = new Set<string>(['INFO', 'WARNING', 'CRITICAL']);
const VALID_CODES = new Set<string>([
  'MISTURA_PATRIMONIAL',
  'RISCO_MALHA_FINA',
  'DESPESA_PESSOAL_POTENCIAL',
]);

export interface CreateAiInsightInput {
  workspaceId: number;
  transactionId: string;
  severity: AiInsightSeverity;
  code: AiInsightCode;
  message: string;
  reason: string;
  confidence: number;
}

export interface ListWorkspaceInsightsFilter {
  dismissed?: boolean;
}

type AiInsightClient = Pick<typeof prisma, 'aiInsight' | 'transaction'>;

export class AiInsightService {
  private readonly client: AiInsightClient;

  constructor(client?: AiInsightClient) {
    this.client = client ?? prisma;
  }

  async create(input: CreateAiInsightInput) {
    // ── Validate workspaceId ──
    if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
      throw new Error('Invalid workspaceId.');
    }

    // ── Validate transactionId ──
    if (!input.transactionId || typeof input.transactionId !== 'string' || !input.transactionId.trim()) {
      throw new Error('Invalid transactionId.');
    }

    // ── Validate severity ──
    if (!VALID_SEVERITIES.has(input.severity)) {
      throw new Error('Invalid severity.');
    }

    // ── Validate code ──
    if (!VALID_CODES.has(input.code)) {
      throw new Error('Invalid code.');
    }

    // ── Validate confidence ──
    if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
      throw new Error('Invalid confidence: must be between 0 and 1.');
    }

    // ── Validate and sanitize message ──
    const trimmedMessage = input.message?.trim() ?? '';
    if (!trimmedMessage) {
      throw new Error('Invalid message: must not be empty.');
    }
    const safeMessage = maskFinancialText(trimmedMessage).slice(0, MESSAGE_MAX_LENGTH);

    // ── Validate and sanitize reason ──
    const trimmedReason = input.reason?.trim() ?? '';
    if (!trimmedReason) {
      throw new Error('Invalid reason: must not be empty.');
    }
    const safeReason = maskFinancialText(trimmedReason).slice(0, REASON_MAX_LENGTH);

    // ── Verify transaction belongs to the same workspace ──
    const transaction = await this.client.transaction.findFirst({
      where: {
        id: input.transactionId,
        workspaceId: input.workspaceId,
      },
      select: { id: true },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found or does not belong to this workspace.');
    }

    // ── Idempotent upsert by workspaceId + transactionId + code ──
    // Preserves `dismissed` on update (does not reopen dismissed insights)
    const confidenceDecimal = new Prisma.Decimal(input.confidence.toString());

    return this.client.aiInsight.upsert({
      where: {
        workspaceId_transactionId_code: {
          workspaceId: input.workspaceId,
          transactionId: input.transactionId,
          code: input.code,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        transactionId: input.transactionId,
        severity: input.severity,
        code: input.code,
        message: safeMessage,
        reason: safeReason,
        confidence: confidenceDecimal,
        dismissed: false,
      },
      update: {
        severity: input.severity,
        message: safeMessage,
        reason: safeReason,
        confidence: confidenceDecimal,
        // dismissed is intentionally NOT included — preserves current value
      },
    });
  }

  async listByTransaction(workspaceId: number, transactionId: string) {
    return this.client.aiInsight.findMany({
      where: {
        workspaceId,
        transactionId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByWorkspace(workspaceId: number, filters?: ListWorkspaceInsightsFilter) {
    const where: Prisma.AiInsightWhereInput = { workspaceId };

    if (filters?.dismissed !== undefined) {
      where.dismissed = filters.dismissed;
    }

    return this.client.aiInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async dismiss(workspaceId: number, insightId: string) {
    // updateMany ensures tenant-safety without needing composite unique on (id, workspaceId)
    const result = await this.client.aiInsight.updateMany({
      where: {
        id: insightId,
        workspaceId,
      },
      data: {
        dismissed: true,
      },
    });

    if (result.count === 0) {
      throw new NotFoundError('Insight not found.');
    }

    // Fetch the updated record to return it
    const updated = await this.client.aiInsight.findFirst({
      where: {
        id: insightId,
        workspaceId,
      },
    });

    if (!updated) {
      throw new NotFoundError('Insight not found after update.');
    }

    return updated;
  }
}
