import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { OutboxService } from '../../src/services/OutboxService';
import { applicationClient, managementClient, withTestWorkspace } from '../../src/test/prisma-test-clients';
import { withEphemeralTransaction } from '../../src/test/transaction-proxy';

describe('OutboxService', () => {
  const wsAId = 139701;
  const wsBId = 139702;
  const accountId = 139711;
  const categoryId = 139721;
  const now = new Date('2026-05-24T12:00:00.000Z');
  let service: OutboxService;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    service = new OutboxService(managementClient);

    await managementClient.workspace.createMany({
      data: [
        { id: wsAId, name: 'S5-007 WS A' },
        { id: wsBId, name: 'S5-007 WS B' },
      ],
      skipDuplicates: true,
    });

    await managementClient.category.upsert({
      where: { id: categoryId },
      update: {},
      create: { id: categoryId, name: 'S5-007 Category' },
    });

    await managementClient.account.upsert({
      where: { id: accountId },
      update: {},
      create: { id: accountId, name: 'S5-007 Account', workspaceId: wsAId },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();

    await managementClient.outboxEvent.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });
    await managementClient.transaction.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });
    await managementClient.account.deleteMany({ where: { id: accountId } });
    await managementClient.workspace.deleteMany({ where: { id: { in: [wsAId, wsBId] } } });
    await managementClient.category.deleteMany({ where: { id: categoryId } });
  });

  async function enqueue(payload: Prisma.JsonObject = { transactionId: crypto.randomUUID() }) {
    return managementClient.$transaction((tx) =>
      service.enqueueInTransaction(tx, {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload,
      })
    );
  }

  it('creates a valid pending OutboxEvent inside an existing transaction', async () => {
    const event = await enqueue({ transactionId: 'tx-1', source: 'TRANSACTION_CREATED' });

    expect(event.workspaceId).toBe(wsAId);
    expect(event.eventType).toBe('TRANSACTION_CREATED');
    expect(event.payload).toEqual({ transactionId: 'tx-1', source: 'TRANSACTION_CREATED' });
    expect(event.status).toBe('PENDING');
    expect(event.attempts).toBe(0);
    expect(event.nextAttemptAt).toEqual(now);
    expect(event.processedAt).toBeNull();
    expect(event.lastError).toBeNull();
  });

  it('normalizes eventType before persisting the OutboxEvent', async () => {
    const event = await managementClient.$transaction((tx) =>
      service.enqueueInTransaction(tx, {
        workspaceId: wsAId,
        eventType: ' TRANSACTION_CREATED ',
        payload: { transactionId: 'tx-trimmed' },
      })
    );

    expect(event.eventType).toBe('TRANSACTION_CREATED');

    const persisted = await managementClient.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(persisted.eventType).toBe('TRANSACTION_CREATED');
  });

  it('commits a business Transaction and OutboxEvent atomically', async () => {
    const transaction = await managementClient.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          description: 'Outbox business transaction',
          amount: new Prisma.Decimal('15.99'),
          date: now,
          type: 'EXPENSE',
          accountId,
          categoryId,
          workspaceId: wsAId,
        },
      });

      await service.enqueueInTransaction(tx, {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: created.id },
      });

      return created;
    });

    await expect(managementClient.transaction.findUnique({ where: { id: transaction.id } })).resolves.not.toBeNull();
    await expect(managementClient.outboxEvent.count({ where: { workspaceId: wsAId } })).resolves.toBe(1);
  });

  it('rolls back the OutboxEvent when the business transaction rolls back', async () => {
    await expect(
      managementClient.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            id: 'rollback-s5-007',
            description: 'Rollback transaction',
            amount: new Prisma.Decimal('20.00'),
            date: now,
            type: 'INCOME',
            accountId,
            categoryId,
            workspaceId: wsAId,
          },
        });

        await service.enqueueInTransaction(tx, {
          workspaceId: wsAId,
          eventType: 'TRANSACTION_CREATED',
          payload: { transactionId: 'rollback-s5-007' },
        });

        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    await expect(managementClient.transaction.findUnique({ where: { id: 'rollback-s5-007' } })).resolves.toBeNull();
    await expect(managementClient.outboxEvent.count({ where: { workspaceId: wsAId } })).resolves.toBe(0);
  });

  it('fetches only processable pending events ordered by nextAttemptAt and createdAt', async () => {
    const older = new Date(now.getTime() - 60_000);
    const later = new Date(now.getTime() + 60_000);
    const processable = await enqueue({ transactionId: 'processable' });

    await managementClient.outboxEvent.create({
      data: {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: 'future' },
        nextAttemptAt: later,
      },
    });
    await managementClient.outboxEvent.update({
      where: { id: processable.id },
      data: { nextAttemptAt: older },
    });

    const batch = await service.fetchProcessableBatch({ limit: 10, now });

    expect(batch.map((event) => event.id)).toEqual([processable.id]);
  });

  it('recovers PROCESSING events only after their lease expires', async () => {
    const expired = await managementClient.outboxEvent.create({
      data: {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: 'expired' },
        status: 'PROCESSING',
        nextAttemptAt: new Date(now.getTime() - 1),
      },
    });

    await managementClient.outboxEvent.create({
      data: {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: 'leased' },
        status: 'PROCESSING',
        nextAttemptAt: new Date(now.getTime() + 60_000),
      },
    });

    const batch = await service.fetchProcessableBatch({ limit: 10, now });

    expect(batch.map((event) => event.id)).toEqual([expired.id]);
  });

  it('conditionally claims a processable event and refuses already processed events', async () => {
    const event = await enqueue();

    await expect(service.claimForProcessing(event.id, { now, leaseMs: 30_000 })).resolves.toBe(true);

    const claimed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(claimed.status).toBe('PROCESSING');
    expect(claimed.nextAttemptAt.getTime()).toBe(now.getTime() + 30_000);

    await managementClient.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: now },
    });

    await expect(service.claimForProcessing(event.id, { now, leaseMs: 30_000 })).resolves.toBe(false);
  });

  it('marks a processing event as processed without reopening processed events', async () => {
    const event = await enqueue();
    await service.claimForProcessing(event.id, { now, leaseMs: 30_000 });
    await managementClient.outboxEvent.update({
      where: { id: event.id },
      data: { lastError: 'temporary' },
    });

    await expect(service.markProcessed(event.id, { now })).resolves.toBe(true);

    const processed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(processed.status).toBe('PROCESSED');
    expect(processed.processedAt).toEqual(now);
    expect(processed.lastError).toBeNull();

    await expect(service.markProcessed(event.id, { now: new Date(now.getTime() + 1000) })).resolves.toBe(false);
  });

  it('marks failures with safe lastError, backoff, retry status, and maxAttempts cutoff', async () => {
    const event = await enqueue();
    await service.claimForProcessing(event.id, { now, leaseMs: 30_000 });

    await expect(
      service.markFailed(
        event.id,
        new Error(`Pagamento PIX para CPF 123.456.789-09 cliente@example.com ${'x'.repeat(1200)}`),
        { now, maxAttempts: 2 }
      )
    ).resolves.toBe(true);

    const retryable = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(retryable.attempts).toBe(1);
    expect(retryable.status).toBe('PENDING');
    expect(retryable.lastError).toContain('[CPF_MASKED]');
    expect(retryable.lastError).toContain('[EMAIL_MASKED]');
    expect(retryable.lastError).not.toContain('123.456.789-09');
    expect(retryable.lastError).not.toContain('cliente@example.com');
    expect(retryable.lastError!.length).toBeLessThanOrEqual(1000);
    expect(retryable.nextAttemptAt.getTime()).toBe(now.getTime() + 60_000);

    await managementClient.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSING' },
    });

    await expect(service.markFailed(event.id, new Error('again'), { now, maxAttempts: 2 })).resolves.toBe(true);

    const failed = await managementClient.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(failed.attempts).toBe(2);
    expect(failed.status).toBe('FAILED');
    expect(failed.nextAttemptAt.getTime()).toBe(now.getTime() + 120_000);
  });

  it('rejects exact high-risk payload keys and accepts minimal ID/reference payloads', async () => {
    await expect(
      managementClient.$transaction((tx) =>
        service.enqueueInTransaction(tx, {
          workspaceId: wsAId,
          eventType: 'OCR_READY',
          payload: { rawText: 'CPF 123.456.789-09' },
        })
      )
    ).rejects.toThrow(/payload key is not allowed/i);

    await expect(enqueue({ transactionId: 'tx-safe', source: 'TRANSACTION_CREATED' })).resolves.toMatchObject({
      status: 'PENDING',
    });
  });

  it('does not block safe payload keys through generic substring matching', async () => {
    const event = await enqueue({
      eventName: 'TRANSACTION_CREATED',
      fileName: 'receipt-reference.txt',
      documentId: 'doc-123',
    });

    expect(event.payload).toEqual({
      eventName: 'TRANSACTION_CREATED',
      fileName: 'receipt-reference.txt',
      documentId: 'doc-123',
    });
  });

  it('masks textual payload values instead of storing direct CPF/email values', async () => {
    const event = await enqueue({
      externalReference: 'Pagamento CPF 123.456.789-09 cliente@example.com',
    });

    expect(JSON.stringify(event.payload)).toContain('[CPF_MASKED]');
    expect(JSON.stringify(event.payload)).toContain('[EMAIL_MASKED]');
    expect(JSON.stringify(event.payload)).not.toContain('123.456.789-09');
    expect(JSON.stringify(event.payload)).not.toContain('cliente@example.com');
  });

  it('enforces RLS so workspace B cannot read workspace A outbox events', async () => {
    const event = await enqueue({ transactionId: 'tenant-a' });

    await withTestWorkspace(String(wsBId), async () => {
      const leaked = await applicationClient.outboxEvent.findMany({ where: { id: event.id } });
      expect(leaked).toHaveLength(0);
    });

    await withTestWorkspace(String(wsAId), async () => {
      const visible = await applicationClient.outboxEvent.findMany({ where: { id: event.id } });
      expect(visible).toHaveLength(1);
    });
  });

  it('allows tenant-aware restricted enqueue only for the active workspace', async () => {
    await withEphemeralTransaction(async (tx) => {
      const event = await service.enqueueInTransaction(tx as Prisma.TransactionClient, {
        workspaceId: wsAId,
        eventType: 'TRANSACTION_CREATED',
        payload: { transactionId: 'tenant-aware-ok' },
      });

      const visible = await tx.outboxEvent.findMany({
        where: { id: event.id, workspaceId: wsAId },
      });

      expect(visible).toHaveLength(1);
      expect(visible[0].workspaceId).toBe(wsAId);
    }, String(wsAId));

    await expect(
      withEphemeralTransaction(async (tx) => {
        await service.enqueueInTransaction(tx as Prisma.TransactionClient, {
          workspaceId: wsBId,
          eventType: 'TRANSACTION_CREATED',
          payload: { transactionId: 'tenant-aware-blocked' },
        });
      }, String(wsAId))
    ).rejects.toThrow();

    const leaked = await managementClient.outboxEvent.findMany({
      where: {
        workspaceId: wsBId,
        payload: {
          path: ['transactionId'],
          equals: 'tenant-aware-blocked',
        },
      },
    });

    expect(leaked).toHaveLength(0);
  });
});
