import { Home, Receipt, Plus, BarChart2, User, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../app/AuthProvider';
import logo from '../../../assets/wsp_finance_sem_fundo.svg';

export function Sidebar() {
  const { logout } = useAuth();
  const activeTab = 'home'; // TODO: Usar useLocation do router

  const navItems = [
    { id: 'home', icon: Home, label: 'Dashboard' },
    { id: 'extract', icon: Receipt, label: 'Extrato' },
    { id: 'analytics', icon: BarChart2, label: 'Análises' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-col bg-[#1a0b2e]/95 backdrop-blur-xl border-r border-white/5 h-screen sticky top-0">
      {/* Logo Area */}
      <div className="p-8 flex justify-center">
        <img src={logo} alt="WSP Finance" className="h-24 w-auto object-contain drop-shadow-lg" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {/* Botão de Ação Principal */}
        <button className="w-full mb-6 py-3 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 group">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Nova Transação
        </button>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
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