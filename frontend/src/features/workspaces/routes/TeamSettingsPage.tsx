import { useEffect, useState } from 'react';
import { Users, UserPlus, Send, Trash2, ShieldCheck, Eye, Crown, Calculator, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { useTeamSettings } from '../hooks/useTeamSettings';
import { CertificateUploadSection } from '../components/CertificateUploadSection';

const roleConfig: Record<string, { label: string; icon: typeof Crown; colorClass: string }> = {
    OWNER: { label: 'Proprietário', icon: Crown, colorClass: 'text-amber-400' },
    EDITOR: { label: 'Editor', icon: ShieldCheck, colorClass: 'text-blue-400' },
    VIEWER: { label: 'Visualizador', icon: Eye, colorClass: 'text-slate-400' },
    ACCOUNTANT: { label: 'Contador', icon: Calculator, colorClass: 'text-emerald-400' },
};

const inviteStatusConfig: Record<string, { label: string; icon: typeof Clock; bgClass: string; textClass: string }> = {
    PENDING: { label: 'Pendente', icon: Clock, bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
    ACCEPTED: { label: 'Aceito', icon: CheckCircle2, bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    EXPIRED: { label: 'Expirado', icon: XCircle, bgClass: 'bg-slate-500/10', textClass: 'text-slate-400' },
    REVOKED: { label: 'Revogado', icon: Ban, bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
    REJECTED: { label: 'Rejeitado', icon: XCircle, bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
};

export function TeamSettingsPage() {
    const { activeMembership } = useWorkspaceStore();
    const wsId = activeMembership?.id || 0;
    const isOwner = activeMembership?.role === 'OWNER';

    const {
        members, sentInvites,
        isLoading, error, successMsg,
        listMembers, listSentInvites, removeMember, sendInvite, clearMessages
    } = useTeamSettings(wsId);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('ACCOUNTANT');
    const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

    useEffect(() => {
        if (wsId) {
            listMembers();
            listSentInvites();
        }
    }, [wsId, listMembers, listSentInvites]);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        const ok = await sendInvite(inviteEmail.trim(), inviteRole);
        if (ok) {
            setInviteEmail('');
            setInviteRole('ACCOUNTANT');
        }
    };

    const handleRemove = async (userId: number) => {
        await removeMember(userId);
        setConfirmRemove(null);
    };

    return (
        <AppLayout>
            <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 lg:pb-8 px-4 md:px-0">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Users className="w-7 h-7 text-[#D946EF]" />
                            Minha Equipe
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Gerencie os membros e convites do workspace <strong className="text-white">{activeMembership?.name}</strong>.
                        </p>
                    </div>
                </header>

                {/* Feedback Messages */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center justify-between">
                        {error}
                        <button onClick={clearMessages} className="text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center justify-between">
                        {successMsg}
                        <button onClick={clearMessages} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold">✕</button>
                    </div>
                )}

                {isOwner && wsId > 0 && (
                    <div className="mb-8">
                        <CertificateUploadSection workspaceId={wsId} />
                    </div>
                )}

                {/* Invite Form (OWNER only) */}
                {isOwner && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-[#D946EF] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Convidar Novo Membro
                        </h2>
                        <form onSubmit={handleSendInvite} className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="email@cliente.com"
                                    required
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D946EF] transition-colors"
                                />
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D946EF] transition-colors min-w-[160px]"
                                >
                                    <option value="ACCOUNTANT" className="bg-[#11051f]">Contador</option>
                                    <option value="VIEWER" className="bg-[#11051f]">Visualizador</option>
                                    <option value="EDITOR" className="bg-[#11051f]">Editor</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-bold text-sm shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                >
                                    <Send className="w-4 h-4" />
                                    Enviar Convite
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* Members Table */}
                <section className="mb-8">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Membros Atuais ({members.length})
                    </h2>

                    {isLoading && members.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-[#D946EF] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {members.map(member => {
                            const config = roleConfig[member.role] || roleConfig.VIEWER;
                            const RoleIcon = config.icon;

                            return (
                                <div key={member.userId} className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1a0b2e] to-[#D946EF]/20 flex items-center justify-center border border-white/10 text-white font-bold shrink-0">
                                            {member.user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{member.user.name}</h3>
                                            <p className="text-xs text-slate-500">{member.user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${config.colorClass}`}>
                                            <RoleIcon className="w-3.5 h-3.5" />
                                            {config.label}
                                        </span>

                                        {isOwner && member.role !== 'OWNER' && (
                                            confirmRemove === member.userId ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleRemove(member.userId)}
                                                        disabled={isLoading}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRemove(null)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmRemove(member.userId)}
                                                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    title="Revogar acesso"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Invite History */}
                {sentInvites.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                            Histórico de Convites ({sentInvites.length})
                        </h2>
                        <div className="space-y-2">
                            {sentInvites.map(invite => {
                                const sConfig = inviteStatusConfig[invite.status] || inviteStatusConfig.PENDING;
                                const SIcon = sConfig.icon;
                                return (
                                    <div key={invite.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm text-slate-300 font-medium">{invite.email}</div>
                                            <span className="text-[10px] text-slate-600 uppercase font-bold">{invite.role}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sConfig.bgClass} ${sConfig.textClass}`}>
                                            <SIcon className="w-3 h-3" />
                                            {sConfig.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
