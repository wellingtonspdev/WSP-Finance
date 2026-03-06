import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

export interface ActivityEvent {
    id: string;
    type: 'success' | 'warning' | 'info';
    description: string;
    timeAgo: string;
}

interface ActivityFeedProps {
    events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
    const getDotBg = (type: string) => {
        switch (type) {
            case 'success': return 'bg-emerald-500';
            case 'warning': return 'bg-amber-500';
            case 'info': return 'bg-[#1978e5]';
            default: return 'bg-slate-500';
        }
    };

    return (
        <aside className="w-full xl:w-[320px] bg-white/5 border border-white/10 xl:border-solid overflow-hidden backdrop-blur-[12px] shrink-0 mt-6 xl:mt-0 px-6 xl:px-0 rounded-2xl h-fit xl:h-[calc(100vh-2rem)] xl:sticky xl:top-4 flex flex-col">
            <div className="py-2 xl:p-5 border-none xl:border-solid xl:border-b border-white/10 shrink-0">
                <h3 className="text-lg xl:text-[15px] font-bold text-white flex items-center gap-2 tracking-tight">
                    <Clock className="w-4 h-4 text-[#1978e5] hidden xl:block" />
                    Atividades Recentes
                </h3>
            </div>

            <div className="flex-none xl:flex-1 overflow-visible xl:overflow-y-auto py-4 xl:p-6 space-y-6 no-scrollbar pb-24 xl:pb-0">
                {events.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm">Nenhuma atividade recente.</div>
                ) : (
                    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                        {events.map((event) => (
                            <div key={event.id} className="relative z-10">
                                <div className={clsx("absolute -left-[30px] top-[7px] w-2.5 h-2.5 rounded-full border-4 border-[#160a26] xl:border-[#1a1128]", getDotBg(event.type))}></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300 leading-snug">
                                        <span dangerouslySetInnerHTML={{ __html: event.description.replace(/Malha fina evitada:|Tech Solutions|Dropship X|Agência Criativa/g, match => `<span class="text-white font-bold">${match}</span>`) }} />
                                    </p>
                                    <span className="text-[11px] text-slate-500 mt-1 block tracking-tight">{event.timeAgo} • Categoria: Automação</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
