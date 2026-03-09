import { useAuth } from '../../../app/AuthProvider';
import { Bell, Settings, Landmark, LogOut } from 'lucide-react';

export function AccountantMobileHeader() {
    const { user, logout } = useAuth();

    return (
        <header className="flex lg:hidden sticky top-0 z-30 bg-[#11051f]/80 backdrop-blur-md border-b border-white/10 px-5 py-4 items-center justify-between mb-6 w-full">
            <div className="flex items-center gap-3 w-[70%]">
                <div className="w-10 h-10 rounded-xl bg-[#1978e5] flex items-center justify-center border border-[#1978e5]/30 shadow-[0_0_15px_rgba(25,120,229,0.4)] shrink-0">
                    <Landmark className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Dashboard WSP</p>
                    <h1 className="text-sm md:text-base font-bold text-white tracking-tight leading-none truncate w-full">Olá, {user?.name.split(' ')[0]}</h1>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <button className="relative p-2 rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                    <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-[#11051f]"></div>
                    <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <button
                    onClick={() => logout()}
                    className="p-2 rounded-full text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors ml-1"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
