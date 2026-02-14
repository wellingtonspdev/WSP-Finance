import { useAuth } from '../../../app/AuthProvider';
import { useWorkspace } from '../../../features/workspaces/context/WorkspaceProvider';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';

export function Header() {
  const { user } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();

  return (
    <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-transparent z-10 relative">
      <div className="flex flex-col">
        <span className="text-slate-400 text-sm font-medium">Bom dia,</span>
        <h1 className="text-2xl font-bold text-white truncate max-w-[150px]">
          {user?.name.split(' ')[0]}
        </h1>
      </div>

      {/* Workspace Selector (Pill) */}
      <div className="flex bg-white/10 rounded-full p-1 mx-2 backdrop-blur-md border border-white/5">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => switchWorkspace(ws.id)}
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

      <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors group">
        <Bell className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a0b2e]"></span>
      </button>
    </header>
  );
}