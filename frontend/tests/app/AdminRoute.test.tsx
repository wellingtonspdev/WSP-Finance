// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../src/app/AuthProvider';
import { AdminRoute } from '../../src/shared/components/guards/AdminRoute';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function ChildComponent() {
  return <div data-testid="child-content">Admin Content</div>;
}

// Mock do hook useAuth para testar os cenarios
const mockUseAuth = vi.fn();

vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithAuth = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <ChildComponent />
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminRoute', () => {
  it('T1: Dado user com systemRole === "ADMIN", quando renderiza AdminRoute, entao conteudo filho aparece', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        type: 'ADMIN',
        systemRole: 'ADMIN',
      },
      isLoading: false,
    });

    renderWithAuth(['/admin']);

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('T2: Dado user ADMIN sem memberships/workspace, quando renderiza AdminRoute, entao conteudo filho aparece', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        type: 'ADMIN',
        systemRole: 'ADMIN',
      },
      isLoading: false,
    });

    renderWithAuth(['/admin']);

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('T3: Dado user com systemRole === "USER" (CLIENT), quando renderiza AdminRoute, entao redireciona explicitamente para /', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 2,
        email: 'client@example.com',
        name: 'Client',
        type: 'CLIENT',
        systemRole: 'USER',
      },
      isLoading: false,
    });

    renderWithAuth(['/admin']);

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-display').textContent).toBe('/');
  });

  it('T4: Dado user com systemRole === "USER" (ACCOUNTANT), quando renderiza AdminRoute, entao redireciona explicitamente para /', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 3,
        email: 'acc@example.com',
        name: 'Accountant',
        type: 'ACCOUNTANT',
        systemRole: 'USER',
      },
      isLoading: false,
    });

    renderWithAuth(['/admin']);

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-display').textContent).toBe('/');
  });

  it('T5: Dado user nao autenticado, quando renderiza AdminRoute, entao redireciona para /login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderWithAuth(['/admin']);

    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-display').textContent).toBe('/login');
  });
});
