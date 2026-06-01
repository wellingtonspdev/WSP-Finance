import React, { useState, useMemo } from 'react';
import type { Transaction, AIInsightForTransaction } from '../types';
import { formatDecimalToBrl } from '../../../shared/lib/moneyFormat';
import { ShoppingBag, Pencil, Trash, Clock, Tag, Briefcase, Zap, Home, DollarSign, Wallet, Paperclip, Eye } from 'lucide-react';
import { useCapabilities } from '../../../shared/hooks/useCapabilities';
import { LockIcon } from '../../../shared/components/LockIcon';
import { isDateLocked } from '../../../shared/lib/fiscalLock';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { AIInsightBadge } from './AIInsightBadge';

const ICON_MAP: Record<string, React.ElementType> = {
    'tag': Tag,
    'briefcase': Briefcase,
    'shopping-bag': ShoppingBag,
    'zap': Zap,
    'home': Home,
    'dollar-sign': DollarSign,
    'wallet': Wallet
};

interface TransactionAccordionItemProps {
    transaction: Transaction;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onPreviewAttachment?: (id: string, e: React.MouseEvent) => void;
    onDismissInsight?: (insightId: string) => Promise<void>;
    defaultExpanded?: boolean;
}

// Severity priority: CRITICAL > WARNING > INFO
const SEVERITY_PRIORITY: Record<string, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };

/** Select the most important active insight: highest severity, then most recent. */
function selectTopInsight(insights?: AIInsightForTransaction[]): AIInsightForTransaction | null {
    if (!insights || insights.length === 0) return null;
    const active = insights.filter(i => !i.dismissed);
    if (active.length === 0) return null;
    return active.sort((a, b) => {
        const diff = (SEVERITY_PRIORITY[b.severity] ?? 0) - (SEVERITY_PRIORITY[a.severity] ?? 0);
        if (diff !== 0) return diff;
        // Same severity: most recent first
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    })[0];
}

