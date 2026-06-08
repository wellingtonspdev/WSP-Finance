import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type React from 'react';
import { TransactionModal } from '../../../src/features/transactions/components/TransactionModal';

const transactionMutationMocks = vi.hoisted(() => ({
  submitTransaction: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../../../src/features/transactions/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    data: [{ id: 1, name: 'Vendas' }],
    isLoading: false,
  })),
}));

vi.mock('../../../src/features/workspaces/context/useWorkspace', () => ({
  useWorkspace: vi.fn(() => ({
    activeWorkspace: { id: 1, name: 'Empresa', type: 'BUSINESS' },
    workspaces: [
      { id: 1, name: 'Empresa', type: 'BUSINESS' },
      { id: 2, name: 'Pessoal', type: 'PERSONAL' },
    ],
  })),
}));

vi.mock('../../../src/features/transactions/hooks/useTransactionMutation', () => ({
  useTransactionMutation: vi.fn(() => ({
    submitTransaction: transactionMutationMocks.submitTransaction,
    isProcessing: false,
    isUploading: false,
    uploadProgress: 0,
    abortUpload: vi.fn(),
  })),
}));

vi.mock('../../../src/shared/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ error: vi.fn(), success: vi.fn() })),
}));

describe('TransactionModal simplificado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMutationMocks.submitTransaction.mockResolvedValue(undefined);
  });

  it('renderiza transacao comum sem seletor de conta', () => {
    render(<TransactionModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Categoria')).toBeInTheDocument();
    expect(screen.queryByText(/Conta Bancária/i)).not.toBeInTheDocument();
  });

  it('renderiza bridge manual sem seletores de conta origem ou destino', () => {
    render(<TransactionModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Saque\s*Pró-labore/i }));

    expect(screen.getByText('Workspace de Destino')).toBeInTheDocument();
    expect(screen.queryByText(/Conta de Origem/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conta que vai Receber/i)).not.toBeInTheDocument();
  });

  it('envia transacao comum como paga por padrao para atualizar saldo', async () => {
    const { container } = render(<TransactionModal isOpen onClose={vi.fn()} />);

    fireEvent.change(container.querySelector('input[name="description"]') as HTMLInputElement, { target: { value: 'Venda teste' } });
    fireEvent.change(container.querySelector('input[name="date"]') as HTMLInputElement, { target: { value: '2026-06-02' } });
    fireEvent.change(screen.getByPlaceholderText('R$ 0,00'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /Selecione/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Vendas' }));
    fireEvent.click(screen.getByRole('button', { name: /Registrar Transa/i }));

    await waitFor(() => {
      expect(transactionMutationMocks.submitTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ isPaid: true }),
        'INCOME_SIMPLE'
      );
    });
  });
});
