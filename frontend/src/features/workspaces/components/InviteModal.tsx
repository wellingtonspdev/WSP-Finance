import React, { useState } from 'react';
import { X, Copy, CheckCircle, MessageCircle, AlertTriangle } from 'lucide-react';
import { useInvites } from '../hooks/useInvites';

interface InviteModalProps {
    workspaceId: number;
    workspaceName: string;
    isOpen: boolean;
    onClose: () => void;
    onInviteGenerated?: () => void;
}

export function InviteModal({ workspaceId, workspaceName, isOpen, onClose, onInviteGenerated }: InviteModalProps) {
    const [email, setEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { createInvite, isLoading, error } = useInvites(workspaceId);

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        const data = await createInvite({ email, role: 'ACCOUNTANT' });

        if (data && data.token) {
            // Build Frontend Deep Link
            const appUrl = window.location.origin; // ex: http://localhost:5173
            setGeneratedLink(`${appUrl}/invite/${data.token}`);
            if (onInviteGenerated) onInviteGenerated();
        }
    };

    const handleCopy = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWhatsAppShare = () => {
        if (!generatedLink) return;
        const msg = `Olá! Estou te convidando para ser o contador da empresa ${workspaceName} no WSP Finance. 
Acesse para aceitar o convite de segurança:
${generatedLink}`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
    };

    const resetAndClose = () => {
        setEmail('');
        setGeneratedLink(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#11051F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Delegar Acesso Contábil</h2>
                    <button onClick={resetAndClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {!generatedLink ? (
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3 mb-6">
                                <AlertTriangle className="text-blue-400 w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    O contador convidado <strong>terá acesso Read-Only</strong> aos dados financeiros para apuração fiscal.
                                    O sistema possui <strong>bloqueio nativo</strong>: Apenas o dono deste e-mail (${email || '...'}) conseguirá aceitar o convite gerado.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">E-mail Corporativo do Contador</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                                    placeholder="ex: fiscal@contabilidade.com.br"
                                />
                            </div>

                            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-3.5 mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Gerando Link Blindado...' : 'Gerar Convite de Segurança'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center animate-[fadeIn_0.3s_ease-out]">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-lg">Smart Link Gerado!</h3>
                                <p className="text-slate-400 text-sm mt-2">Envie este link para o e-mail <strong>{email}</strong> aceitar.</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                <span className="text-sm text-slate-300 truncate flex-1 font-mono text-left opacity-70">
                                    {generatedLink}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors flex items-center gap-2 text-xs font-medium"
                                >
                                    {copied ? (<><CheckCircle className="w-4 h-4 text-green-400" /> Copiado</>) : (<><Copy className="w-4 h-4" /> Copiar</>)}
                                </button>
                            </div>

                            <button
                                onClick={handleWhatsAppShare}
                                className="w-full py-3.5 bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Enviar Rápido pelo WhatsApp
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