export function TransactionAccordionItem({ transaction, onEdit, onDelete, onPreviewAttachment, onDismissInsight, defaultExpanded = false }: TransactionAccordionItemProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { canEdit, activeRole } = useCapabilities();
    const closedUntil = useWorkspaceStore(s => s.activeMembership?.closedUntil ?? null);
    const isLocked = isDateLocked(transaction.date, closedUntil);

    // Select the most important insight (CRITICAL > WARNING > INFO, then most recent)
    const topInsight = useMemo(() => selectTopInsight(transaction.aiInsights), [transaction.aiInsights]);

    // canDismiss: OWNER, ACCOUNTANT, EDITOR can dismiss. VIEWER cannot.
    // NOT derived from canEdit (which excludes ACCOUNTANT).
    const canDismissInsight = activeRole === 'OWNER' || activeRole === 'ACCOUNTANT' || activeRole === 'EDITOR';

    // Bypass: ACCOUNTANT pode operar em períodos fechados (backend permite)
    const isActionBlocked = isLocked && activeRole !== 'ACCOUNTANT';

    // We should decide colors based on the data
    const isIncome = transaction.type === 'INCOME';
    const isLoss = transaction.netValue != null && transaction.netValue < 0;

    const amountColor = isIncome && !isLoss ? 'text-green-400' : 'text-red-400';
    const displayAmount = isIncome
        ? (transaction.netValue != null ? transaction.netValue : transaction.amount)
        : transaction.amount;

    const finalAmountString = (displayAmount > 0 && isIncome ? '+ ' : '') + formatDecimalToBrl(displayAmount);

    const toggleExpand = () => setIsExpanded(prev => !prev);

    // Dynamic Icon Colors
    const iconBgColor = isIncome && !isLoss ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

    // PACT validation format
    const isPact = transaction.grossAmount != null && transaction.grossAmount > 0;
    const hasNetValue = transaction.netValue != null;

    const IconComponent = transaction.category?.icon ? (ICON_MAP[transaction.category.icon] || Tag) : Tag;

    return (
        <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
            {/* Short Visual Row */}
            <div
                onClick={toggleExpand}
                className={`p-4 flex items-start w-full cursor-pointer ${isExpanded ? 'border-b border-white/5 bg-white/10' : 'hover:bg-white/10'}`}
            >
                <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                    <div className={`mt-0.5 w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${iconBgColor}`}>
                        <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {isLocked && <LockIcon transactionDate={transaction.date} />}
                            <p className="text-sm font-medium text-white break-words hyphens-auto">{transaction.description}</p>
                            {transaction.attachmentUrl && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Evita expandir o card ao clicar no clipe
                                        onPreviewAttachment?.(transaction.id, e);
                                    }}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Ver Comprovante"
                                >
                                    <Paperclip className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 break-words">Categoria: {transaction.category?.name || transaction.categoryId}</p>
                    </div>
                </div>
                <div className="text-right shrink-0 ml-3 whitespace-nowrap">
                    <p className={`text-sm font-bold ${amountColor}`}>{finalAmountString}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                        {transaction.isPaid ? (
                            <span className="w-2 h-2 rounded-full bg-success"></span>
                        ) : (
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{transaction.isPaid ? 'Pago' : 'Pendente'}</span>
                    </div>
                </div>
            </div>

            {/* Accordion Detailed Content */}
            {isExpanded && (
                <div className="p-5 bg-black/10 animate-[fadeIn_0.2s_ease-out]">
                    {/* AI Insight Badge (pedagogical alert) */}
                    {topInsight && (
                        <AIInsightBadge
                            insight={topInsight}
                            canDismiss={canDismissInsight}
                            onDismiss={onDismissInsight}
                        />
                    )}
                    <div className="flex flex-col gap-3">

                        {/* If it's a PACT Marketplace sell, show receipt */}
                        {isPact ? (
                            <>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Valor Bruto</span>
                                    <span className="font-medium text-slate-200">+ {formatDecimalToBrl(transaction.grossAmount)}</span>
                                </div>
                                {Number(transaction.marketplaceFee) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Taxa Marketplace</span>
                                        <span className="font-medium text-red-400">- {formatDecimalToBrl(transaction.marketplaceFee)}</span>
                                    </div>
                                )}
                                {Number(transaction.shippingCost) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Custo de Frete</span>
                                        <span className="font-medium text-red-400">- {formatDecimalToBrl(transaction.shippingCost)}</span>
                                    </div>
                                )}
                                {Number(transaction.productCost) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Custo do Produto</span>
                                        <span className="font-medium text-red-400">- {formatDecimalToBrl(transaction.productCost)}</span>
                                    </div>
                                )}
                                {Number(transaction.taxAmount) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Imposto Calculado</span>
                                        <span className="font-medium text-red-400">- {formatDecimalToBrl(transaction.taxAmount)}</span>
                                    </div>
                                )}

                                <div className="h-px bg-white/5 my-2"></div>

                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm font-medium text-slate-300">{hasNetValue ? 'Total Líquido' : 'Total'}</span>
                                    <div className={`px-3 py-1 rounded-lg border ${amountColor === 'text-green-400' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <span className={`text-base font-bold ${amountColor}`}>{finalAmountString}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                <span className="text-sm font-medium text-slate-300">Total Simples</span>
                                <div className={`px-3 py-1 rounded-lg border bg-white/5 border-white/5`}>
                                    <span className={`text-base font-bold ${amountColor}`}>{finalAmountString}</span>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {canEdit ? (
                            <>
                                <button
                                    onClick={() => !isActionBlocked && onEdit && onEdit(transaction.id)}
                                    disabled={isActionBlocked}
                                    title={isActionBlocked ? 'Período auditado e fechado pelo seu contador' : undefined}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                        isActionBlocked
                                            ? 'border-white/5 text-slate-500 opacity-40 cursor-not-allowed'
                                            : 'border-white/10 text-slate-300 hover:bg-white/10'
                                    }`}
                                >
                                    <Pencil className="w-4 h-4" /> Editar
                                </button>
                                <button
                                    onClick={() => !isActionBlocked && onDelete && onDelete(transaction.id)}
                                    disabled={isActionBlocked}
                                    title={isActionBlocked ? 'Período auditado e fechado pelo seu contador' : undefined}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                        isActionBlocked
                                            ? 'border-white/5 text-slate-500 opacity-40 cursor-not-allowed'
                                            : 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                                    }`}
                                >
                                    <Trash className="w-4 h-4" /> Excluir
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onPreviewAttachment && onPreviewAttachment(transaction.id, {} as any)}
                                className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#1978e5]/40 text-[#1978e5] text-sm font-medium hover:bg-[#1978e5]/10 transition-colors"
                            >
                                <Eye className="w-4 h-4" /> Visualizar Documentos
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
