import type { Transaction } from '../api/getRecentTransactions';
import { ListSkeleton } from '../../../shared/components/skeletons/ListSkeleton';
import { ShoppingCart, ArrowRight } from 'lucide-react';

interface Props {
  data?: Transaction[];
  isLoading: boolean;
}

export function RecentTransactions({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section className="px-6 lg:px-0 flex-1">
        <div className="h-6 w-40 bg-white/10 rounded animate-pulse mb-4"></div>
        <ListSkeleton />
      </section>
    );
  }

  const formatCurrency = (value: string) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <section className="px-6 lg:px-0 flex-1 w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold text-lg lg:text-xl">Atividade Recente</h2>
        <button className="text-sm text-blue-400 font-medium hover:text-blue-300 flex items-center gap-1 transition-colors">
          Ver extrato completo <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      
      {data?.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-slate-400">Nenhuma transação recente.</p>
        </div>
      )}

      {/* Mobile View (List) */}
      <div className="space-y-4 lg:hidden pb-4">
        {data?.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{tx.description}</p>
                <p className="text-slate-400 text-xs truncate">
                  {formatDate(tx.date)} • {tx.category.name}
                </p>
              </div>
            </div>
            <span className={`font-bold text-sm whitespace-nowrap ml-2 ${tx.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
              {tx.type === 'EXPENSE' ? '- ' : '+ '}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Transação</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-white font-medium">{tx.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300 text-sm">
                  <span className="px-2 py-1 rounded-full bg-white/10 text-xs border border-white/5">
                    {tx.category.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(tx.date)}</td>
                <td className={`px-6 py-4 text-right font-bold text-sm ${tx.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                  {tx.type === 'EXPENSE' ? '- ' : '+ '}
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}