import { useEffect } from 'react';
import { useParams, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAuth } from '../../../app/AuthProvider';

export function WorkspaceGuard() {
    const { workspaceId: workspaceIdParam } = useParams<{ workspaceId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        activeWorkspaceId,
        setActiveWorkspaceId,
        setMemberships,
        isLoadingMetadata,
    } = useWorkspaceStore();

    useEffect(() => {
        // 1. Ao montar ou o user mudar, garante que as memberships do Auth(usuário) passem pro store do Workspace
        if (user?.memberships) {
            setMemberships(user.memberships as any); // Type cast temporário até ajustar interface unificada
        }
    }, [user, setMemberships]);

    useEffect(() => {
        // 2. Se a URL tem um parâmetro que difere do Zustand, atualiza o Zustand (a URL é a fonte da verdade)
        const paramId = workspaceIdParam ? parseInt(workspaceIdParam, 10) : null;

        if (paramId && !isNaN(paramId)) {
            if (activeWorkspaceId !== paramId) {
                // O F5 ativou com um param ID. Vamos forçar ao Zustand.
                setActiveWorkspaceId(paramId);
            }
        }
    }, [workspaceIdParam, activeWorkspaceId, setActiveWorkspaceId]);

    // Handle URL raiz (/) e Bloqueio Hard-Kill de Contadores
    useEffect(() => {
        if (user) {
            // Se o usuário é apenas contador
            if (user.type === 'ACCOUNTANT') {
                // Bloqueio Hard-Kill: Se ele está tentando acessar QUALQUER workspace via paramId ou não tem param
                if (workspaceIdParam) {
                    const targetMembership = user.memberships?.find(m => (m as any).workspaceId?.toString() === workspaceIdParam || m.id?.toString() === workspaceIdParam);
                    if (targetMembership?.type === 'PERSONAL') {
                        // Contador não pode acessar conta pessoal (mesmo a dele). Força devolução para a Torre.
                        navigate(`/accountant/hub`, { replace: true });
                        return;
                    }
                } else if (!workspaceIdParam) {
                    // Está na raiz (/)
                    navigate(`/accountant/hub`, { replace: true });
                    return;
                }
            } else {
                // Usuário Normal (CLIENT) no /
                if (!workspaceIdParam && user.memberships?.length > 0) {
                    const targetId = activeWorkspaceId || user.memberships[0].id || (user.memberships[0] as any).workspaceId;
                    navigate(`/${targetId}/dashboard`, { replace: true });
                }
            }
        }
    }, [workspaceIdParam, activeWorkspaceId, user, navigate]);


    // Estado de carregamento para evitar 'flashes'
    if (isLoadingMetadata || !workspaceIdParam) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#11051f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm font-semibold text-slate-300 tracking-wider uppercase">Carregando Contexto...</p>
                </div>
            </div>
        );
    }

    // Se o param for puramente NaN (alguém digitou /abc/dashboard)
    if (isNaN(parseInt(workspaceIdParam, 10))) {
        // Pode direcionar para um 404/Page Not Found. Aqui mandaremos de volta pra raiz para recuperar o contexto.
        return <Navigate to="/" replace />;
    }

    return (
        // Outlet renderiza as rotas filhas (dashboard, transações, etc) desse workspace
        <Outlet />
    );
}
