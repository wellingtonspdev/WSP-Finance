import { useState } from 'react';
import { X, Send, UserPlus, Building2, CheckCircle2 } from 'lucide-react';
import { useInvites } from '../../workspaces/hooks/useInvites';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';

interface InviteClientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteClientModal({ isOpen, onClose }: InviteClientModalProps) {
    const { memberships } = useWorkspaceStore();
    const [email, setEmail] = useState('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    const [sent, setSent] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    // Filtra workspaces onde o user tem uma role que permite convidar (OWNER)
    const ownedWorkspaces = memberships.filter(m => m.role === 'OWNER');

    const { createInvite, isLoading, error } = useInvites(selectedWorkspaceId || undefined);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !selectedWorkspaceId) return;

        const result = await createInvite({ email: email.trim(), role: 'VIEWER' });
        if (result) {
            const link = `${window.location.origin}/invite/${result.token}`;
            setInviteLink(link);
            setSent(true);
        }
    };

    const handleClose = () => {
        setEmail('');
        setSelectedWorkspaceId(null);
        setSent(false);
        setInviteLink('');
        onClose();
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-[#1a0b2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1978e5]/10 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#1978e5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Convidar Cliente</h2>
                            <p className="text-xs text-slate-500">Envie um convite para vincular um cliente ao workspace</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    {!sent ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Workspace Selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                    Workspace de Origem
                                </label>
                                {ownedWorkspaces.length > 0 ? (
                                    <div className="space-y-2">
                                        {ownedWorkspaces.map(ws => (
                                            <button
                                                key={ws.id}
                                                type="button"
                                                onClick={() => setSelectedWorkspaceId(ws.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedWorkspaceId === ws.id
                                                        ? 'bg-[#1978e5]/10 border-[#1978e5]/30 text-white'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <Building2 className="w-5 h-5 shrink-0" />
                                                <span className="text-sm font-medium truncate">{ws.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                                        Você não possui workspaces como OWNER. Só o proprietário de um workspace pode enviar convites.
                                    </div>
                                )}
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                    Email do Cliente
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="email@cliente.com"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1978e5] transition-colors"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !selectedWorkspaceId || !email.trim()}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1978e5] to-blue-600 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {isLoading ? 'Enviando...' : 'Enviar Convite'}
                            </button>
                        </form>
                    ) : (
                        /* Success State */
                        <div className="text-center py-4 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Convite Enviado!</h3>
                                <p className="text-sm text-slate-400 mt-1">O cliente pode aceitar pelo link abaixo:</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inviteLink}
                                    readOnly
                                    className="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none truncate"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-1.5 rounded-lg bg-[#1978e5]/10 text-[#1978e5] text-xs font-bold hover:bg-[#1978e5]/20 transition-all whitespace-nowrap"
                                >
                                    Copiar
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
