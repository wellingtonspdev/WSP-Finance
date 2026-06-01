import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TelegramConfigPage } from '../../../../src/features/workspaces/routes/TelegramConfigPage';

vi.mock('../../../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

describe('TelegramConfigPage', () => {
  const renderComponent = () => render(
    <MemoryRouter>
      <TelegramConfigPage />
    </MemoryRouter>
  );

  it('renderiza pagina informativa de em breve', () => {
    renderComponent();

    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText(/Integração com Telegram em Breve/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gerar Codigo|Gerar Código/i })).not.toBeInTheDocument();
  });
});
