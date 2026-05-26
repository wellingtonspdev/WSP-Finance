import { Home, Receipt, Plus, BarChart2, User, LogOut, ArrowLeftCircle, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../app/AuthProvider';
import { useUI } from '../../../shared/context/UIProvider';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/logo_WSP_Finance_sem_fundo.svg';

export function Sidebar() {
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
          : 'home';
  const isAccountant = activeMembership?.role === 'ACCOUNTANT';

  const navItems = [
    { id: 'home', icon: Home, label: 'Dashboard', action: () => navigate(`/${activeMembership?.id || ''}/dashboard`) },
    { id: 'extract', icon: Receipt, label: 'Extrato', action: () => navigate(`/${activeMembership?.id || ''}/transactions`) },
    { id: 'documents', icon: FileText, label: 'Documentos', action: () => navigate(`/${activeMembership?.id || ''}/documents`) },
    { id: 'team', icon: User, label: 'Equipe', action: () => navigate(`/${activeMembership?.id || ''}/team`) },
    { id: 'analytics', icon: BarChart2, label: 'Análises', action: () => navigate(`/${activeMembership?.id || ''}/analises`) },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-col bg-[#1a0b2e]/95 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0">
      {/* Logo Area */}
      <div className="p-8 flex justify-center">
        <img src={logo} alt="WSP Finance" className="h-24 w-auto object-contain drop-shadow-lg" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {isAccountant && (
          <button
            onClick={() => navigate('/accountant/hub')}
            className="w-full mb-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold transition-all flex items-center justify-center gap-2 group hover:bg-blue-500/20"
          >
            <ArrowLeftCircle className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Voltar para a Central
          </button>
        )}

        {/* Botão de Ação Principal */}
        <button
          onClick={openTransactionModal}
          className="w-full mb-6 py-3 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Nova Transação
        </button>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={clsx("w-5 h-5", isActive ? "text-[#3B82F6]" : "text-slate-500 group-hover:text-white")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
