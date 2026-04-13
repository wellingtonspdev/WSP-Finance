import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export function ForbiddenView() {
    const navigate = useNavigate();
    const { setActiveWorkspaceId } = useWorkspaceStore((state) => ({
        setActiveWorkspaceId: state.setActiveWorkspaceId
    }));

    const handleGoBack = () => {
        // Redefine pro Pessoal para fugir do Loop infinito. 
        // Isso volta o usuario pra segurança se estiver travado num link com 403.
        setActiveWorkspaceId(null);
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effect Sutil */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Card Principal */}
                <div className="bg-[#171717] border border-[#262626] rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden">

                    {/* Badge de Erro no Topo (Design System) */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500/10 border-x border-b border-red-500/20 px-6 py-1.5 rounded-b-xl">
                        <span className="text-red-400 text-[10px] font-bold tracking-[0.2em] uppercase">Erro 403 / Proibido</span>
                    </div>

                    <div className="mt-6 mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-[#262626] flex items-center justify-center shadow-inner">
                            <Lock className="w-10 h-10 text-slate-500" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">Acesso Restrito</h1>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        Você não possui as permissões necessárias para acessar as informações deste Workspace.
                        Contate o administrador da empresa para solicitar uma <strong className="text-slate-200">Delegação de Nível Contábil</strong>.
                    </p>

                    <button
                        onClick={handleGoBack}
                        className="w-full py-4 rounded-full bg-[#1978e5] hover:bg-[#1461bd] text-white text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#1978e5]/20 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Voltar ao Pátio Seguro
                    </button>
                </div>

                {/* Brand Footer */}
                <div className="mt-8 text-center flex flex-col items-center gap-2 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#1978e5] to-[#0ea5e9]"></div>
                        <span className="text-xs font-bold text-white tracking-widest uppercase">WSP Finance</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Governança Auditável</span>
                </div>
            </div>
        </div>
    );
}
