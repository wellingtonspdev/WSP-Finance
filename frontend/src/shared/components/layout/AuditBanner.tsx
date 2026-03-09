import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuditBanner() {
    const navigate = useNavigate();
    const location = useLocation();

    // Detecta se estamos dentro de um workspace de cliente (/:workspaceId/*)
    const pathParts = location.pathname.split('/');
    const isInsideClientWorkspace = pathParts[1] && !isNaN(parseInt(pathParts[1], 10));

    return (
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 shadow-sm z-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 justify-center">
                <AlertTriangle className="text-yellow-500 w-4 h-4 shrink-0" />
                <span className="text-yellow-500 text-xs font-medium uppercase tracking-widest">
                    Você está em Modo Auditoria (Acesso Restrito)
                </span>
            </div>

            {isInsideClientWorkspace && (
                <button
                    onClick={() => navigate('/accountant/hub')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold transition-all shrink-0"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Voltar ao Hub</span>
                    <span className="sm:hidden">Hub</span>
                </button>
            )}
        </div>
    );
}
