import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecurringProLaborePage } from '../../../src/features/recurring-pro-labore/routes/RecurringProLaborePage';

vi.mock('../../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../../src/features/recurring-pro-labore/hooks/useRecurringProLabore', () => ({
  useRecurringProLabore: vi.fn(),
}));

import { useWorkspaceStore } from '../../../src/shared/stores/useWorkspaceStore';
import { useRecurringProLabore } from '../../../src/features/recurring-pro-labore/hooks/useRecurringProLabore';

describe('RecurringProLaborePage', () => {
  const createMutateAsync = vi.fn();
  const deactivateMutate = vi.fn();
  const confirmMutate = vi.fn();
  const cancelMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeMembership: { id: 10, name: 'Empresa WSP', type: 'BUSINESS', role: 'OWNER' },
      memberships: [
        { id: 10, name: 'Empresa WSP', type: 'BUSINESS', role: 'OWNER' },
        { id: 20, name: 'Wellington Pessoal', type: 'PERSONAL', role: 'OWNER' },
      ],
    } as any);

    vi.mocked(useRecurringProLabore).mockReturnValue({
      schedules: {
        isLoading: false,
        data: [
          {
            id: 'schedule-1',
            sourceWorkspaceId: 10,
            destinationWorkspaceId: 20,
            amount: '1500.0000',
            dayOfMonth: 5,
            description: 'Pro-labore mensal',
            isActive: true,
            sourceWorkspace: { id: 10, name: 'Empresa WSP', type: 'BUSINESS' },
            destinationWorkspace: { id: 20, name: 'Wellington Pessoal', type: 'PERSONAL' },
          },
          {
            id: 'schedule-2',
            sourceWorkspaceId: 10,
            destinationWorkspaceId: 20,
            amount: '1000.0000',
            dayOfMonth: 10,
            description: 'Pro-labore antigo',
            isActive: false,
          },
        ],
      },
      pendings: {
        isLoading: false,
        data: [
          {
            id: 'pending-1',
            scheduleId: 'schedule-1',
            competence: '2026-05-01T00:00:00.000Z',
            status: 'PENDING',
            lastError: null,
            schedule: {
              id: 'schedule-1',
              sourceWorkspaceId: 10,
              destinationWorkspaceId: 20,
              amount: '1500.0000',
              dayOfMonth: 5,
              description: 'Pro-labore mensal',
              isActive: true,
            },
          },
        ],
      },
      createSchedule: { mutateAsync: createMutateAsync, isPending: false, error: null },
      deactivateSchedule: { mutate: deactivateMutate, isPending: false, error: null },
      confirmPending: { mutate: confirmMutate, isPending: false, error: null },
      cancelPending: { mutate: cancelMutate, isPending: false, error: null },
    } as any);
  });

  const renderPage = () => render(
    <MemoryRouter>
      <RecurringProLaborePage />
    </MemoryRouter>
  );

  it('usuario cria agendamento mensal sem seletor de conta ou impostos', async () => {
    createMutateAsync.mockResolvedValue({ id: 'schedule-new' });
    renderPage();

    fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText(/Dia/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/Descricao/i), { target: { value: 'Retirada mensal' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar agendamento/i }));

    expect(await screen.findByText('Agendamento criado.')).toBeInTheDocument();
    expect(createMutateAsync).toHaveBeenCalledWith({
      sourceWorkspaceId: 10,
      destinationWorkspaceId: 20,
      amount: 2500,
      dayOfMonth: 28,
      description: 'Retirada mensal',
    });
    expect(screen.queryByText(/Conta bancaria|Conta bancária|Imposto/i)).not.toBeInTheDocument();
  });

  it('usuario ve pendencias e confirma manualmente', () => {
    renderPage();

    expect(screen.getByText('Pendencias')).toBeInTheDocument();
    expect(screen.getByText('Competencia maio de 2026 - R$ 1.500,00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    expect(confirmMutate).toHaveBeenCalledWith('pending-1');
  });

  it('erro de saldo insuficiente aparece claramente', () => {
    vi.mocked(useRecurringProLabore).mockReturnValueOnce({
      schedules: { isLoading: false, data: [] },
      pendings: { isLoading: false, data: [] },
      createSchedule: { mutateAsync: createMutateAsync, isPending: false, error: null },
      deactivateSchedule: { mutate: deactivateMutate, isPending: false, error: null },
      confirmPending: {
        mutate: confirmMutate,
        isPending: false,
        error: { response: { data: { message: 'Saldo insuficiente na conta de origem.' } } },
      },
      cancelPending: { mutate: cancelMutate, isPending: false, error: null },
    } as any);

    renderPage();

    expect(screen.getByText('Saldo insuficiente na conta de origem.')).toBeInTheDocument();
  });

  it('agendamento desativado nao aparece como ativo', () => {
    renderPage();

    expect(screen.getByText('Pro-labore antigo')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });
});
