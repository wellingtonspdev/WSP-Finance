import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAIInsights } from '../api/useAIInsights';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { dismissAIInsight } from '../../transactions/api/aiInsightApi';
import { useQueryClient } from '@tanstack/react-query';
import { AI_INSIGHTS_QUERY_KEY } from '../api/useAIInsights';
import { Loader2, AlertCircle, ArrowLeft, Info, AlertTriangle, ShieldAlert, ExternalLink } from 'lucide-react';
import type { AiInsightItem } from '../types';
import type { HubFilters } from '../types';
import { getInsightPresentation, formatInsightCurrency } from '../presentation';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { AppLayout } from '../../../shared/components/layout/AppLayout';

type FilterTab = 'all' | 'critical' | 'warning' | 'info' | 'dismissed';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'critical', label: 'Críticos' },
  { id: 'warning', label: 'Atenção' },
  { id: 'info', label: 'Informativos' },
  { id: 'dismissed', label: 'Ignorados' },
];

function buildFilters(tab: FilterTab): HubFilters {
  switch (tab) {
    case 'critical':
      return { dismissed: false, severity: 'CRITICAL' };
    case 'warning':
      return { dismissed: false, severity: 'WARNING' };
    case 'info':
      return { dismissed: false, severity: 'INFO' };
    case 'dismissed':
      return { dismissed: true };
    case 'all':
    default:
      return { dismissed: false };
  }
}

export function AnalysisPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const activeMembership = useWorkspaceStore(state => state.activeMembership);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const filters = buildFilters(activeTab);
  const { data, isLoading, isError } = useAIInsights(workspaceId, filters);

  const canDismiss =
    activeMembership &&
    (activeMembership.role === 'OWNER' ||
      activeMembership.role === 'ACCOUNTANT' ||
      activeMembership.role === 'EDITOR');

  const handleDismiss = async (id: string) => {
    setDismissError(null);
    try {
      await dismissAIInsight(id);
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: [AI_INSIGHTS_QUERY_KEY, workspaceId] });
      }
    } catch {
      setDismissError('Não foi possível ignorar o alerta. Tente novamente.');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div data-testid="analysis-skeleton" className="p-6 text-white flex justify-center items-center w-full h-full">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="p-6 text-white flex justify-center items-center w-full h-full">
          <div className="text-red-500">Erro ao carregar as análises. Verifique sua conexão.</div>
        </div>
      </AppLayout>
    );
  }

  const insights = data?.data || [];
  const summary = data?.summary;

  return (
    <AppLayout>
      <div className="flex flex-col relative text-white w-full h-full">
        <header className="lg:hidden px-6 pt-6 pb-4 flex items-center justify-between z-20 sticky top-0 bg-[#11051f]/60 backdrop-blur-xl border-b border-white/5">
          <button
            onClick={() => navigate(`/${workspaceId}/dashboard`)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-semibold">Análises</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Revise pontos de atenção pedagógicos
            </p>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </header>

        {/* Desktop header title */}
        <div className="hidden lg:flex flex-col mb-6 px-1 pt-4 max-w-4xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-white">Análises</h1>
          <p className="text-sm text-slate-400 mt-1">
            Revise pontos de atenção pedagógicos gerados a partir das suas transações.
          </p>
        </div>

        <main className="flex-1 pb-16 lg:pb-8 max-w-4xl mx-auto w-full">
        {/* Educational disclaimer */}
        <div className="mb-6 px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-300/80 text-center">
          Esses alertas são sugestões educativas e não substituem a análise do contador.
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`bg-white/5 border rounded-xl p-4 text-center transition-colors cursor-pointer ${activeTab === 'all' ? 'border-purple-500/50 ring-1 ring-purple-500/30' : 'border-white/10 hover:border-white/20'}`}
            >
              <div className="text-2xl font-bold text-white">{summary.activeCount}</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Ativos</div>
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`bg-red-500/10 border rounded-xl p-4 text-center transition-colors cursor-pointer ${activeTab === 'critical' ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-red-500/20 hover:border-red-500/30'}`}
            >
              <div className="text-2xl font-bold text-red-500">{summary.criticalCount}</div>
              <div className="text-xs text-red-500/70 mt-1 uppercase tracking-wider">Críticos</div>
            </button>
            <button
              onClick={() => setActiveTab('warning')}
              className={`bg-yellow-500/10 border rounded-xl p-4 text-center transition-colors cursor-pointer ${activeTab === 'warning' ? 'border-yellow-500/50 ring-1 ring-yellow-500/30' : 'border-yellow-500/20 hover:border-yellow-500/30'}`}
            >
              <div className="text-2xl font-bold text-yellow-500">{summary.warningCount}</div>
              <div className="text-xs text-yellow-500/70 mt-1 uppercase tracking-wider">Atenção</div>
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`bg-blue-500/10 border rounded-xl p-4 text-center transition-colors cursor-pointer ${activeTab === 'info' ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-blue-500/20 hover:border-blue-500/30'}`}
            >
              <div className="text-2xl font-bold text-blue-500">{summary.infoCount}</div>
              <div className="text-xs text-blue-500/70 mt-1 uppercase tracking-wider">Informativos</div>
            </button>
            <button
              onClick={() => setActiveTab('dismissed')}
              className={`bg-white/5 border rounded-xl p-4 text-center transition-colors cursor-pointer ${activeTab === 'dismissed' ? 'border-slate-400/50 ring-1 ring-slate-400/30' : 'border-white/10 hover:border-white/20'}`}
            >
              <div className="text-2xl font-bold text-slate-400">{summary.dismissedCount}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Ignorados</div>
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              data-testid={`filter-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dismiss error message */}
        {dismissError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 text-center">
            {dismissError}
          </div>
        )}

        {/* Insights list */}
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white/5 rounded-2xl border border-white/5">
              Nenhuma análise encontrada.
            </div>
          ) : (
            insights.map((insight: AiInsightItem) => {
              const presentation = getInsightPresentation(insight);
              return (
                <div key={insight.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getSeverityIcon(insight.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{presentation.title}</h3>
                          <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                            insight.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            insight.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {presentation.severityLabel}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{presentation.description}</p>

                        {/* Transaction context */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-black/20 p-2 rounded-lg border border-white/5">
                          <span className="font-medium text-slate-300">{insight.transaction?.description}</span>
                          <span>•</span>
                          <span>{insight.transaction?.date ? new Date(insight.transaction.date).toLocaleDateString('pt-BR') : ''}</span>
                          <span>•</span>
                          <span className={insight.transaction?.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}>
                            {formatInsightCurrency(insight.transaction?.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Primary action: Ver transação */}
                      <button
                        onClick={() => setSelectedTransactionId(insight.transactionId)}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-purple-300 flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver transação
                      </button>

                      {/* Secondary action: Ignorar alerta (only for active + authorized) */}
                      {!insight.dismissed && canDismiss && (
                        <button
                          onClick={() => handleDismiss(insight.id)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-slate-300"
                        >
                          Ignorar alerta
                        </button>
                      )}

                      {/* Dismissed status badge */}
                      {insight.dismissed && (
                        <span className="px-3 py-1.5 bg-slate-500/10 border border-slate-500/20 rounded-lg text-xs font-medium text-slate-500">
                          Ignorado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <TransactionDetailModal
        isOpen={!!selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
        transactionId={selectedTransactionId}
      />
      </div>
    </AppLayout>
  );
}
