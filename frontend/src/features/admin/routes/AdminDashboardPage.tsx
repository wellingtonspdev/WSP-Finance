import { useEffect, useState } from 'react';
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

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await api.get<PlatformMetrics>('/admin/metrics');
        if (!isCancelled) {
          setMetrics(data);
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
          {metrics && (
            <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="generated-at">
              Atualizado em: {new Date(metrics.generatedAt).toLocaleString()}
            </div>
          )}
        </header>

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
