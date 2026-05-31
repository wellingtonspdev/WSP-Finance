import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TelegramConfigPage } from '../../../../src/features/workspaces/routes/TelegramConfigPage';

vi.mock('../../../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../../../src/features/workspaces/hooks/useTelegramConfig', () => ({
  useTelegramConfig: vi.fn(),
}));

import { useWorkspaceStore } from '../../../../src/shared/stores/useWorkspaceStore';
import { useTelegramConfig } from '../../../../src/features/workspaces/hooks/useTelegramConfig';

describe('TelegramConfigPage', () => {
  const createLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { id: 10, name: 'Empresa WSP', type: 'BUSINESS', role: 'OWNER' },
      memberships: [
        { id: 10, name: 'Empresa WSP', type: 'BUSINESS', role: 'OWNER' },
        { id: 11, name: 'Joao', type: 'PERSONAL', role: 'OWNER' },
      ],
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      link: null,
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      setSuccessMsg: vi.fn(),
      loadStatus: vi.fn(),
      createLink,
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <TelegramConfigPage />
    </MemoryRouter>
  );

  it('renderiza configuracao de Telegram com workspace destino e sem seletor de conta bancaria', () => {
    renderComponent();

    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar Codigo|Gerar Código/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Workspace de destino/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Empresa - Empresa WSP' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pessoal - Joao' })).toBeInTheDocument();
    expect(screen.queryByText(/Conta Bancaria|Conta Bancária/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/workspace, conta e categoria/i)).not.toBeInTheDocument();
    expect(screen.getByText(/workspace e pela categoria/i)).toBeInTheDocument();
  });

  it('gera codigo enviando workspace de destino sem accountId', () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Gerar Codigo|Gerar Código/i }));

    expect(createLink).toHaveBeenCalledWith({ defaultWorkspaceId: 10 });
    expect(createLink.mock.calls[0][0]).not.toHaveProperty('accountId');
    expect(createLink.mock.calls[0][0]).not.toHaveProperty('defaultAccountId');
  });

  it('permite trocar o workspace de destino antes de gerar codigo', () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Workspace de destino/i), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Codigo|Gerar Código/i }));

    expect(createLink).toHaveBeenCalledWith({ defaultWorkspaceId: 11 });
  });

  it('mostra vinculo ativo como conta Telegram, sem expor conta bancaria', () => {
    vi.mocked(useTelegramConfig).mockReturnValue({
      link: {
        id: 'link123',
        telegramUsername: 'user1',
        status: 'ACTIVE',
        accountId: 1,
        defaultExpenseCategoryId: 2,
        defaultIncomeCategoryId: null,
        createdAt: '2026-05-31T00:00:00.000Z',
        updatedAt: '2026-05-31T00:00:00.000Z',
        userId: 1,
        workspaceId: 10,
        revokedAt: null,
      },
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      setSuccessMsg: vi.fn(),
      loadStatus: vi.fn(),
      createLink,
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText('Conta Associada')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.queryByText(/Conta Bancaria|Conta Bancária/i)).not.toBeInTheDocument();
  });
});
