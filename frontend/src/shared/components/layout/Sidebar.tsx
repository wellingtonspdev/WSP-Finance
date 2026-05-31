import { Home, Receipt, Plus, BarChart2, User, LogOut, ArrowLeftCircle, FileText, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../app/AuthProvider';
import { useUI } from '../../../shared/context/useUI';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/logo_WSP_Finance_sem_fundo.svg';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const { logout } = useAuth();
  const { openTransactionModal } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMembership } = useWorkspaceStore();

  const activeTab = location.pathname.includes('/transactions')
    ? 'extract'
    : location.pathname.includes('/team')
      ? 'team'
      : location.pathname.includes('/documents')
        ? 'documents'
        : location.pathname.includes('/analises')
          ? 'analytics'
          : location.pathname.includes('/telegram')
            ? 'telegram'
            : 'home';
  const isAccountant = activeMembership?.role === 'ACCOUNTANT';

  const navItems = [
    { id: 'home', icon: Home, label: 'Dashboard', action: () => navigate(`/${activeMembership?.id || ''}/dashboard`) },
    { id: 'extract', icon: Receipt, label: 'Extrato', action: () => navigate(`/${activeMembership?.id || ''}/transactions`) },
    { id: 'documents', icon: FileText, label: 'Documentos', action: () => navigate(`/${activeMembership?.id || ''}/documents`) },
    { id: 'team', icon: User, label: 'Equipe', action: () => navigate(`/${activeMembership?.id || ''}/team`) },
    { id: 'telegram', icon: MessageCircle, label: 'Telegram', action: () => navigate(`/${activeMembership?.id || ''}/telegram`) },
    { id: 'analytics', icon: BarChart2, label: 'Análises', action: () => navigate(`/${activeMembership?.id || ''}/analises`) },
  ];

  return (
    <aside className={clsx(
      "hidden lg:flex flex-col bg-[#1a0b2e]/95 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0 transition-all duration-300 ease-in-out relative group/sidebar z-20",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Toggle Button */}
      {onToggle && (
        <button
          onClick={onToggle}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!isCollapsed}
          className="absolute -right-4 top-8 bg-[#1a0b2e] border border-white/10 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors z-50 shadow-lg hidden lg:flex items-center justify-center"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Logo Area */}
      <div className={clsx("p-8 flex justify-center transition-all duration-300", isCollapsed ? "px-2" : "px-8")}>
        <img src={logo} alt="WSP Finance" className={clsx("h-24 w-auto object-contain drop-shadow-lg transition-all duration-300", isCollapsed && "scale-50")} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
        {isAccountant && (
          <button
            onClick={() => navigate('/accountant/hub')}
            className={clsx(
              "mb-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold transition-all flex items-center justify-center group hover:bg-blue-500/20 mx-auto",
              isCollapsed ? "w-12 px-0" : "w-full gap-2"
            )}
            title={isCollapsed ? "Voltar para a Central" : undefined}
          >
            <ArrowLeftCircle className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span>Voltar para a Central</span>}
          </button>
        )}

        {/* Botão de Ação Principal */}
        <button
          onClick={openTransactionModal}
          className={clsx(
            "mb-6 py-3 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center group mx-auto",
            isCollapsed ? "w-12 px-0" : "w-full gap-2"
          )}
          title={isCollapsed ? "Nova Transação" : undefined}
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          {!isCollapsed && <span>Nova Transação</span>}
        </button>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={clsx(
                "flex items-center rounded-xl transition-all duration-200 group mx-auto",
                isCollapsed ? "w-12 h-12 justify-center" : "w-full gap-3 px-4 py-3",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={clsx("w-5 h-5 shrink-0", isActive ? "text-[#3B82F6]" : "text-slate-500 group-hover:text-white")} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={logout}
          className={clsx(
            "flex items-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors mx-auto",
            isCollapsed ? "w-12 h-12 justify-center" : "w-full gap-3 px-4 py-3"
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
