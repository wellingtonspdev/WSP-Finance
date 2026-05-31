import { FormEvent, useEffect, useState } from 'react';
import { MessageCircle, Link2, Unlink, Copy, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { useTelegramConfig } from '../hooks/useTelegramConfig';

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; bgClass: string; textClass: string }> = {
    ACTIVE: { label: 'Ativo', icon: CheckCircle2, bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    REVOKED: { label: 'Revogado', icon: XCircle, bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
};

export function TelegramConfigPage() {
    const { activeMembership } = useWorkspaceStore();
    const canEdit = activeMembership?.role === 'OWNER' || activeMembership?.role === 'EDITOR';

    const {
        link, generatedLink, isLoading, error, successMsg, setSuccessMsg,
        loadStatus, createLink, revokeLink, clearMessages, clearGeneratedLink,
    } = useTelegramConfig();

    const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [wasPending, setWasPending] = useState(false);

    // Carrega status inicial
    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    // Polling contínuo enquanto aguarda o pareamento do Telegram
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (generatedLink && link?.status !== 'ACTIVE') {
            interval = setInterval(() => {
                loadStatus();
            }, 3000); // Checa a cada 3 segundos
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [generatedLink, link?.status, loadStatus]);

    // Reage quando o vínculo for ativado
    useEffect(() => {
        if (generatedLink && link?.status !== 'ACTIVE') {
            setWasPending(true);
        } else if (wasPending && link?.status === 'ACTIVE') {
            clearGeneratedLink();
            setSuccessMsg('Sua conta do WSP Finance foi conectada com sucesso ao Telegram!');
            setWasPending(false);
        }
    }, [link?.status, generatedLink, wasPending, clearGeneratedLink, setSuccessMsg]);

    const activeLink = link?.status === 'ACTIVE' ? link : null;

    const handleGenerate = async (e: FormEvent) => {
        e.preventDefault();
        await createLink({});
    };

    const handleRevoke = async (id: string) => {
        await revokeLink(id);
        setConfirmRevoke(null);
    };

    const handleCopy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback silencioso
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 lg:pb-8 px-4 md:px-0">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <MessageCircle className="w-7 h-7 text-[#D946EF]" />
                            Telegram
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Gerencie sua integração pessoal com o Telegram.
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

                {/* Generated Link Banner */}
                {generatedLink && (
                    <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            Código de Pareamento Gerado
                        </h3>
                        <p className="text-sm text-slate-300 mb-4">
                            Abra o Telegram, envie o comando <strong>/vincular_conta</strong> para o bot e informe o código abaixo quando solicitado.
                            Este código expira em {new Date(generatedLink.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                        </p>
                        <div className="mb-4 p-4 bg-black/30 rounded-xl border border-white/5 text-center">
                            <span className="text-3xl font-mono font-bold tracking-[0.25em] text-[#D946EF]">
                                {generatedLink.code}
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <a
                                href={generatedLink.telegramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all flex items-center gap-2 justify-center"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Abrir Bot no Telegram
                            </a>
                            <button
                                onClick={() => handleCopy(generatedLink.code)}
                                className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2 justify-center"
                            >
                                <Copy className="w-4 h-4" />
                                {copied ? 'Copiado!' : 'Copiar Código'}
                            </button>
                            <button
                                onClick={clearGeneratedLink}
                                className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

                {/* Generate Form (OWNER/EDITOR) */}
                {canEdit && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-[#D946EF] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            Gerar Código de Associação
                        </h2>
                        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-slate-300 mb-4">
                                Ao gerar o código numérico, o bot do Telegram será associado à sua conta. Informações sobre workspace, conta e categoria serão solicitadas pelo bot na sua primeira transação.
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-bold text-sm shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Link2 className="w-4 h-4" />
                                Gerar Código
                            </button>
                        </div>
                    </section>
                )}

                {/* Active Link */}
                {activeLink && (
                    <section className="mb-8">
                        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Conta Associada
                        </h2>
                        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-xs text-slate-500 block mb-1">Usuário Telegram</span>
                                    <span className="text-white font-medium">{activeLink.telegramUsername || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block mb-1">Conectado em</span>
                                    <span className="text-white font-medium">{new Date(activeLink.createdAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    {confirmRevoke === activeLink.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRevoke(activeLink.id)}
                                                disabled={isLoading}
                                                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                                            >
                                                Confirmar Desconexão
                                            </button>
                                            <button
                                                onClick={() => setConfirmRevoke(null)}
                                                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmRevoke(activeLink.id)}
                                            className="px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold flex items-center gap-1.5"
                                        >
                                            <Unlink className="w-3.5 h-3.5" />
                                            Desconectar Conta
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Loading */}
                {isLoading && !link && (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#D946EF] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* No links */}
                {!isLoading && !link && (
                    <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Nenhuma conta Telegram associada.</p>
                        <p className="text-xs text-slate-600 mt-1">Use o botão acima para gerar um código numérico de associação.</p>
                    </div>
                )}

                {/* History */}
                {link && link.status !== 'ACTIVE' && (() => {
                    const sConfig = statusConfig[link.status] || statusConfig.REVOKED;
                    const SIcon = sConfig.icon;
                    return (
                        <section>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                Histórico
                            </h2>
                            <div className="space-y-2">
                                <div key={link.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm text-slate-300 font-medium">
                                            {link.telegramUsername || 'Telegram'}
                                        </div>
                                        <span className="text-[10px] text-slate-600 uppercase font-bold">
                                            {new Date(link.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sConfig.bgClass} ${sConfig.textClass}`}>
                                            <SIcon className="w-3 h-3" />
                                            {sConfig.label}
                                        </span>
                                        {link.revokedAt && (
                                            <span className="text-[10px] text-slate-600">
                                                {new Date(link.revokedAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })()}
            </div>
        </AppLayout>
    );
}
