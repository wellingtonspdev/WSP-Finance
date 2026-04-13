import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Merge, Info, Calendar, DollarSign, AlertTriangle, Building2, FileText } from 'lucide-react';
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
        className="flex items-center gap-3 sm:gap-4 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Indicador de Valor */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isPositive
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>

        {/* Info Principal */}
        <div className="flex-1 min-w-0 block">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white line-clamp-2 leading-snug break-words">
              {movement.description}
            </p>
            <span className={`text-sm font-bold tabular-nums shrink-0 whitespace-nowrap pt-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(movement.amount)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
            <span className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <Calendar className="w-3 h-3" />
              {formatDate(movement.date)}
            </span>
            {movement.account && (
              <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 min-w-0">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{movement.account.name}</span>
              </span>
            )}
            
            {/* Badge de Duplicata (Movido para dentro dos metadados p/ fluidez no mobile) */}
            {hasDuplicates && (
              <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 whitespace-nowrap">
                <AlertTriangle className="w-[10px] h-[10px]" />
                {duplicates.length + 1}x
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500 group-hover:text-slate-300 shrink-0 ml-1"
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
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados do Extrato</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(movement.rawPayload)
                      .filter(([_, value]) => value !== null && value !== '')
                      .map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-0.5 bg-black/20 p-2 rounded-lg border border-white/5">
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate" title={String(value)}>
                            {String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
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
              <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 mt-4 pt-4 border-t border-white/5">
                {hasDuplicates && (
                  <button
                    onClick={() => {
                      const discardIds = [movement.id, ...duplicates.map(d => d.id)].filter(id => id !== selectedKeep);
                      onMerge(selectedKeep, discardIds);
                    }}
                    disabled={isProcessing}
                    className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 h-11 sm:h-9 px-4 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm sm:text-xs font-bold rounded-xl border border-amber-500/20 transition-all disabled:opacity-40"
                  >
                    <Merge className="w-4 h-4" />
                    Mesclar
                  </button>
                )}

                <button
                  onClick={() => onReject(movement.id)}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-1.5 h-11 sm:h-9 px-4 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm sm:text-xs font-bold rounded-xl border border-red-500/20 transition-all disabled:opacity-40 order-1 sm:order-none"
                >
                  <X className="w-4 h-4" />
                  Rejeitar
                </button>

                <button
                  onClick={() => onApprove(movement.id)}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-1.5 h-11 sm:h-9 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm sm:text-xs font-bold rounded-xl border border-emerald-500/20 transition-all disabled:opacity-40 order-2 sm:order-none"
                >
                  <Check className="w-4 h-4" />
                  Aprovar
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
