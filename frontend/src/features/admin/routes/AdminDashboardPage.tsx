import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../app/AuthProvider';
import { api } from '../../../shared/lib/axios';

interface PlatformMetrics {
  totalUsers: number;
  totalWorkspaces: number;
  totalAdmins: number;
  totalTransactions: number;
  pendingMovements: number;
  pendingInvites: number;
  generatedAt: string;
}

interface AdminMetricsResponse {
  platform: {
    totalUsers: number;
    totalWorkspaces: number;
    totalAdmins: number;
  };
  activity: {
    totalTransactions: number;
    pendingMovements: number;
    pendingInvites: number;
  };
  generatedAt: string;
}

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const mapResponse = (data: AdminMetricsResponse): PlatformMetrics => ({
    totalUsers: data.platform?.totalUsers || 0,
    totalWorkspaces: data.platform?.totalWorkspaces || 0,
    totalAdmins: data.platform?.totalAdmins || 0,
    totalTransactions: data.activity?.totalTransactions || 0,
    pendingMovements: data.activity?.pendingMovements || 0,
    pendingInvites: data.activity?.pendingInvites || 0,
    generatedAt: data.generatedAt || new Date().toISOString(),
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await api.get<AdminMetricsResponse>('/admin/metrics');
        if (!isCancelled) {
          setMetrics(mapResponse(data));
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (err.response?.status === 403) {
            setError('Acesso negado. Você não tem permissão para visualizar estas métricas.');
          } else {
            setError('Ocorreu um erro ao carregar as métricas. Tente novamente mais tarde.');
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setRefreshError(null);
      const { data } = await api.get<AdminMetricsResponse>('/admin/metrics');
      setMetrics(mapResponse(data));
    } catch (err: any) {
      if (err.response?.status === 403) {
        setRefreshError('Acesso negado. Sessão pode ter expirado.');
      } else {
        setRefreshError('Erro ao atualizar métricas. Tente novamente.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900" data-testid="admin-loading">
        <div className="text-gray-500">CARREGANDO MÉTRICAS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Bem-vindo, {user?.name || 'Platform Admin'}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {metrics && (
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="generated-at">
                Atualizado em: {new Date(metrics.generatedAt).toLocaleString()}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="admin-refresh-btn"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isRefreshing ? 'Atualizando...' : 'Atualizar métricas'}
            </button>
            <button
              onClick={logout}
              data-testid="admin-logout-btn"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {refreshError && (
          <div
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
            data-testid="admin-refresh-error"
          >
            {refreshError}
          </div>
        )}

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard title="Total de Usuários" value={metrics.totalUsers} />
            <MetricCard title="Total de Workspaces" value={metrics.totalWorkspaces} />
            <MetricCard title="Total de Admins" value={metrics.totalAdmins} />
            <MetricCard title="Total de Transações" value={metrics.totalTransactions} />
            <MetricCard title="Movimentações Pendentes" value={metrics.pendingMovements} />
            <MetricCard title="Convites Pendentes" value={metrics.pendingInvites} />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
