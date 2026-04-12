import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Merge, Info, Calendar, DollarSign, FileText, Building2, AlertTriangle } from 'lucide-react';
import type { BankMovementDTO } from '../api/bankMovements';

interface MovementCardProps {
  movement: BankMovementDTO;
  duplicates?: BankMovementDTO[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMerge: (keepId: string, discardIds: string[]) => void;
  isProcessing?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
}

export function MovementCard({ movement, duplicates = [], onApprove, onReject, onMerge, isProcessing }: MovementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedKeep, setSelectedKeep] = useState<string>(movement.id);
  const hasDuplicates = duplicates.length > 0;
  const isPositive = movement.amount >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-[#1a0b2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
    >
      {/* Card Header - Sempre Visível */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Indicador de Valor */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isPositive
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <DollarSign className={`w-5 h-5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{movement.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(movement.date)}
            </span>
            {movement.account && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {movement.account.name}
              </span>
            )}
          </div>
        </div>

        {/* Valor */}
        <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(movement.amount)}
        </span>

        {/* Badge de Duplicata */}
        {hasDuplicates && (
          <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {duplicates.length + 1}x
          </span>
        )}

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500 group-hover:text-slate-300"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Card Body - Expandível */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Detalhes do Payload */}
              {movement.rawPayload && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-400">Dados do Extrato</span>
                  </div>
                  <pre className="text-xs text-slate-500 font-mono overflow-x-auto max-h-24 scrollbar-thin">
                    {JSON.stringify(movement.rawPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Seção de Duplicatas (Side-by-Side) */}
              {hasDuplicates && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Candidatos a Duplicata
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Movimento principal */}
                    <DuplicateCompareCard
                      movement={movement}
                      isSelected={selectedKeep === movement.id}
                      onSelect={() => setSelectedKeep(movement.id)}
                      label="Original"
                    />
                    {/* Duplicatas */}
                    {duplicates.map(dup => (
                      <DuplicateCompareCard
                        key={dup.id}
                        movement={dup}
                        isSelected={selectedKeep === dup.id}
                        onSelect={() => setSelectedKeep(dup.id)}
                        label="Duplicata"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2">
                {hasDuplicates && (
                  <button
                    onClick={() => {
                      const discardIds = [movement.id, ...duplicates.map(d => d.id)].filter(id => id !== selectedKeep);
                      onMerge(selectedKeep, discardIds);
                    }}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all disabled:opacity-40"
                  >
                    <Merge className="w-4 h-4" />
                    Mesclar
                  </button>
                )}

                <button
                  onClick={() => onApprove(movement.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  Aprovar
                </button>

                <button
                  onClick={() => onReject(movement.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-all ml-auto disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---- Sub-Componente: Card de Comparação de Duplicata ---- */

interface DuplicateCompareCardProps {
  movement: BankMovementDTO;
  isSelected: boolean;
  onSelect: () => void;
  label: string;
}

function DuplicateCompareCard({ movement, isSelected, onSelect, label }: DuplicateCompareCardProps) {
  const isPositive = movement.amount >= 0;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-[#1978e5]/10 border-[#1978e5]/40 ring-1 ring-[#1978e5]/30'
          : 'bg-white/5 border-white/5 hover:border-white/15'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          isSelected ? 'text-[#1978e5]' : 'text-slate-500'
        }`}>
          {isSelected ? '✓ Manter' : label}
        </span>
        <span className={`text-xs font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(movement.amount)}
        </span>
      </div>
      <p className="text-xs text-slate-300 truncate">{movement.description}</p>
      <p className="text-[10px] text-slate-500 mt-1">{formatDate(movement.date)}</p>
    </button>
  );
}
