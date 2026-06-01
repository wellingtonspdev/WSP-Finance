import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, PauseCircle, RefreshCw, WalletCards, XCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { useRecurringProLabore } from '../hooks/useRecurringProLabore';
import type { RecurringProLaborePending, RecurringProLaboreSchedule } from '../api/recurringProLabore';

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function getErrorMessage(error: unknown) {
  const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeAxios.response?.data?.message || maybeAxios.message || 'Nao foi possivel concluir a operacao.';
}

function formatCompetence(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}

function ScheduleRow({
  schedule,
  onDeactivate,
  isPending,
}: {
  schedule: RecurringProLaboreSchedule;
  onDeactivate: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{schedule.description}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${schedule.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/10 text-slate-300'}`}>
              {schedule.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {schedule.sourceWorkspace?.name || `Workspace ${schedule.sourceWorkspaceId}`} para {schedule.destinationWorkspace?.name || `Workspace ${schedule.destinationWorkspaceId}`}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {formatCurrency(schedule.amount)} todo dia {schedule.dayOfMonth}
          </p>
        </div>
        {schedule.isActive && (
          <button
            type="button"
            onClick={() => onDeactivate(schedule.id)}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
          >
            <PauseCircle className="h-4 w-4" />
            Desativar
          </button>
        )}
      </div>
    </article>
  );
}

function PendingRow({
  pending,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  pending: RecurringProLaborePending;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  isConfirming: boolean;
  isCancelling: boolean;
}) {
  const isOpen = pending.status === 'PENDING';

  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{pending.schedule.description}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${isOpen ? 'bg-blue-500/10 text-blue-300' : pending.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/10 text-slate-300'}`}>
              {isOpen ? 'Pendente' : pending.status === 'COMPLETED' ? 'Concluida' : 'Cancelada'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Competencia {formatCompetence(pending.competence)} - {formatCurrency(pending.schedule.amount)}
          </p>
          {pending.lastError && (
            <p className="mt-2 flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4" />
              {pending.lastError}
            </p>
          )}
        </div>
        {isOpen && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onConfirm(pending.id)}
              disabled={isConfirming}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => onCancel(pending.id)}
              disabled={isCancelling}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function RecurringProLaborePage() {
  const { activeMembership, memberships } = useWorkspaceStore();
  const workspaceId = activeMembership?.id;
  const { schedules, pendings, createSchedule, deactivateSchedule, confirmPending, cancelPending } = useRecurringProLabore(workspaceId);

  const businessWorkspaces = useMemo(() => memberships.filter((workspace) => workspace.type === 'BUSINESS' && workspace.role === 'OWNER'), [memberships]);
  const personalWorkspaces = useMemo(() => memberships.filter((workspace) => workspace.type === 'PERSONAL' && workspace.role === 'OWNER'), [memberships]);
  const canManage = activeMembership?.role === 'OWNER';

  const [sourceWorkspaceId, setSourceWorkspaceId] = useState<number>(businessWorkspaces[0]?.id ?? activeMembership?.id ?? 0);
  const [destinationWorkspaceId, setDestinationWorkspaceId] = useState<number>(personalWorkspaces[0]?.id ?? 0);
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [description, setDescription] = useState('Pro-labore mensal');
  const [feedback, setFeedback] = useState<string | null>(null);

  const actionError = createSchedule.error || deactivateSchedule.error || confirmPending.error || cancelPending.error;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    await createSchedule.mutateAsync({
      sourceWorkspaceId,
      destinationWorkspaceId,
      amount: Number(amount),
      dayOfMonth: Number(dayOfMonth),
      description,
    });
    setAmount('');
    setFeedback('Agendamento criado.');
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
        <header className="pt-4">
          <div className="flex items-center gap-3">
            <WalletCards className="h-7 w-7 text-emerald-300" />
            <h1 className="text-2xl font-bold text-white">Pro-labore recorrente</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Agende a recorrencia mensal e confirme manualmente cada pendencia.</p>
        </header>

        {(actionError || feedback) && (
          <div className={`rounded-lg border p-3 text-sm ${actionError ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
            {actionError ? getErrorMessage(actionError) : feedback}
          </div>
        )}

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold text-white">Novo agendamento mensal</h2>
          </div>

          {!canManage ? (
            <p className="text-sm text-slate-400">Apenas OWNER pode configurar pro-labore recorrente.</p>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Origem empresa
                <select
                  value={sourceWorkspaceId || ''}
                  onChange={(event) => setSourceWorkspaceId(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400"
                  required
                >
                  {businessWorkspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id} className="text-black">{workspace.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Destino pessoal
                <select
                  value={destinationWorkspaceId || ''}
                  onChange={(event) => setDestinationWorkspaceId(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400"
                  required
                >
                  {personalWorkspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id} className="text-black">{workspace.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Valor
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Dia
                <input
                  value={dayOfMonth}
                  onChange={(event) => setDayOfMonth(event.target.value)}
                  type="number"
                  min="1"
                  max="31"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300 md:col-span-2 xl:col-span-1">
                Descricao
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400"
                  maxLength={255}
                  required
                />
              </label>
              <div className="md:col-span-2 xl:col-span-5">
                <button
                  type="submit"
                  disabled={createSchedule.isPending || businessWorkspaces.length === 0 || personalWorkspaces.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Criar agendamento
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-white">Pendencias</h2>
            <div className="space-y-3">
              {pendings.isLoading && <p className="text-sm text-slate-400">Carregando pendencias...</p>}
              {!pendings.isLoading && pendings.data?.length === 0 && <p className="text-sm text-slate-400">Nenhuma pendencia encontrada.</p>}
              {pendings.data?.map((pending) => (
                <PendingRow
                  key={pending.id}
                  pending={pending}
                  onConfirm={(id) => confirmPending.mutate(id)}
                  onCancel={(id) => cancelPending.mutate(id)}
                  isConfirming={confirmPending.isPending}
                  isCancelling={cancelPending.isPending}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-white">Agendamentos</h2>
            <div className="space-y-3">
              {schedules.isLoading && <p className="text-sm text-slate-400">Carregando agendamentos...</p>}
              {!schedules.isLoading && schedules.data?.length === 0 && <p className="text-sm text-slate-400">Nenhum agendamento encontrado.</p>}
              {schedules.data?.map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onDeactivate={(id) => deactivateSchedule.mutate(id)}
                  isPending={deactivateSchedule.isPending}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
