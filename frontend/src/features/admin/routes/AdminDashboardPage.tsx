import { useAuth } from '../../../app/AuthProvider';

export function AdminDashboardPage() {
    const { user } = useAuth();

    return (
        <div className="flex h-screen items-center justify-center bg-[#11051f] text-white">
            <div className="flex flex-col items-center gap-4 text-center">
                <h1 className="text-3xl font-bold text-primary">Painel Administrativo</h1>
                <p className="text-slate-400">
                    Bem-vindo, {user?.name || 'Platform Admin'}.
                </p>
                <div className="mt-8 rounded-lg bg-white/5 p-6 border border-white/10 w-full max-w-md">
                    <p className="text-sm text-slate-300">
                        O painel de backoffice está em desenvolvimento. Em breve você terá acesso a métricas globais e gestão de workspaces.
                    </p>
                </div>
            </div>
        </div>
    );
}
