// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '../../src/shared/components/layout/AppLayout';
import { UIProvider } from '../../src/shared/context/UIProvider';

// Mocks
vi.mock('../../src/shared/lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'acc-1', name: 'Accountant User', type: 'ACCOUNTANT' },
    logout: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/features/workspaces/context/useWorkspace', () => ({
  useWorkspace: () => ({ workspaces: [], activeWorkspace: null }),
}));

vi.mock('../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeMembership: null
  })),
}));

// Mock the nested components that are part of the page content to simplify testing
const DummyPage = ({ title }: { title: string }) => <div>{title} Page Content</div>;

const renderWithProviders = (initialRoute: string) => {
  return render(
    <UIProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/accountant/hub" element={<AppLayout><DummyPage title="Hub" /></AppLayout>} />
          <Route path="/accountant/invites" element={<AppLayout><DummyPage title="Invites" /></AppLayout>} />
          <Route path="/accountant/inbox" element={<AppLayout><DummyPage title="Inbox" /></AppLayout>} />
          <Route path="/accountant/inbox/:workspaceId" element={<AppLayout><DummyPage title="Inbox Details" /></AppLayout>} />
          {/* Simulate workspace routes accessed by accountant */}
          <Route path="/:workspaceId/dashboard" element={<AppLayout><DummyPage title="Workspace Dashboard" /></AppLayout>} />
          <Route path="/:workspaceId/documents" element={<AppLayout><DummyPage title="Workspace Documents" /></AppLayout>} />
        </Routes>
      </MemoryRouter>
    </UIProvider>
  );
};

beforeEach(() => {
  localStorage.removeItem('wsp_accountant_sidebar_collapsed');
});

describe('Accountant Layout Shell (AppLayout + AccountantSidebar)', () => {
  describe('Sidebar Rendering & Content', () => {
    it('should render AccountantSidebar on /accountant/hub', () => {
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Menu do Contador')).toBeInTheDocument();
      expect(screen.getByText('Hub Page Content')).toBeInTheDocument();
    });

    it('should display correct links in AccountantSidebar', () => {
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');
      expect(within(sidebar as HTMLElement).getByText('Torre de Controle')).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Convites')).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Inbox de Aprovação')).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Documentos')).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Relatórios')).toBeInTheDocument();
      expect(within(sidebar as HTMLElement).getByText('Configurações')).toBeInTheDocument();
    });
  });

  describe('Active Item Logic', () => {
    it('should show Torre de Controle as active on /accountant/hub', () => {
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');
      const hubBtn = within(sidebar as HTMLElement).getByText('Torre de Controle').closest('button');
      expect(hubBtn).toHaveClass('text-[#1978e5]');
    });

    it('should show Convites as active on /accountant/invites', () => {
      const { container } = renderWithProviders('/accountant/invites');
      const sidebar = container.querySelector('aside');
      const invitesBtn = within(sidebar as HTMLElement).getByText('Convites').closest('button');
      expect(invitesBtn).toHaveClass('text-[#1978e5]');
    });

    it('should show Inbox de Aprovação as active on /accountant/inbox', () => {
      const { container } = renderWithProviders('/accountant/inbox');
      const sidebar = container.querySelector('aside');
      const inboxBtn = within(sidebar as HTMLElement).getByText('Inbox de Aprovação').closest('button');
      expect(inboxBtn).toHaveClass('text-[#1978e5]');
    });

    it('should show Inbox de Aprovação as active on /accountant/inbox/:workspaceId', () => {
      const { container } = renderWithProviders('/accountant/inbox/wks-123');
      const sidebar = container.querySelector('aside');
      const inboxBtn = within(sidebar as HTMLElement).getByText('Inbox de Aprovação').closest('button');
      expect(inboxBtn).toHaveClass('text-[#1978e5]');
    });

    it('should not mark any item as active falsely on /:workspaceId/dashboard', () => {
      const { container } = renderWithProviders('/wks-123/dashboard');
      const sidebar = container.querySelector('aside');
      const hubBtn = within(sidebar as HTMLElement).getByText('Torre de Controle').closest('button');
      const inboxBtn = within(sidebar as HTMLElement).getByText('Inbox de Aprovação').closest('button');

      expect(hubBtn).not.toHaveClass('text-[#1978e5]');
      expect(inboxBtn).not.toHaveClass('text-[#1978e5]');
    });

    it('should not mark any item as active falsely on /:workspaceId/documents', () => {
      const { container } = renderWithProviders('/wks-123/documents');
      const sidebar = container.querySelector('aside');
      const docsBtn = within(sidebar as HTMLElement).getByText('Documentos').closest('button');
      expect(docsBtn).not.toHaveClass('text-[#1978e5]');
    });
  });

  describe('Sidebar Collapse Behavior', () => {
    it('should have a toggle button with aria-label and aria-expanded="true" by default', () => {
      renderWithProviders('/accountant/hub');
      const toggleBtn = screen.getByLabelText('Recolher menu lateral do contador');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    });

    it('should collapse and expand the sidebar when toggle button is clicked', () => {
      renderWithProviders('/accountant/hub');
      const collapseBtn = screen.getByLabelText('Recolher menu lateral do contador');

      fireEvent.click(collapseBtn);

      const expandBtn = screen.getByLabelText('Expandir menu lateral do contador');
      expect(expandBtn).toBeInTheDocument();
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

      expect(screen.getByText('Hub Page Content')).toBeInTheDocument();

      fireEvent.click(expandBtn);
      expect(screen.getByLabelText('Recolher menu lateral do contador')).toBeInTheDocument();
    });

    it('keeps the mobile drawer full width when the desktop sidebar is collapsed', () => {
      localStorage.setItem('wsp_accountant_sidebar_collapsed', 'true');
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');

      expect(sidebar).toHaveClass('w-72');
      expect(sidebar).toHaveClass('lg:w-20');
      expect(sidebar).not.toHaveClass('w-20');
    });
  });

  describe('Security & Links', () => {
    it('should not contain links to PERSONAL workspace', () => {
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');
      const buttons = within(sidebar as HTMLElement).getAllByRole('button');
      const personalLinks = buttons.filter(b => b.textContent?.toLowerCase().includes('personal'));
      expect(personalLinks).toHaveLength(0);
    });

    it('disabled links should not be clickable', () => {
      const { container } = renderWithProviders('/accountant/hub');
      const sidebar = container.querySelector('aside');
      const docsBtn = within(sidebar as HTMLElement).getByText('Documentos').closest('button');
      expect(docsBtn).toBeDisabled();
    });
  });
});
