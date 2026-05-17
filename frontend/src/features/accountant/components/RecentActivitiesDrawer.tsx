import { useEffect, useCallback } from 'react';
import { X, Clock } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import type { ActivityEvent } from './ActivityFeed';

interface RecentActivitiesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    events: ActivityEvent[];
}

export function RecentActivitiesDrawer({ isOpen, onClose, events }: RecentActivitiesDrawerProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                data-testid="activities-backdrop"
                onClick={onClose}
            />

            {/* Drawer panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Atividades Recentes"
                className={[
                    'absolute bg-[#1a0b2e] border-l border-white/10 shadow-2xl flex flex-col',
                    // Mobile: bottom-sheet quase fullscreen
                    'bottom-0 left-0 right-0 h-[92%] rounded-t-2xl',
                    // Desktop/Tablet: drawer lateral direito
                    'md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-full md:w-[400px] md:rounded-t-none md:rounded-l-2xl',
                ].join(' ')}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1978e5]/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[#1978e5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Atividades Recentes</h2>
                            <p className="text-xs text-slate-500">
                                {events.length} {events.length === 1 ? 'atividade' : 'atividades'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Fechar atividades recentes"
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar" data-testid="activities-scroll-container">
                    <ActivityTimeline events={events} />
                </div>
            </div>
        </div>
    );
}
