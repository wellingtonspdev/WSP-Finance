import { Home, Mail, Users, FileText, User, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, useLocation } from 'react-router-dom';

export function AccountantBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    // Detecta se estamos dentro de um workspace de cliente (/:workspaceId/*)
    const pathParts = location.pathname.split('/');
    const isInsideClientWorkspace = pathParts[1] && !isNaN(parseInt(pathParts[1], 10));

    // Determina a aba ativa basena-se no path da URL contendo as chaves numéricas ou literais
    const activeTab = location.pathname.includes('/invites')
        ? 'invites'
        : location.pathname.includes('/clients')
            ? 'clients'
            : location.pathname.includes('/reports')
                ? 'reports'
                : location.pathname.includes('/profile')
                    ? 'profile'
                    : 'hub';

    const navItems = [
        {
            id: 'hub',
            icon: isInsideClientWorkspace ? ArrowLeft : Home,
            label: isInsideClientWorkspace ? '← Hub' : 'Central',
            action: () => navigate('/accountant/hub'),
            highlight: isInsideClientWorkspace,
        },
        { id: 'invites', icon: Mail, label: 'Convites', action: () => navigate('/accountant/invites') },
        { id: 'clients', icon: Users, label: 'Clientes', action: () => { }, disabled: true },
        { id: 'reports', icon: FileText, label: 'Relatórios', action: () => { }, disabled: true },
        { id: 'profile', icon: User, label: 'Perfil', action: () => { }, disabled: true },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#11051f]/95 backdrop-blur-xl border-t border-white/10 px-6 py-2 pb-6 z-50">
            <div className="max-w-md mx-auto flex items-center justify-between">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={item.disabled ? undefined : item.action}
                            className={clsx(
                                "flex flex-col items-center gap-1 transition-colors",
                                item.disabled && "opacity-30 cursor-not-allowed",
                                item.highlight && "text-yellow-400",
                                !item.highlight && isActive && !item.disabled ? "text-[#1978e5]" : "",
                                !item.highlight && !isActive && !item.disabled && "text-slate-500 hover:text-[#1978e5]"
                            )}
                        >
                            <item.icon className={clsx("w-6 h-6", isActive && !item.disabled && !item.highlight && "fill-current")} />
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
