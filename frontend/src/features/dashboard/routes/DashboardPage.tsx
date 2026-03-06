import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { SummaryCards } from '../components/SummaryCards';
import { RecentTransactions } from '../components/RecentTransactions';
import { useDashboard } from '../hooks/useDashboard';
import { AlertTriangle, Receipt, BarChart2 } from 'lucide-react';
import { useUI } from '../../../shared/context/UIProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useCapabilities } from '../../../shared/hooks/useCapabilities';

export function DashboardPage() {
  const { summary, transactions, isLoading } = useDashboard();
  const { openTransactionModal } = useUI();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { canEdit } = useCapabilities();

  return (
    <AppLayout>
      <SummaryCards data={summary} isLoading={isLoading} />

      {/* Alerta de Risco (Condicional) */}
      {summary?.metrics.breakEvenPoint && summary.metrics.breakEvenPoint > 0 && (
        <section className="px-6 mb-8">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0 w-5 h-5" />
            <div>
              <h3 className="text-yellow-500 font-semibold text-sm mb-0.5">Atenção</h3>
              <p className="text-yellow-500/80 text-xs leading-relaxed">
                Meta de faturamento: R$ {summary.metrics.breakEvenPoint} para cobrir fixas.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Ações Rápidas */}
      <section className="px-6 mb-8">
        <h2 className="text-white font-semibold text-lg mb-4">Ações Rápidas</h2>
        <div className="flex justify-between items-start gap-4">

          {canEdit && (
            <button
              onClick={openTransactionModal}
              className="flex flex-col items-center gap-2 group w-1/4"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] shadow-lg shadow-purple-500/20 flex items-center justify-center group-active:scale-95 transition-transform">
                <span className="text-white text-2xl">+</span>
              </div>
              <span className="text-xs font-medium text-slate-300 text-center leading-tight">Nova<br />Transação</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/${workspaceId}/transactions`)}
            className="flex flex-col items-center gap-2 group w-1/4"
          >
            <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center group-active:scale-95 transition-transform hover:bg-white/10">
              <Receipt className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-slate-300 text-center leading-tight">Extrato<br />Mensal</span>
          </button>

          <button className="flex flex-col items-center gap-2 group w-1/4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-active:scale-95 transition-transform hover:bg-white/10">
              <BarChart2 className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-slate-300 text-center leading-tight">Análise<br />PACT</span>
          </button>
        </div>
      </section>

      <RecentTransactions data={transactions} isLoading={isLoading} />
    </AppLayout>
  );
}