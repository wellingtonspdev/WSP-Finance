import { useRef, useState } from 'react';
import { UploadCloud, KeyRound, CheckCircle2, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { useUploadCertificate } from '../hooks/useUploadCertificate';
import type { CertificateUploadResponse } from '../types';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALLOWED_EXTENSIONS = ['.pfx', '.p12'];

interface ApiErrorResponse {
    response?: {
        data?: {
            message?: unknown;
        };
    };
}

function isValidExtension(filename: string): boolean {
    return ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));
}

function extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const message = (err as ApiErrorResponse).response?.data?.message;
        if (typeof message === 'string') return message;
    }

    return 'Erro ao enviar o certificado. Tente novamente.';
}

interface Props {
    workspaceId: number;
}

export function CertificateUploadSection({ workspaceId }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [extensionError, setExtensionError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<CertificateUploadResponse | null>(null);

    const { activeMembership } = useWorkspaceStore();
    const hasCert = !!activeMembership?.certificateExpiresAt;

    const { mutateAsync, isPending } = useUploadCertificate(workspaceId);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        setSuccessData(null);
        setSubmitError(null);

        if (selected && !isValidExtension(selected.name)) {
            setExtensionError('Selecione um arquivo .pfx ou .p12 válido.');
            setFile(null);
            return;
        }

        setExtensionError(null);
        setFile(selected);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        setSubmitError(null);
        setSuccessData(null);

        try {
            const result = await mutateAsync({ file, password });
            setSuccessData(result);
            setFile(null);
            setPassword('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            setSubmitError(extractErrorMessage(err));
        }
    }

    const canSubmit = !!file && !extensionError && !isPending;

    return (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Certificado A1</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Envie o arquivo .pfx ou .p12 para habilitar a emissão de NF-e.
                    </p>
                </div>
            </div>

            {hasCert && !successData && !file && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5 flex flex-col gap-1">
                    <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Certificado Ativo
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                        O seu certificado atual vence em <strong>{format(parseISO(activeMembership.certificateExpiresAt!), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong> ({differenceInDays(parseISO(activeMembership.certificateExpiresAt!), new Date())} dias restantes).
                    </p>
                    <p className="text-xs text-emerald-300/60 mt-1">
                        Use o formulário abaixo apenas se desejar atualizar para um novo certificado.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Input arquivo */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="cert-file" className="text-xs font-medium text-slate-300">
                        Arquivo (.pfx / .p12)
                    </label>
                    <label
                        htmlFor="cert-file"
                        className="flex items-center gap-3 cursor-pointer border border-dashed border-white/20 rounded-xl px-4 py-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                    >
                        <UploadCloud className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-400 truncate">
                            {file ? file.name : 'Clique para selecionar…'}
                        </span>
                        <input
                            ref={fileInputRef}
                            id="cert-file"
                            type="file"
                            accept=".pfx,.p12"
                            className="sr-only"
                            onChange={handleFileChange}
                            disabled={isPending}
                            aria-label="Arquivo"
                        />
                    </label>
                    {extensionError && (
                        <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {extensionError}
                        </p>
                    )}
                </div>

                {/* Input senha */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="cert-password" className="text-xs font-medium text-slate-300">
                        Senha do certificado
                    </label>
                    <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5">
                        <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                        <input
                            id="cert-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isPending}
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                            aria-label="Senha"
                        />
                    </div>
                </div>

                {/* Erro de submissão */}
                {submitError && (
                    <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {submitError}
                    </p>
                )}

                {/* Sucesso */}
                {successData && (
                    <div role="status" className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            Certificado enviado com sucesso! Expira em{' '}
                            <strong>{successData.expiresInDays} dias</strong>.
                        </span>
                    </div>
                )}

                {/* Botão */}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                        bg-purple-600 hover:bg-purple-500 text-white
                        disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando…
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-4 h-4" />
                            Enviar certificado
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}
