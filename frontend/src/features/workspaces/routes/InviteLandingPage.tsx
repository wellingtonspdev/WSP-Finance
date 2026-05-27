import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../../app/AuthProvider';
import { useInvites } from '../hooks/useInvites';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { getWorkspaces } from '../api/getWorkspaces';

export function InviteLandingPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { acceptInvite, isLoading: isAccepting, error } = useInvites(0); // WorkspaceID fake p/ chamadas globais
    const setMemberships = useWorkspaceStore((state: ReturnType<typeof useWorkspaceStore.getState>) => state.setMemberships);

    const [hasProcessed, setHasProcessed] = useState(false);
    const processingRef = useRef(false);

    useEffect(() => {
        // 1. Aguarda a verificação de sessão terminar
        if (isAuthLoading) return;

        // 2. Se não estiver logado, guarda a intenção e manda pro Login
        if (!isAuthenticated) {
            if (token) {
                sessionStorage.setItem('pending_invite_token', token);
            }
            navigate('/login?redirect=invite');
            return;
        }

        // 3. Se logado mas já processou (Prevenção de double call no React StrictMode)
        if (hasProcessed || processingRef.current || !token) return;

        // 4. Se logado e tem token, executa o Handshake Assíncrono
        const processInvite = async () => {
            processingRef.current = true;
            setHasProcessed(true);

            const sessionPendingToken = sessionStorage.getItem('pending_invite_token');
            const tokenToUse = token || sessionPendingToken;

            if (!tokenToUse) return;

            const result = await acceptInvite(tokenToUse);

            if (result) {
                // Limpa a pendência
                sessionStorage.removeItem('pending_invite_token');

                // Sincroniza o Payload do Zustand buscando as Memberships Atualizadas! 
                // Zero Timeout: O Contador vê o novo card instantaneamente no seletor.
                try {
                    const updatedWorkspaces = await getWorkspaces();
                    setMemberships(updatedWorkspaces as unknown as ReturnType<typeof useWorkspaceStore.getState>['memberships']);
                    // O Redirecionamento Final joga ele direto pro Dashboard do cliente (Onde o ThemeWrapper fará a tela ficar Azul!)
                    navigate(`/${result.workspaceId}/dashboard`, { replace: true });
                } catch (err) {
                    console.error("Failed to refresh memberships", err);
                    // Fallback vai pra raiz
                    navigate('/', { replace: true });
                }
            }
        };

        processInvite();
    }, [isAuthenticated, isAuthLoading, token, navigate, acceptInvite, setMemberships, hasProcessed]); // Removed dependencies to avoid infinite loops on state changes

    if (isAuthLoading || isAccepting || (!error && !hasProcessed)) {
        return (
            <div className="min-h-screen bg-[#11051F] flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-white mb-2">Processando Convite Seguro...</h1>
                    <p className="text-slate-400">Verificando assinaturas e estabelecendo conexão.</p>
                </div>
            </div>
        );
    }

    // Se chegou aqui foi porque deu erro de e-mail ou expiração no Handshake.
    return (
        <div className="min-h-screen bg-[#11051F] flex items-center justify-center p-4">
            <div className="bg-red-500/10 border border-red-500/30 w-full max-w-lg rounded-2xl p-8 text-center">
                <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-4">Acesso Bloqueado pelo Cofre</h1>
                <p className="text-red-300 mb-8 leading-relaxed">
                    {error || "O convite é inválido, expirou ou o e-mail logado não corresponde ao destinatário definido pelo dono da empresa."}
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                >
                    Voltar ao Início
                </button>
            </div>
        </div>
    );
}
