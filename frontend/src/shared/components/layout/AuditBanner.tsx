import { AlertTriangle } from 'lucide-react';

export function AuditBanner() {
    return (
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 shadow-sm z-50 flex items-center justify-center gap-2">
            <AlertTriangle className="text-yellow-500 w-4 h-4 shrink-0" />
            <span className="text-yellow-500 text-xs font-medium uppercase tracking-widest">
                Você está em Modo Auditoria (Acesso Restrito)
            </span>
        </div>
    );
}
