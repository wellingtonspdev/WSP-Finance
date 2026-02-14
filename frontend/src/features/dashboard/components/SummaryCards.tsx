import { ArrowDown, ArrowUp, Eye } from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/skeletons/CardSkeleton';
import type { DashboardSummary } from '../api/getSummary';

interface Props {
  data?: DashboardSummary;
  isLoading: boolean;
}

export function SummaryCards({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="px-6 lg:px-0 mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1"><CardSkeleton /></div>
        <div className="grid grid-cols-2 lg:col-span-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="px-6 lg:px-0 mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* Card 1: Saldo Total (Destaque) */}
      <section className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg lg:h-full flex flex-col justify-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-300 text-sm font-medium uppercase tracking-wider">Saldo Total</span>
          <button className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
            <Eye className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
            {formatCurrency(data?.balance.total || 0)}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Atualizado agora
        </div>
      </section>

      {/* Container Entradas/Saídas (Mobile: Grid 2 / Desktop: Grid 2 dentro da col-span-2) */}
      <section className="lg:col-span-2 grid grid-cols-2 gap-4 lg:gap-6">
        
        {/* Card 2: Entradas */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-sm hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-slate-300 text-sm font-medium">Entradas</span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white">{formatCurrency(data?.flow.income || 0)}</p>
          <p className="text-xs text-green-400 mt-1">+12% vs mês anterior</p>
        </div>

        {/* Card 3: Saídas */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-sm hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <ArrowUp className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-slate-300 text-sm font-medium">Saídas</span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white mb-2">{formatCurrency(data?.flow.expense || 0)}</p>
          
          {/* Barra de Progresso */}
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-red-400 to-red-600 h-1.5 rounded-full" style={{ width: '72%' }}></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-right">72% do orçamento</p>
        </div>
      </section>
    </div>
  );
}