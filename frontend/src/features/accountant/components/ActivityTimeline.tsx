import { clsx } from 'clsx';
import type { ActivityEvent } from './ActivityFeed';

interface ActivityTimelineProps {
    events: ActivityEvent[];
}

const HIGHLIGHT_TERMS = [
    'Malha fina evitada:',
    'Tech Solutions',
    'Dropship X',
    'Agência Criativa',
    'Conciliação OFX finalizada',
];

function highlightDescription(description: string) {
    const regex = new RegExp(`(${HIGHLIGHT_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const parts = description.split(regex);

    return parts.map((part, index) => {
        if (HIGHLIGHT_TERMS.includes(part)) {
            return (
                <span key={index} className="text-white font-bold">
                    {part}
                </span>
            );
        }
        return part;
    });
}

function getDotBg(type: string) {
    switch (type) {
        case 'success': return 'bg-emerald-500';
        case 'warning': return 'bg-amber-500';
        case 'info': return 'bg-[#1978e5]';
        default: return 'bg-slate-500';
    }
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="text-center text-slate-500 text-sm py-8">
                Nenhuma atividade recente.
            </div>
        );
    }

    return (
        <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-white/10">
            {events.map((event) => (
                <div key={event.id} className="relative z-10">
                    <div
                        className={clsx(
                            'absolute -left-[21px] top-[6px] w-[10px] h-[10px] rounded-full ring-4 ring-[#0f172a] transition-all duration-500 ease-in-out',
                            getDotBg(event.type),
                        )}
                    />
                    <div>
                        <p className="text-sm font-medium text-slate-300 leading-snug">
                            {highlightDescription(event.description)}
                        </p>
                        <span className="text-[11px] text-slate-500 mt-1 block tracking-tight">
                            {event.timeAgo} &bull; Categoria: Automação
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
