import { MessageCircle, Clock } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';

export function TelegramConfigPage() {
    return (
        <AppLayout>
            <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 lg:pb-8 px-4 md:px-0">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <MessageCircle className="w-7 h-7 text-[#D946EF]" />
                            Telegram
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Gerencie sua integração pessoal com o Telegram.
                        </p>
                    </div>
                </header>

                {/* Em Breve State */}
                <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 bg-[#D946EF]/20 rounded-full flex items-center justify-center mb-6">
                        <Clock className="w-8 h-8 text-[#D946EF]" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">
                        Integração com Telegram em Breve!
                    </h2>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                        Estamos trabalhando em uma nova e aprimorada experiência de integração com o Telegram.
                        Em breve você poderá gerenciar suas finanças diretamente pelo chat!
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
