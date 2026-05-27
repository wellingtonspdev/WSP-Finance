import { Home, Mail, FileText, BarChart2, Settings, ShieldCheck, LogOut, Inbox, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../app/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/logo_WSP_Finance_sem_fundo.svg';
import { useUI } from '../../../shared/context/useUI';

interface AccountantSidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function AccountantSidebar({ isCollapsed = false, onToggle }: AccountantSidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobileMenuOpen, closeMobileMenu } = useUI();

    const handleNavigation = (path: string) => {
        navigate(path);
        closeMobileMenu();
    }

    const isItemActive = (id: string, pathname: string) => {
        if (!pathname.startsWith('/accountant/')) {
            return false;
        }
        if (id === 'inbox' && pathname.startsWith('/accountant/inbox')) {
            return true;
        }
        return pathname === `/accountant/${id}`;
    };

    const navItems = [
        { id: 'hub', icon: Home, label: 'Torre de Controle', action: () => handleNavigation('/accountant/hub') },
        { id: 'invites', icon: Mail, label: 'Convites', action: () => handleNavigation('/accountant/invites') },
        { 
            id: 'inbox', 
            icon: Inbox, 
            label: 'Inbox de Aprovação', 
            action: () => handleNavigation('/accountant/inbox')
        },
        { id: 'docs', icon: FileText, label: 'Documentos', action: () => { }, disabled: true },
        { id: 'reports', icon: BarChart2, label: 'Relatórios', action: () => { }, disabled: true },
        { id: 'settings', icon: Settings, label: 'Configurações', action: () => { }, disabled: true },
    ];

    return (
        <>
            {/* Overlay Mobile */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 flex-col bg-[#1a0b2e]/95 backdrop-blur-xl border-r border-white/5 h-screen shrink-0 transition-all duration-300 lg:relative lg:translate-x-0 flex",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed ? "w-72 lg:w-20" : "w-72"
            )}>
                {/* Botão de Colapso Desktop */}
                {onToggle && (
                    <button
                        onClick={onToggle}
                        aria-label={isCollapsed ? "Expandir menu lateral do contador" : "Recolher menu lateral do contador"}
                        aria-expanded={!isCollapsed}
                        className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all z-50 focus:outline-none focus:ring-2 focus:ring-[#1978e5]"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                )}

                {/* Fechar Mobile */}
                <button 
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white lg:hidden bg-white/5 rounded-lg"
                    onClick={closeMobileMenu}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Logo Area */}
                <div className={clsx("p-8 flex justify-center transition-all duration-300", isCollapsed && "lg:px-2")}>
                    <img src={logo} alt="WSP Finance" className={clsx("h-16 w-auto object-contain drop-shadow-lg", isCollapsed && "lg:hidden")} />
                    {isCollapsed && (
                        <div className="hidden lg:flex h-10 w-10 bg-gradient-to-tr from-[#1978e5] to-blue-600 rounded-xl items-center justify-center font-bold text-white shadow-lg shrink-0">W</div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">

                    <div className={clsx(
                        "text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 mt-8 transition-all duration-300",
                        isCollapsed ? "px-4 lg:px-0 lg:opacity-0 lg:invisible lg:h-0 lg:mt-4 lg:mb-0" : "px-4"
                    )}>
                        Menu do Contador
                    </div>

                    {navItems.map((item) => {
                        const isActive = isItemActive(item.id, location.pathname);
                        return (
                            <button
                                key={item.id}
                                onClick={item.disabled ? undefined : item.action}
                                disabled={item.disabled}
                                title={isCollapsed ? item.label : undefined}
                                aria-label={item.label}
                                className={clsx(
                                    "w-full flex items-center gap-3 py-3 rounded-xl transition-all duration-200 group",
                                    isCollapsed ? "px-4 lg:justify-center lg:px-0" : "px-4",
                                    item.disabled && "!opacity-40 !cursor-not-allowed hover:!bg-transparent",
                                    isActive && !item.disabled
                                        ? "bg-[#1978e5]/10 text-[#1978e5] font-medium border border-[#1978e5]/20 shadow-sm"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                                )}
                            >
                                <item.icon className={clsx("w-5 h-5 shrink-0", isActive && !item.disabled ? "text-[#1978e5]" : "text-slate-500 group-hover:text-white")} />
                                <span className={clsx("truncate", isCollapsed && "lg:hidden")}>{item.label}</span>
                                {item.disabled && (
                                    <span className={clsx(
                                        "ml-auto text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-medium shrink-0",
                                        isCollapsed && "lg:hidden"
                                    )}>
                                        Em breve
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Profile Card Footer */}
                <div className="p-4 border-t border-white/5">
                    <div className={clsx(
                        "bg-white/5 border border-white/10 rounded-xl flex items-center transition-all",
                        isCollapsed ? "p-3 gap-3 lg:flex-col lg:p-2 lg:gap-2" : "p-3 gap-3"
                    )}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1978e5] to-blue-600 flex items-center justify-center text-white shadow-lg overflow-hidden font-bold shrink-0">
                            {user?.name.charAt(0).toUpperCase() || 'C'}
                        </div>

                        <div className={clsx("overflow-hidden flex-1", isCollapsed && "lg:hidden")}>
                                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span className="text-[9px] text-blue-400 font-bold tracking-wider uppercase truncate">Contador Sênior</span>
                                </div>
                        </div>

                        <button
                            onClick={() => logout()}
                            title="Sair do Sistema"
                            aria-label="Sair do Sistema"
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
