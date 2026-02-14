import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { SummaryCards } from '../components/SummaryCards';
import { RecentTransactions } from '../components/RecentTransactions';
import { useDashboard } from '../hooks/useDashboard';
import { AlertTriangle } from 'lucide-react';

export function DashboardPage() {
  const { summary, transactions, isLoading } = useDashboard();

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

      {/* Ações Rápidas (Estático por enquanto) */}
      <section className="px-6 mb-8">
        <h2 className="text-white font-semibold text-lg mb-4">Ações Rápidas</h2>
        <div className="flex justify-between items-start">
          {/* Botões Mockados */}
          <button className="flex flex-col items-center gap-2 group w-1/4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] shadow-lg shadow-purple-500/20 flex items-center justify-center group-active:scale-95 transition-transform">
              <span className="text-white text-2xl">+</span>
            </div>
            <span className="text-xs font-medium text-slate-300 text-center">Nova<br/>Transação</span>
          </button>
          {/* Outros botões... */}
        </div>
      </section>

      <RecentTransactions data={transactions} isLoading={isLoading} />
    </AppLayout>
  );
}