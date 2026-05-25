import { OutboxEvent, PrismaClient } from '@prisma/client';
import { AiProvider } from '../../providers/AiProvider';
import { AiInsightClient, AiInsightService } from '../../services/AiInsightService';
import { fiscalLinterPrompts } from '../../prompts/fiscalLinter';
import { maskFinancialText } from '../../lib/piiMasking';
import { FakeAiProvider } from '../../providers/FakeAiProvider';
import { PatrimonialMixAnalysisSchema, hasDangerousRenderableOutput } from './patrimonialMixSchema';
import { SAFE_AI_ERROR_CODES, SafeAiWorkerError } from './errors';
import { TransactionAiContextBuilder } from './TransactionAiContextBuilder';

export const TRANSACTION_EXPENSE_CREATED_EVENT = 'TRANSACTION_EXPENSE_CREATED';
const MIN_RISK_CONFIDENCE = 0.7;

export type AiOutboxHandlerClient = Pick<PrismaClient, 'transaction' | 'aiInsight'> & AiInsightClient;

export class TransactionExpenseInsightHandler {
  private readonly contextBuilder: TransactionAiContextBuilder;
  private readonly insightService: AiInsightService;

  constructor(
    private readonly provider: AiProvider = new FakeAiProvider(),
    client?: AiOutboxHandlerClient
  ) {
    this.contextBuilder = new TransactionAiContextBuilder(client);
    this.insightService = new AiInsightService(client);
  }

  async handle(event: OutboxEvent): Promise<void> {
    if (event.eventType !== TRANSACTION_EXPENSE_CREATED_EVENT) {
      return;
    }

    const payload = this.parsePayload(event);
    const context = await this.contextBuilder.build(event.workspaceId, payload.transactionId);

    if (!context) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.TRANSACTION_NOT_FOUND);
    }

    let rawResponse: string;
    try {
      rawResponse = await this.provider.analyzePatrimonialMix(
        context,
        fiscalLinterPrompts.patrimonialMixV1
      );
    } catch {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PROVIDER_ERROR);
    }

    const parsed = this.parseProviderJson(rawResponse);
    const validated = PatrimonialMixAnalysisSchema.safeParse(parsed);

    if (!validated.success) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PROVIDER_SCHEMA_VALIDATION_FAILED);
    }

    const analysis = validated.data;

    if ([analysis.message, analysis.reason, analysis.educationalHint].some((value) => value && hasDangerousRenderableOutput(value))) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PROVIDER_SCHEMA_VALIDATION_FAILED);
    }

    if (!analysis.hasRisk || analysis.confidence < MIN_RISK_CONFIDENCE) {
      return;
    }

    await this.insightService.create({
      workspaceId: event.workspaceId,
      transactionId: payload.transactionId,
      code: analysis.code!,
      severity: analysis.severity!,
      message: maskFinancialText(analysis.message!),
      reason: maskFinancialText(analysis.reason!),
      confidence: analysis.confidence,
    });
  }

  private parsePayload(event: OutboxEvent): { transactionId: string } {
    const payload = event.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PAYLOAD_INVALID);
    }

    const entries = Object.entries(payload as Record<string, unknown>);
    const allowedKeys = new Set(['transactionId', 'workspaceId']);

    if (entries.some(([key]) => !allowedKeys.has(key))) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PAYLOAD_INVALID);
    }

    const transactionId = (payload as Record<string, unknown>).transactionId;
    const workspaceId = (payload as Record<string, unknown>).workspaceId;

    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PAYLOAD_INVALID);
    }

    if (
      workspaceId !== undefined
      && (typeof workspaceId !== 'number' || !Number.isInteger(workspaceId) || workspaceId <= 0 || workspaceId !== event.workspaceId)
    ) {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PAYLOAD_INVALID);
    }

    return { transactionId };
  }

  private parseProviderJson(rawResponse: string): unknown {
    try {
      return JSON.parse(rawResponse);
    } catch {
      throw new SafeAiWorkerError(SAFE_AI_ERROR_CODES.PROVIDER_INVALID_JSON);
    }
  }
}
