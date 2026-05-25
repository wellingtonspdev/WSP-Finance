import { OutboxEvent } from '@prisma/client';
import { AiProvider } from '../providers/AiProvider';
import { FakeAiProvider } from '../providers/FakeAiProvider';
import { OutboxService } from '../services/OutboxService';
import { OutboxWorker, ProcessBatchResult } from './OutboxWorker';
import { AiOutboxHandlerClient, TransactionExpenseInsightHandler, TRANSACTION_EXPENSE_CREATED_EVENT } from './ai/TransactionExpenseInsightHandler';

export interface AiOutboxWorkerOptions {
  outboxService?: OutboxService;
  provider?: AiProvider;
  client?: AiOutboxHandlerClient;
}

export interface AiOutboxRunOnceInput {
  limit?: number;
  leaseMs?: number;
  maxAttempts?: number;
  now?: Date;
}

export class AiOutboxWorker {
  private readonly worker: OutboxWorker;
  private readonly handler: TransactionExpenseInsightHandler;

  constructor(options: AiOutboxWorkerOptions = {}) {
    const outboxService = options.outboxService ?? new OutboxService();
    const provider = options.provider ?? new FakeAiProvider();
    this.worker = new OutboxWorker(outboxService);
    this.handler = new TransactionExpenseInsightHandler(provider, options.client);
  }

  async runOnce(input: AiOutboxRunOnceInput = {}): Promise<ProcessBatchResult> {
    return this.worker.processBatch({
      ...input,
      eventType: TRANSACTION_EXPENSE_CREATED_EVENT,
      handler: (event) => this.processEvent(event),
    });
  }

  async processEvent(event: OutboxEvent): Promise<void> {
    return this.handler.handle(event);
  }
}
