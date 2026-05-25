import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboxService } from '../../src/services/OutboxService';
import { OutboxWorker } from '../../src/workers/OutboxWorker';
import { managementClient } from '../../src/test/prisma-test-clients';

describe('OutboxWorker', () => {
  const workspaceId = 139801;
  const now = new Date('2026-05-24T13:00:00.000Z');
  let service: OutboxService;
  let worker: OutboxWorker;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    service = new OutboxService(managementClient);
    worker = new OutboxWorker(service);

    await managementClient.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: 'S5-007 Worker WS' },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await managementClient.outboxEvent.deleteMany({ where: { workspaceId } });
    await managementClient.workspace.deleteMany({ where: { id: workspaceId } });
    vi.restoreAllMocks();
  });

  async function createEvent(data: Partial<Parameters<typeof managementClient.outboxEvent.create>[0]['data']> = {}) {
    return managementClient.outboxEvent.create({
      data: {
        workspaceId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: crypto.randomUUID() },
        nextAttemptAt: now,
        ...data,
      },
    });
  }

  it('fetches and processes a pending event once', async () => {
    const event = await createEvent();
    const handler = vi.fn().mockResolvedValue(undefined);

    const result = await worker.processBatch({ limit: 10, handler, now });

    expect(result).toEqual({ fetched: 1, claimed: 1, processed: 1, failed: 0, skipped: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: event.id, workspaceId }));

    const processed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(processed.status).toBe('PROCESSED');
    expect(processed.processedAt).toEqual(now);
  });

  it('does not process an already processed event', async () => {
    await createEvent({ status: 'PROCESSED', processedAt: now });
    const handler = vi.fn().mockResolvedValue(undefined);

    const result = await worker.processBatch({ limit: 10, handler, now });

    expect(result.fetched).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('skips an event when conditional claim fails', async () => {
    await createEvent();
    const handler = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(service, 'claimForProcessing').mockResolvedValueOnce(false);

    const result = await worker.processBatch({ limit: 10, handler, now });

    expect(result).toEqual({ fetched: 1, claimed: 0, processed: 0, failed: 0, skipped: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('marks handler errors as retryable failures with safe persisted error details', async () => {
    const event = await createEvent();
    const handler = vi.fn().mockRejectedValue(new Error('Falha CPF 123.456.789-09 cliente@example.com'));

    const result = await worker.processBatch({ limit: 10, handler, now, maxAttempts: 3 });

    expect(result).toEqual({ fetched: 1, claimed: 1, processed: 0, failed: 1, skipped: 0 });

    const failed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(failed.status).toBe('PENDING');
    expect(failed.attempts).toBe(1);
    expect(failed.lastError).toContain('[CPF_MASKED]');
    expect(failed.lastError).toContain('[EMAIL_MASKED]');
    expect(failed.lastError).not.toContain('123.456.789-09');
    expect(failed.lastError).not.toContain('cliente@example.com');
    expect(failed.nextAttemptAt.getTime()).toBe(now.getTime() + 60_000);
  });

  it('recovers an expired PROCESSING event in a future batch', async () => {
    const event = await createEvent({
      status: 'PROCESSING',
      nextAttemptAt: new Date(now.getTime() - 1000),
    });
    const handler = vi.fn().mockResolvedValue(undefined);

    const result = await worker.processBatch({ limit: 10, handler, now });

    expect(result.processed).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);

    const processed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(processed.status).toBe('PROCESSED');
  });

  it('does not process a PROCESSING event whose lease has not expired', async () => {
    await createEvent({
      status: 'PROCESSING',
      nextAttemptAt: new Date(now.getTime() + 60_000),
    });
    const handler = vi.fn().mockResolvedValue(undefined);

    const result = await worker.processBatch({ limit: 10, handler, now });

    expect(result.fetched).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });
});
