import React, { useState } from 'react';
import { AlertTriangle, Info, AlertOctagon, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AIInsightForTransaction, AIInsightSeverity } from '../types';

// ── Severity configuration ──
const SEVERITY_CONFIG: Record<AIInsightSeverity, {
    icon: React.ElementType;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
    label: string;
}> = {
    INFO: {
        icon: Info,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        textColor: 'text-blue-300',
        iconColor: 'text-blue-400',
        label: 'Atenção contábil',
    },
    WARNING: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        textColor: 'text-amber-300',
        iconColor: 'text-amber-400',
        label: 'Alerta pedagógico',
    },
    CRITICAL: {
        icon: AlertOctagon,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        textColor: 'text-red-300',
        iconColor: 'text-red-400',
        label: 'Atenção crítica',
    },
};

interface AIInsightBadgeProps {
    insight: AIInsightForTransaction | null | undefined;
    canDismiss?: boolean;
    onDismiss?: (insightId: string) => Promise<void>;
}

export function AIInsightBadge({ insight, canDismiss = false, onDismiss }: AIInsightBadgeProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [dismissError, setDismissError] = useState(false);

    // Guard: null, undefined, or dismissed
    if (!insight || insight.dismissed) {
        return null;
    }

    const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.INFO;
    const IconComponent = config.icon;

    const handleDismiss = async () => {
        if (!onDismiss || isDismissing) return;
        setIsDismissing(true);
        setDismissError(false);
        try {
            await onDismiss(insight.id);
        } catch {
            setDismissError(true);
        } finally {
            setIsDismissing(false);
        }
    };

    return (
        <div
            data-testid="ai-insight-badge"
            className={`rounded-xl border px-3 py-2.5 mb-3 ${config.bgColor} ${config.borderColor}`}
        >
            {/* Header row */}
            <div className="flex items-start gap-2">
                <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.textColor} opacity-70`}>
                            {config.label}
                        </span>
                    </div>
                    {/* Message — rendered as text, never HTML */}
                    <p className={`text-sm leading-snug ${config.textColor}`}>
                        {insight.message}
                    </p>
                </div>

                {/* Expand/collapse toggle */}
                {insight.reason && (
                    <button
                        data-testid="ai-insight-expand"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1 rounded-lg hover:bg-white/5 transition-colors ${config.textColor}`}
                        aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Expanded reason — rendered as text, never HTML */}
            {isExpanded && insight.reason && (
                <div className={`mt-2 pt-2 border-t ${config.borderColor}`}>
                    <p className={`text-xs leading-relaxed ${config.textColor} opacity-80`}>
                        {insight.reason}
                    </p>
                </div>
            )}

            {/* Dismiss button (only for authorized roles) */}
            {canDismiss && onDismiss && (
                <div className={`mt-2 pt-2 border-t ${config.borderColor} flex items-center justify-between`}>
                    <button
                        onClick={handleDismiss}
                        disabled={isDismissing}
                        className={`text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors
                            ${isDismissing
                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                : `${config.textColor} hover:bg-white/5`
                            }
                        `}
                        aria-label="Ignorar alerta"
                    >
                        <X className="w-3 h-3" />
                        {isDismissing ? 'Ignorando...' : 'Ignorar alerta'}
                    </button>
                    {dismissError && (
                        <span className="text-xs text-red-400">
                            Não foi possível ignorar o alerta.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
