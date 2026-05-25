import { OutboxEvent } from '@prisma/client';
import { OutboxService } from '../services/OutboxService';

export type OutboxHandler = (event: OutboxEvent) => Promise<void>;

export interface ProcessBatchInput {
  limit?: number;
  leaseMs?: number;
  maxAttempts?: number;
  eventType?: string;
  now?: Date;
  handler: OutboxHandler;
}

export interface ProcessBatchResult {
  fetched: number;
  claimed: number;
  processed: number;
  failed: number;
  skipped: number;
}

export class OutboxWorker {
  constructor(private readonly outboxService = new OutboxService()) {}

  async processBatch(input: ProcessBatchInput): Promise<ProcessBatchResult> {
    const now = input.now ?? new Date();
    const result: ProcessBatchResult = {
      fetched: 0,
      claimed: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    const events = await this.outboxService.fetchProcessableBatch({
      limit: input.limit,
      eventType: input.eventType,
      now,
    });
    result.fetched = events.length;

    for (const event of events) {
      const claimed = await this.outboxService.claimForProcessing(event.id, {
        eventType: input.eventType,
        now,
        leaseMs: input.leaseMs,
      });

      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      result.claimed += 1;

      try {
        await input.handler(event);
        const marked = await this.outboxService.markProcessed(event.id, { now });
        if (marked) {
          result.processed += 1;
        }
      } catch (error) {
        await this.outboxService.markFailed(event.id, error, {
          now,
          maxAttempts: input.maxAttempts,
        });
        result.failed += 1;
      }
    }

    return result;
  }
}
