import { Prisma, PrismaClient } from '@prisma/client';
import { sysPrisma } from '../lib/prisma';
import { maskFinancialText } from '../lib/piiMasking';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const LAST_ERROR_MAX_LENGTH = 1000;
const MAX_BACKOFF_MS = 15 * 60_000;
const BASE_BACKOFF_MS = 60_000;

const DENIED_PAYLOAD_KEYS = new Set([
  'rawtext',
  'prompt',
  'rawpayload',
  'cpf',
  'cnpj',
  'email',
  'phone',
  'telephone',
  'pixkey',
  'customername',
  'personname',
  'fullname',
  'documentnumber',
  'description',
  'objectkey',
]);

type OutboxClient = Pick<PrismaClient, 'outboxEvent' | '$transaction'>;

export interface EnqueueOutboxInput {
  workspaceId: number;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

export interface FetchProcessableBatchParams {
  limit?: number;
  eventType?: string;
  now?: Date;
}

export interface ClaimForProcessingOptions {
  eventType?: string;
  now?: Date;
  leaseMs?: number;
}

export interface MarkProcessedOptions {
  now?: Date;
}

export interface MarkFailedOptions {
  now?: Date;
  maxAttempts?: number;
}

export class OutboxService {
  constructor(private readonly client: OutboxClient = sysPrisma as OutboxClient) {}

  async enqueueInTransaction(tx: Prisma.TransactionClient, input: EnqueueOutboxInput) {
    const payload = this.validateAndSanitizePayload(input.payload);
    const eventType = input.eventType.trim();
    const now = new Date();

    if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
      throw new Error('Invalid workspaceId for outbox event.');
    }

    if (!eventType) {
      throw new Error('Invalid eventType for outbox event.');
    }

    return tx.outboxEvent.create({
      data: {
        workspaceId: input.workspaceId,
        eventType,
        payload,
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: now,
        processedAt: null,
        lastError: null,
      },
    });
  }

  async fetchProcessableBatch(params: FetchProcessableBatchParams = {}) {
    const now = params.now ?? new Date();
    const limit = this.normalizeLimit(params.limit);
    const eventType = this.normalizeOptionalEventType(params.eventType);

    return this.client.outboxEvent.findMany({
      where: {
        ...(eventType ? { eventType } : {}),
        nextAttemptAt: { lte: now },
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING' },
        ],
      },
      orderBy: [
        { nextAttemptAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });
  }

  async claimForProcessing(eventId: string, options: ClaimForProcessingOptions = {}): Promise<boolean> {
    const now = options.now ?? new Date();
    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    const eventType = this.normalizeOptionalEventType(options.eventType);
    const leaseDeadline = new Date(now.getTime() + leaseMs);

    // Worker polling/claim is global infrastructure. This is the only outbox path
    // allowed to use the administrative client; domain handlers must use workspaceId.
    const result = await this.client.outboxEvent.updateMany({
      where: {
        id: eventId,
        ...(eventType ? { eventType } : {}),
        nextAttemptAt: { lte: now },
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING' },
        ],
      },
      data: {
        status: 'PROCESSING',
        nextAttemptAt: leaseDeadline,
      },
    });

    return result.count === 1;
  }

  async markProcessed(eventId: string, options: MarkProcessedOptions = {}): Promise<boolean> {
    const now = options.now ?? new Date();

    const result = await this.client.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: 'PROCESSING',
      },
      data: {
        status: 'PROCESSED',
        processedAt: now,
        lastError: null,
      },
    });

    return result.count === 1;
  }

  async markFailed(eventId: string, error: unknown, options: MarkFailedOptions = {}): Promise<boolean> {
    const now = options.now ?? new Date();
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const safeError = this.sanitizeLastError(error);

    return this.client.$transaction(async (tx) => {
      const event = await tx.outboxEvent.findUnique({
        where: { id: eventId },
        select: { attempts: true, status: true },
      });

      if (!event || event.status !== 'PROCESSING') {
        return false;
      }

      const attempts = event.attempts + 1;
      const nextAttemptAt = new Date(now.getTime() + this.calculateBackoffMs(attempts));
      const status = attempts >= maxAttempts ? 'FAILED' : 'PENDING';

      const result = await tx.outboxEvent.updateMany({
        where: {
          id: eventId,
          status: 'PROCESSING',
          attempts: event.attempts,
        },
        data: {
          attempts,
          status,
          lastError: safeError,
          nextAttemptAt,
        },
      });

      return result.count === 1;
    });
  }

  sanitizeLastError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const masked = maskFinancialText(message).replace(/\s+/g, ' ').trim();
    return masked.slice(0, LAST_ERROR_MAX_LENGTH);
  }

  calculateBackoffMs(attempts: number): number {
    return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(attempts - 1, 0), MAX_BACKOFF_MS);
  }

  private normalizeLimit(limit = DEFAULT_LIMIT): number {
    if (!Number.isInteger(limit) || limit <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(limit, MAX_LIMIT);
  }

  private normalizeOptionalEventType(eventType?: string): string | undefined {
    const normalized = eventType?.trim();
    return normalized || undefined;
  }

  private validateAndSanitizePayload(payload: Prisma.InputJsonValue): Prisma.InputJsonObject {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Outbox payload must be a JSON object.');
    }

    return this.sanitizeJsonObject(payload as Prisma.InputJsonObject);
  }

  private sanitizeJsonObject(input: Prisma.InputJsonObject): Prisma.InputJsonObject {
    const output: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = key.toLowerCase();

      if (DENIED_PAYLOAD_KEYS.has(normalizedKey)) {
        throw new Error(`Outbox payload key is not allowed: ${key}`);
      }

      output[key] = this.sanitizeJsonValue(value);
    }

    return output as Prisma.InputJsonObject;
  }

  private sanitizeJsonValue(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonValue | null {
    if (value === undefined) {
      throw new Error('Outbox payload cannot contain undefined values.');
    }

    if (typeof value === 'string') {
      return maskFinancialText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeJsonValue(item));
    }

    if (value && typeof value === 'object') {
      return this.sanitizeJsonObject(value as Prisma.InputJsonObject);
    }

    return value;
  }
}
