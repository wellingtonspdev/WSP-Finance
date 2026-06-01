import { describe, expect, it } from 'vitest';
import { buildBridgePayload, buildTransactionPayload } from '../../../src/features/transactions/buildTransactionPayload';
import type { CreateTransactionDTO } from '../../../src/features/transactions/types';

describe('buildTransactionPayload', () => {
  const baseTransaction: CreateTransactionDTO = {
    description: 'Recebimento de cliente',
    amount: 250,
    date: '2026-05-31',
    type: 'INCOME',
    categoryId: 1,
    isPaid: true,
  };

  it('nao envia accountId em transacao comum', () => {
    const payload = buildTransactionPayload({
      ...baseTransaction,
      accountId: 99,
    } as CreateTransactionDTO & { accountId: number });

    expect(payload).not.toHaveProperty('accountId');
    expect(payload).toMatchObject({
      description: 'Recebimento de cliente',
      amount: 250,
      type: 'INCOME',
      categoryId: 1,
      isPaid: true,
    });
  });

  it('preserva campos marketplace sem incluir conta', () => {
    const payload = buildTransactionPayload({
      ...baseTransaction,
      grossAmount: 1000,
      marketplaceFee: 80,
      shippingCost: 20,
      productCost: 300,
      accountId: 99,
    } as CreateTransactionDTO & { accountId: number });

    expect(payload).toMatchObject({
      grossAmount: 1000,
      marketplaceFee: 80,
      shippingCost: 20,
      productCost: 300,
    });
    expect(payload).not.toHaveProperty('accountId');
  });

  it('monta bridge somente com workspaces, valor, descricao e data', () => {
    const payload = buildBridgePayload({
      description: 'Pro-labore',
      amount: 50,
      date: '2026-05-31',
      type: 'BRIDGE',
      isPaid: true,
      toWorkspaceId: 2,
      accountId: 10,
      toAccountId: 11,
    } as CreateTransactionDTO & { accountId: number; toAccountId: number }, 1);

    expect(payload).toEqual({
      fromWorkspaceId: 1,
      toWorkspaceId: 2,
      amount: 50,
      description: 'Pro-labore',
      date: '2026-05-31T00:00:00.000Z',
    });
    expect(payload).not.toHaveProperty('fromAccountId');
    expect(payload).not.toHaveProperty('toAccountId');
  });
});
