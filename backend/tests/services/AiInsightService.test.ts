import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { AiInsightService } from '../../src/services/AiInsightService';
import { applicationClient, managementClient, withTestWorkspace } from '../../src/test/prisma-test-clients';
import { withEphemeralTransaction } from '../../src/test/transaction-proxy';

describe('AiInsightService', () => {
  const wsAId = 140801;
  const wsBId = 140802;
  const accountIdA = 140811;
  const accountIdB = 140812;
  const categoryId = 140821;
  let txIdA: string;
  let txIdB: string;
  let service: AiInsightService;

  const validInput = () => ({
    workspaceId: wsAId,
    transactionId: txIdA,
    severity: 'WARNING' as const,
    code: 'MISTURA_PATRIMONIAL' as const,
    message: 'Despesa pessoal detectada em conta PJ',
    reason: 'Pagamento de streaming em conta empresarial',
    confidence: 0.85,
  });

  beforeEach(async () => {
    service = new AiInsightService(managementClient);

    await managementClient.workspace.createMany({
      data: [
        { id: wsAId, name: 'S5-008 WS A' },
        { id: wsBId, name: 'S5-008 WS B' },
      ],
      skipDuplicates: true,
    });

    await managementClient.category.upsert({
      where: { id: categoryId },
      update: {},
      create: { id: categoryId, name: 'S5-008 Category' },
    });

    await managementClient.account.upsert({
      where: { id: accountIdA },
      update: {},
      create: { id: accountIdA, name: 'S5-008 Account A', workspaceId: wsAId, balance: new Prisma.Decimal('1000.0000') },
    });

    await managementClient.account.upsert({
      where: { id: accountIdB },
      update: {},
      create: { id: accountIdB, name: 'S5-008 Account B', workspaceId: wsBId, balance: new Prisma.Decimal('2000.0000') },
    });

    const txA = await managementClient.transaction.create({
      data: {
        description: 'S5-008 TX A',
        amount: new Prisma.Decimal('100.0000'),
        date: new Date('2026-05-01T12:00:00.000Z'),
        type: 'EXPENSE',
        accountId: accountIdA,
        categoryId,
        workspaceId: wsAId,
      },
    });
    txIdA = txA.id;

    const txB = await managementClient.transaction.create({
      data: {
        description: 'S5-008 TX B',
        amount: new Prisma.Decimal('200.0000'),
        date: new Date('2026-05-02T12:00:00.000Z'),
        type: 'INCOME',
        accountId: accountIdB,
        categoryId,
        workspaceId: wsBId,
      },
    });
    txIdB = txB.id;
  });

  afterEach(async () => {
    await managementClient.aiInsight.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });
    await managementClient.transaction.deleteMany({
      where: { workspaceId: { in: [wsAId, wsBId] } },
    });
    await managementClient.account.deleteMany({
      where: { id: { in: [accountIdA, accountIdB] } },
    });
    await managementClient.workspace.deleteMany({
      where: { id: { in: [wsAId, wsBId] } },
    });
    await managementClient.category.deleteMany({
      where: { id: categoryId },
    });
  });

  // ──────────────────────────────────────────────────────────
  // T1 — Cria insight válido para transação do mesmo workspace
  // ──────────────────────────────────────────────────────────
  it('T1 — creates a valid AiInsight for a transaction in the same workspace', async () => {
    const insight = await service.create(validInput());

    expect(insight.id).toBeDefined();
    expect(insight.workspaceId).toBe(wsAId);
    expect(insight.transactionId).toBe(txIdA);
    expect(insight.severity).toBe('WARNING');
    expect(insight.code).toBe('MISTURA_PATRIMONIAL');
    expect(insight.dismissed).toBe(false);
    expect(Number(insight.confidence)).toBeCloseTo(0.85);
    expect(insight.message).toBe('Despesa pessoal detectada em conta PJ');
    expect(insight.reason).toBe('Pagamento de streaming em conta empresarial');
    expect(insight.createdAt).toBeInstanceOf(Date);
    expect(insight.updatedAt).toBeInstanceOf(Date);
  });

  // ──────────────────────────────────────────────────────────
  // T2 — Rejeita criação para transação de outro workspace
  // ──────────────────────────────────────────────────────────
  it('T2 — rejects creating insight for a transaction belonging to another workspace', async () => {
    await expect(
      service.create({
        ...validInput(),
        workspaceId: wsAId,
        transactionId: txIdB, // belongs to wsB
      })
    ).rejects.toThrow(/not found|access denied|does not belong/i);

    const count = await managementClient.aiInsight.count({
      where: { workspaceId: wsAId },
    });
    expect(count).toBe(0);
  });

  // ──────────────────────────────────────────────────────────
  // T3 — Rejeita confidence < 0
  // ──────────────────────────────────────────────────────────
  it('T3 — rejects confidence below 0', async () => {
    await expect(
      service.create({ ...validInput(), confidence: -0.01 })
    ).rejects.toThrow(/confidence/i);
  });

  // ──────────────────────────────────────────────────────────
  // T4 — Rejeita confidence > 1
  // ──────────────────────────────────────────────────────────
  it('T4 — rejects confidence above 1', async () => {
    await expect(
      service.create({ ...validInput(), confidence: 1.01 })
    ).rejects.toThrow(/confidence/i);
  });

  // ──────────────────────────────────────────────────────────
  // T5 — Rejeita message vazia
  // ──────────────────────────────────────────────────────────
  it('T5 — rejects empty or whitespace-only message', async () => {
    await expect(
      service.create({ ...validInput(), message: '' })
    ).rejects.toThrow(/message/i);

    await expect(
      service.create({ ...validInput(), message: '   ' })
    ).rejects.toThrow(/message/i);
  });

  // ──────────────────────────────────────────────────────────
  // T6 — Rejeita reason vazia
  // ──────────────────────────────────────────────────────────
  it('T6 — rejects empty or whitespace-only reason', async () => {
    await expect(
      service.create({ ...validInput(), reason: '' })
    ).rejects.toThrow(/reason/i);

    await expect(
      service.create({ ...validInput(), reason: '   ' })
    ).rejects.toThrow(/reason/i);
  });

  // ──────────────────────────────────────────────────────────
  // T7 — Lista insights por transação filtrando por workspace
  // ──────────────────────────────────────────────────────────
  it('T7 — lists insights by transaction scoped to workspace', async () => {
    await service.create(validInput());

    // Create a second insight for a different code on same transaction
    await service.create({
      ...validInput(),
      code: 'RISCO_MALHA_FINA',
      message: 'Risco de malha fina',
      reason: 'Declaração inconsistente',
    });

    const results = await service.listByTransaction(wsAId, txIdA);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.workspaceId === wsAId)).toBe(true);
    expect(results.every((r) => r.transactionId === txIdA)).toBe(true);

    // Different workspace sees nothing
    const crossTenantResults = await service.listByTransaction(wsBId, txIdA);
    expect(crossTenantResults).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────
  // T8 — Lista insights por workspace sem vazar outro tenant
  // ──────────────────────────────────────────────────────────
  it('T8 — lists insights by workspace without leaking cross-tenant', async () => {
    await service.create(validInput());

    // Create insight for workspace B
    await service.create({
      workspaceId: wsBId,
      transactionId: txIdB,
      severity: 'INFO',
      code: 'DESPESA_PESSOAL_POTENCIAL',
      message: 'Possível despesa pessoal',
      reason: 'Categoria fora do padrão',
      confidence: 0.6,
    });

    const wsAInsights = await service.listByWorkspace(wsAId);
    expect(wsAInsights).toHaveLength(1);
    expect(wsAInsights[0].workspaceId).toBe(wsAId);

    const wsBInsights = await service.listByWorkspace(wsBId);
    expect(wsBInsights).toHaveLength(1);
    expect(wsBInsights[0].workspaceId).toBe(wsBId);
  });

  // ──────────────────────────────────────────────────────────
  // T9 — Marca insight como dismissed=true
  // ──────────────────────────────────────────────────────────
  it('T9 — marks insight as dismissed', async () => {
    const insight = await service.create(validInput());
    expect(insight.dismissed).toBe(false);

    const dismissed = await service.dismiss(wsAId, insight.id);
    expect(dismissed.dismissed).toBe(true);
    expect(dismissed.id).toBe(insight.id);
    expect(dismissed.severity).toBe(insight.severity);
    expect(dismissed.code).toBe(insight.code);
  });

  // ──────────────────────────────────────────────────────────
  // T10 — Dismiss cross-tenant não altera registro de outro workspace
  // ──────────────────────────────────────────────────────────
  it('T10 — cross-tenant dismiss does not affect other workspace insight', async () => {
    // Create insight in workspace B
    const insightB = await service.create({
      workspaceId: wsBId,
      transactionId: txIdB,
      severity: 'CRITICAL',
      code: 'MISTURA_PATRIMONIAL',
      message: 'Alerta mistura',
      reason: 'Conta PJ com despesa pessoal',
      confidence: 0.95,
    });

    // Attempt dismiss from workspace A
    await expect(
      service.dismiss(wsAId, insightB.id)
    ).rejects.toThrow();

    // Verify insight B is still not dismissed
    const untouched = await managementClient.aiInsight.findUnique({
      where: { id: insightB.id },
    });
    expect(untouched?.dismissed).toBe(false);
  });

  // ──────────────────────────────────────────────────────────
  // T11 — Deleção de Transaction remove AiInsights por cascade
  // ──────────────────────────────────────────────────────────
  it('T11 — deleting a Transaction cascades and removes linked AiInsights', async () => {
    await service.create(validInput());

    const beforeCount = await managementClient.aiInsight.count({
      where: { transactionId: txIdA, workspaceId: wsAId },
    });
    expect(beforeCount).toBe(1);

    // Delete the transaction via managementClient (physical delete)
    await managementClient.transaction.delete({ where: { id: txIdA } });

    const afterCount = await managementClient.aiInsight.count({
      where: { transactionId: txIdA, workspaceId: wsAId },
    });
    expect(afterCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────
  // T12 — Criar/listar/dismiss não altera ledger
  // ──────────────────────────────────────────────────────────
  it('T12 — create/list/dismiss operations do not alter the ledger', async () => {
    // Snapshot before
    const txBefore = await managementClient.transaction.findUniqueOrThrow({ where: { id: txIdA } });
    const accountBefore = await managementClient.account.findUniqueOrThrow({ where: { id: accountIdA } });

    // create
    const insight = await service.create(validInput());
    // listByTransaction
    await service.listByTransaction(wsAId, txIdA);
    // listByWorkspace
    await service.listByWorkspace(wsAId);
    // dismiss
    await service.dismiss(wsAId, insight.id);

    // Snapshot after
    const txAfter = await managementClient.transaction.findUniqueOrThrow({ where: { id: txIdA } });
    const accountAfter = await managementClient.account.findUniqueOrThrow({ where: { id: accountIdA } });

    // Transaction ledger fields unchanged
    expect(txAfter.amount.equals(txBefore.amount)).toBe(true);
    expect(txAfter.date.getTime()).toBe(txBefore.date.getTime());
    expect(txAfter.categoryId).toBe(txBefore.categoryId);
    expect(txAfter.status).toBe(txBefore.status);

    // Account balance unchanged
    expect(accountAfter.balance.equals(accountBefore.balance)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────
  // T13 — Idempotência por workspaceId + transactionId + code
  // ──────────────────────────────────────────────────────────
  it('T13 — upsert is idempotent by workspaceId+transactionId+code and preserves dismissed', async () => {
    // First create
    const first = await service.create(validInput());
    expect(first.dismissed).toBe(false);

    // Second create with updated fields
    const second = await service.create({
      ...validInput(),
      severity: 'CRITICAL',
      message: 'Mensagem atualizada',
      reason: 'Razão atualizada',
      confidence: 0.99,
    });

    // Same record
    expect(second.id).toBe(first.id);
    expect(second.severity).toBe('CRITICAL');
    expect(second.message).toBe('Mensagem atualizada');
    expect(second.reason).toBe('Razão atualizada');
    expect(Number(second.confidence)).toBeCloseTo(0.99);
    expect(second.dismissed).toBe(false);

    // Only one record exists
    const count = await managementClient.aiInsight.count({
      where: { workspaceId: wsAId, transactionId: txIdA, code: 'MISTURA_PATRIMONIAL' },
    });
    expect(count).toBe(1);

    // Now dismiss and re-create — dismissed must be preserved
    await service.dismiss(wsAId, first.id);

    const afterDismiss = await service.create({
      ...validInput(),
      severity: 'INFO',
      message: 'Terceira mensagem',
      reason: 'Terceira razão',
      confidence: 0.5,
    });

    expect(afterDismiss.id).toBe(first.id);
    expect(afterDismiss.dismissed).toBe(true); // preserved
    expect(afterDismiss.severity).toBe('INFO');
    expect(afterDismiss.message).toBe('Terceira mensagem');
  });

  // ──────────────────────────────────────────────────────────
  // T14 — Masking defensivo de PII
  // ──────────────────────────────────────────────────────────
  it('T14 — masks PII in message and reason before persisting', async () => {
    const insight = await service.create({
      ...validInput(),
      message: 'Pagamento para CPF 123.456.789-09 via PIX',
      reason: 'Conta de cliente@example.com contém irregularidade',
    });

    // CPF masked
    expect(insight.message).not.toContain('123.456.789-09');
    expect(insight.message).toContain('[CPF_MASKED]');

    // Email masked
    expect(insight.reason).not.toContain('cliente@example.com');
    expect(insight.reason).toContain('[EMAIL_MASKED]');
  });

  // ──────────────────────────────────────────────────────────
  // RLS — Insert/leitura com client restrito
  // ──────────────────────────────────────────────────────────
  it('RLS — restricted client can read insights of its own workspace only', async () => {
    await service.create(validInput());

    // Workspace A can see its own insights
    await withTestWorkspace(String(wsAId), async () => {
      const visible = await applicationClient.aiInsight.findMany({
        where: { workspaceId: wsAId },
      });
      expect(visible).toHaveLength(1);
      expect(visible[0].workspaceId).toBe(wsAId);
    });

    // Workspace B cannot see workspace A insights
    await withTestWorkspace(String(wsBId), async () => {
      const leaked = await applicationClient.aiInsight.findMany({
        where: { workspaceId: wsAId },
      });
      expect(leaked).toHaveLength(0);
    });
  });

  it('RLS — restricted client WITH CHECK blocks cross-tenant insert', async () => {
    await expect(
      withEphemeralTransaction(async (tx) => {
        await tx.aiInsight.create({
          data: {
            workspaceId: wsBId, // different from RLS context
            transactionId: txIdB,
            severity: 'INFO',
            code: 'MISTURA_PATRIMONIAL',
            message: 'Tentativa cross-tenant',
            reason: 'Should be blocked',
            confidence: new Prisma.Decimal('0.5'),
          },
        });
      }, String(wsAId))
    ).rejects.toThrow();

    const leaked = await managementClient.aiInsight.findMany({
      where: { workspaceId: wsBId },
    });
    expect(leaked).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────
  // listByWorkspace with dismissed filter
  // ──────────────────────────────────────────────────────────
  it('listByWorkspace filters by dismissed status when provided', async () => {
    const insight1 = await service.create(validInput());
    await service.create({
      ...validInput(),
      code: 'RISCO_MALHA_FINA',
      message: 'Risco malha',
      reason: 'Razão malha',
    });

    await service.dismiss(wsAId, insight1.id);

    const activeOnly = await service.listByWorkspace(wsAId, { dismissed: false });
    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0].code).toBe('RISCO_MALHA_FINA');

    const dismissedOnly = await service.listByWorkspace(wsAId, { dismissed: true });
    expect(dismissedOnly).toHaveLength(1);
    expect(dismissedOnly[0].code).toBe('MISTURA_PATRIMONIAL');

    const all = await service.listByWorkspace(wsAId);
    expect(all).toHaveLength(2);
  });
});
