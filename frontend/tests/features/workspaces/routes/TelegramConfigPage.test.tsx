import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramConfigPage } from '../../../../src/features/workspaces/routes/TelegramConfigPage';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../../../src/features/workspaces/hooks/useTelegramConfig', () => ({
  useTelegramConfig: vi.fn(),
}));

// Ignore API requests for options
vi.mock('../../../../src/features/transactions/api/getAccounts', () => ({
  getAccounts: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../../src/features/transactions/api/getCategories', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
}));

import { useWorkspaceStore } from '../../../../src/shared/stores/useWorkspaceStore';
import { useTelegramConfig } from '../../../../src/features/workspaces/hooks/useTelegramConfig';

describe('TelegramConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <TelegramConfigPage />
      </MemoryRouter>
    );
  };

  it('renderiza cabecalho corretamente', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { role: 'OWNER', name: 'WSP Finance Demo' },
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      links: [],
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      loadLinks: vi.fn(),
      createLink: vi.fn(),
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('WSP Finance Demo')).toBeInTheDocument();
  });

  it('exibe form de geracao para OWNER/EDITOR', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { role: 'EDITOR' },
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      links: [],
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      loadLinks: vi.fn(),
      createLink: vi.fn(),
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText('Gerar Novo Link de Pareamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar Link/i })).toBeInTheDocument();
  });

  it('esconde form de geracao para VIEWER/ACCOUNTANT', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { role: 'VIEWER' },
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      links: [],
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      loadLinks: vi.fn(),
      createLink: vi.fn(),
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.queryByText('Gerar Novo Link de Pareamento')).not.toBeInTheDocument();
  });

  it('exibe mensagens de sucesso e erro', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { role: 'OWNER' },
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      links: [],
      generatedLink: null,
      isLoading: false,
      error: 'Falha de teste',
      successMsg: 'Sucesso de teste',
      loadLinks: vi.fn(),
      createLink: vi.fn(),
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText('Falha de teste')).toBeInTheDocument();
    expect(screen.getByText('Sucesso de teste')).toBeInTheDocument();
  });

  it('exibe vinculo ativo e bloqueia geracao extra', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { role: 'OWNER' },
    } as any);

    vi.mocked(useTelegramConfig).mockReturnValue({
      links: [
        {
          id: 'link123',
          telegramUsername: 'user1',
          status: 'ACTIVE',
          accountId: 1,
          defaultExpenseCategoryId: 2,
          defaultIncomeCategoryId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 1,
          workspaceId: 10,
          revokedAt: null
        }
      ],
      generatedLink: null,
      isLoading: false,
      error: null,
      successMsg: null,
      loadLinks: vi.fn(),
      createLink: vi.fn(),
      revokeLink: vi.fn(),
      clearMessages: vi.fn(),
      clearGeneratedLink: vi.fn(),
    } as any);

    renderComponent();

    expect(screen.getByText('Vínculo Ativo')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    // Botão revogar disponivel para OWNER
    expect(screen.getByText('Revogar Vínculo')).toBeInTheDocument();
  });
});
