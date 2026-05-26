import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionDetailModal } from '../../../../src/features/ai-insights/components/TransactionDetailModal';
import { useTransaction } from '../../../../src/features/transactions/hooks/useTransaction';
import React from 'react';

const accordionMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/features/transactions/hooks/useTransaction', () => ({
  useTransaction: vi.fn(),
}));

vi.mock('../../../../src/features/transactions/components/TransactionAccordionItem', () => ({
  TransactionAccordionItem: (props: any) => {
    accordionMock(props);
    return (
      <div data-testid="transaction-item">
        <span>{props.transaction.description}</span>
        {props.onEdit && <button>Editar</button>}
        {props.onDelete && <button>Excluir</button>}
        {props.onDismissInsight && <button>Ignorar alerta</button>}
      </div>
    );
  },
}));

describe('TransactionDetailModal', () => {
  const onClose = vi.fn();
  const transaction = {
    id: '123',
    description: 'Test Tx',
    amount: 100,
    date: '2026-05-01T10:00:00.000Z',
    type: 'EXPENSE',
    isPaid: true,
    accountId: 1,
    categoryId: 2,
    category: { name: 'Categoria' },
    account: { name: 'Conta' },
    aiInsights: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    accordionMock.mockClear();
    vi.mocked(useTransaction).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as any);
  });

  it('T01 - renders nothing if isOpen is false', () => {
    const { container } = render(
      <TransactionDetailModal isOpen={false} transactionId="123" onClose={onClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('T02 - renders loading state', () => {
    vi.mocked(useTransaction).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<TransactionDetailModal isOpen={true} transactionId="123" onClose={onClose} />);

    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('T03 - renders safe error state', () => {
    vi.mocked(useTransaction).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<TransactionDetailModal isOpen={true} transactionId="123" onClose={onClose} />);

    expect(screen.getByText(/Erro ao carregar/i)).toBeInTheDocument();
  });

  it('T04 - renders transaction item on success and closes on click', () => {
    vi.mocked(useTransaction).mockReturnValue({
      data: transaction,
      isLoading: false,
      isError: false,
    } as any);

    render(<TransactionDetailModal isOpen={true} transactionId="123" onClose={onClose} />);

    expect(screen.getByTestId('transaction-item')).toBeInTheDocument();
    expect(screen.getByText('Test Tx')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('T05 - passes safe props and no privileged actions to the accordion', () => {
    vi.mocked(useTransaction).mockReturnValue({
      data: transaction,
      isLoading: false,
      isError: false,
    } as any);

    render(<TransactionDetailModal isOpen={true} transactionId="123" onClose={onClose} />);

    expect(accordionMock).toHaveBeenCalledWith(expect.objectContaining({
      transaction,
      defaultExpanded: true,
    }));
    const props = accordionMock.mock.calls[0][0];
    expect(props.onEdit).toBeUndefined();
    expect(props.onDelete).toBeUndefined();
    expect(props.onDismissInsight).toBeUndefined();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
    expect(screen.queryByText('Ignorar alerta')).not.toBeInTheDocument();
  });
});
