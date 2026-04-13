import { useEffect } from 'react';
import { Mail, Clock, CheckCircle2, XCircle, Ban, Building2, UserCheck } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { useInvites } from '../../workspaces/hooks/useInvites';
import { AccountantMobileHeader } from '../components/AccountantMobileHeader';
import type { ReceivedInvite } from '../../workspaces/hooks/useInvites';

const statusConfig: Record<string, { label: string; icon: typeof Clock; bgClass: string; textClass: string; borderClass: string }> = {
    PENDING: { label: 'Pendente', icon: Clock, bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/20' },
    ACCEPTED: { label: 'Aceito', icon: CheckCircle2, bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/20' },
    EXPIRED: { label: 'Expirado', icon: XCircle, bgClass: 'bg-slate-500/10', textClass: 'text-slate-400', borderClass: 'border-slate-500/20' },
    REVOKED: { label: 'Revogado', icon: Ban, bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/20' },
    REJECTED: { label: 'Rejeitado', icon: XCircle, bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/20' },
};

function InviteCard({ invite, onAccept, onReject, isLoading }: {
    invite: ReceivedInvite;
    onAccept: () => void;
    onReject: () => void;
    isLoading: boolean;
}) {
    const config = statusConfig[invite.status] || statusConfig.PENDING;
    const StatusIcon = config.icon;
    const isPending = invite.status === 'PENDING';

    return (
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Info do Workspace */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1978e5]/20 to-blue-600/10 border border-[#1978e5]/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-[#1978e5]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{invite.workspace.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">Convidado por</span>
                            <span className="text-xs text-slate-300 font-medium">{invite.inviter.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                {invite.role}
                            </span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500">
                                {new Date(invite.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status + Ações */}
                <div className="flex items-center gap-3">
                    {/* Badge de Status */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                    </span>

                    {/* Botões (apenas se PENDING) */}
                    {isPending && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onAccept}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Aceitar
                            </button>
                            <button
                                onClick={onReject}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Rejeitar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function InviteInboxPage() {
    const { invites, pendingCount, listReceived, acceptInvite, rejectInvite, isLoading } = useInvites();

    useEffect(() => {
        listReceived();
    }, [listReceived]);

    const handleAccept = async (invite: ReceivedInvite) => {
        const result = await acceptInvite(invite.token);
        if (result) {
            await listReceived(); // Refresh
        }
    };

    const handleReject = async (invite: ReceivedInvite) => {
        await rejectInvite(invite.id);
    };

    const pendingInvites = invites.filter(i => i.status === 'PENDING');
    const otherInvites = invites.filter(i => i.status !== 'PENDING');

    return (
        <AppLayout>
            <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 lg:pb-8">

                {/* Mobile Header */}
                <AccountantMobileHeader />

                {/* Page Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4 md:px-0">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Mail className="w-7 h-7 text-[#1978e5]" />
                            Central de Convites
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Gerencie os convites recebidos para auditar workspaces de clientes.
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="self-start md:self-auto px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">
                            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                    )}
                </header>

                {/* Loading */}
                {isLoading && invites.length === 0 && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#1978e5] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && invites.length === 0 && (
                    <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-12 text-center">
                        <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Nenhum convite recebido</h3>
                        <p className="text-sm text-slate-400 max-w-md mx-auto">
                            Quando um cliente convidar você para auditar seu workspace, o convite aparecerá aqui.
                        </p>
                    </div>
                )}

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                    <section className="mb-8 px-4 md:px-0">
                        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Aguardando Resposta ({pendingInvites.length})
                        </h2>
                        <div className="space-y-3">
                            {pendingInvites.map(invite => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    onAccept={() => handleAccept(invite)}
                                    onReject={() => handleReject(invite)}
                                    isLoading={isLoading}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Historical Invites */}
                {otherInvites.length > 0 && (
                    <section className="px-4 md:px-0">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                            Histórico ({otherInvites.length})
                        </h2>
                        <div className="space-y-3">
                            {otherInvites.map(invite => (
                                <InviteCard
                                    key={invite.id}
                                    invite={invite}
                                    onAccept={() => { }}
                                    onReject={() => { }}
                                    isLoading={false}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
