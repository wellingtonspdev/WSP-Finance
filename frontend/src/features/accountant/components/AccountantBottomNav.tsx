import { Home, Users, FileText, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, useLocation } from 'react-router-dom';

export function AccountantBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    // Determina a aba ativa basena-se no path da URL contendo as chaves numéricas ou literais
    const activeTab = location.pathname.includes('/clients')
        ? 'clients'
        : location.pathname.includes('/reports')
            ? 'reports'
            : location.pathname.includes('/profile')
                ? 'profile'
                : 'hub';

    const navItems = [
        { id: 'hub', icon: Home, label: 'Central', action: () => navigate('/accountant/hub') },
        { id: 'clients', icon: Users, label: 'Clientes', action: () => { } },
        { id: 'reports', icon: FileText, label: 'Relatórios', action: () => { } },
        { id: 'profile', icon: User, label: 'Perfil', action: () => { } },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#11051f]/95 backdrop-blur-xl border-t border-white/10 px-6 py-2 pb-6 z-50">
            <div className="max-w-md mx-auto flex items-center justify-between">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={item.action}
                            className={clsx(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive ? "text-[#1978e5]" : "text-slate-500 hover:text-[#1978e5]"
                            )}
                        >
                            <item.icon className={clsx("w-6 h-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-bold">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
