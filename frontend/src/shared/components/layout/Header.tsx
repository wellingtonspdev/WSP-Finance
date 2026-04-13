import { useAuth } from '../../../app/AuthProvider';
import { useWorkspace } from '../../../features/workspaces/context/WorkspaceProvider';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';

export function Header() {
  const { user } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboardRoute = location.pathname.includes('/dashboard');

  // Hard-Kill: Contadores nunca vêem o seletor, blindando o contexto cruzado.
  const shouldShowWorkspaceSelector = user?.type !== 'ACCOUNTANT' && (isDashboardRoute || location.pathname === '/' || location.pathname.split('/').length <= 2);

  const handleWorkspaceSwitch = (workspaceId: number) => {
    switchWorkspace(workspaceId);

    // Extract route suffix (e.g., 'dashboard' or 'transactions') to maintain the same view
    const segments = location.pathname.split('/').filter(Boolean);
    const suffix = segments.length > 1 ? segments.slice(1).join('/') : 'dashboard';

    // Explicitly navigate so useParams() hooks reload active data
    navigate(`/${workspaceId}/${suffix}`);
  };

  return (
    <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-transparent z-10 relative">
      <div className="flex flex-col">
        <span className="text-slate-400 text-sm font-medium">Bom dia,</span>
        <h1 className="text-2xl font-bold text-white truncate max-w-[150px]">
          {user?.name.split(' ')[0]}
        </h1>
      </div>

      {/* Workspace Selector (Pill) Condicional e Otimizado */}
      {shouldShowWorkspaceSelector && workspaces.length > 0 && (
        <div className="flex bg-white/10 rounded-full p-1 mx-2 backdrop-blur-md border border-white/5 overflow-x-auto no-scrollbar max-w-[50%]">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleWorkspaceSwitch(ws.id)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200",
                activeWorkspace?.id === ws.id
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {ws.type === 'PERSONAL' ? 'Pessoal' : 'Empresa'}
            </button>
          ))}
        </div>
      )}

      {/* Ícone de Gestão de Time (TeamManagement) só no Dashboard Owner */}
      {shouldShowWorkspaceSelector && activeWorkspace?.type === 'BUSINESS' && (
        <button
          onClick={() => document.getElementById('team-management-section')?.scrollIntoView({ behavior: 'smooth' })}
          title="Gestão de Delegação (Contadores)"
          className="relative px-2 py-2 rounded-full hover:bg-white/10 transition-colors mr-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </button>
      )}

      <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors group">
        <Bell className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a0b2e]"></span>
      </button>
    </header>
  );
}