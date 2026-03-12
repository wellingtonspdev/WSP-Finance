import { Lock } from 'lucide-react';
import { isDateLocked } from '../lib/fiscalLock';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

interface LockIconProps {
  transactionDate: Date | string;
  className?: string;
}

/**
 * Indicador visual de Período Fiscal Fechado.
 * Exibido para TODOS os utilizadores quando a data da transação
 * está dentro do intervalo auditado (closedUntil).
 */
export function LockIcon({ transactionDate, className = '' }: LockIconProps) {
  const closedUntil = useWorkspaceStore(s => s.activeMembership?.closedUntil ?? null);

  if (!isDateLocked(transactionDate, closedUntil)) return null;

  return (
    <span
      title="Período auditado e fechado pelo seu contador"
      className={`inline-flex items-center ${className}`}
    >
      <Lock className="w-3.5 h-3.5 text-amber-400" />
    </span>
  );
}
