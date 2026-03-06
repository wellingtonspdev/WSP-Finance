import { clsx } from "clsx";

interface HealthStatusBadgeProps {
    status: 'stable' | 'attention' | 'urgent';
    label?: string;
}

export function HealthStatusBadge({ status, label }: HealthStatusBadgeProps) {
    const config = {
        stable: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400',
            dot: 'bg-emerald-400',
            defaultLabel: 'Estável'
        },
        attention: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-400',
            dot: 'bg-amber-400',
            defaultLabel: 'Atenção'
        },
        urgent: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'text-red-400',
            dot: 'bg-red-400',
            defaultLabel: 'Urgente'
        }
    };

    const current = config[status];

    return (
        <div className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm shadow-sm",
            current.bg,
            current.border,
            current.text
        )}>
            <div className="relative flex h-1.5 w-1.5 mr-0.5">
                <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", current.dot)}></span>
                <span className={clsx("relative inline-flex rounded-full h-1.5 w-1.5", current.dot)}></span>
            </div>
            {label || current.defaultLabel}
        </div>
    );
}
