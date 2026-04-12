import { Home, Mail, Users, FileText, BarChart2, Settings, ShieldCheck, LogOut, Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../app/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/wsp_finance_sem_fundo.svg';

export function AccountantSidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'hub', icon: Home, label: 'Torre de Controle', action: () => navigate('/accountant/hub') },
        { id: 'invites', icon: Mail, label: 'Convites', action: () => navigate('/accountant/invites') },
        { id: 'inbox', icon: Inbox, label: 'Inbox de Aprovação', action: () => navigate('/accountant/hub'), hint: 'Selecione um cliente' },
        { id: 'docs', icon: FileText, label: 'Documentos', action: () => { }, disabled: true },
        { id: 'reports', icon: BarChart2, label: 'Relatórios', action: () => { }, disabled: true },
        { id: 'settings', icon: Settings, label: 'Configurações', action: () => { }, disabled: true },
    ];

    return (
        <aside className="hidden lg:flex w-72 flex-col bg-[#1a0b2e]/95 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0 shrink-0">
            {/* Logo Area */}
            <div className="p-8 flex justify-center">
                <img src={logo} alt="WSP Finance" className="h-16 w-auto object-contain drop-shadow-lg" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">

                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4 mt-8">
                    Menu do Contador
                </div>

                {navItems.map((item) => {
                    const isActive = location.pathname.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={item.disabled ? undefined : item.action}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                item.disabled && "!opacity-40 !cursor-not-allowed hover:!bg-transparent",
                                isActive && !item.disabled
                                    ? "bg-[#1978e5]/10 text-[#1978e5] font-medium border border-[#1978e5]/20 shadow-sm"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5", isActive && !item.disabled ? "text-[#1978e5]" : "text-slate-500 group-hover:text-white")} />
                            <span>{item.label}</span>
                            {item.disabled && (
                                <span className="ml-auto text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                                    Em breve
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Profile Card Footer */}
            <div className="p-4 border-t border-white/5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1978e5] to-blue-600 flex items-center justify-center text-white shadow-lg overflow-hidden font-bold shrink-0">
                        {user?.name.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[9px] text-blue-400 font-bold tracking-wider uppercase">Contador Sênior</span>
                        </div>
                    </div>
                    <button
                        onClick={() => logout()}
                        title="Sair do Sistema"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
