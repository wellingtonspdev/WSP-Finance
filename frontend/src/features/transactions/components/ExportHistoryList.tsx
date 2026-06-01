import { Copy, Download, FileText, Loader2 } from 'lucide-react';
import type { ExportHistoryItem } from '../types/export';

interface ExportHistoryListProps {
    items: ExportHistoryItem[];
    isLoading: boolean;
    errorMessage: string | null;
    onEmptyExport: () => void;
    onDownload: (archiveId: string) => void;
}

const formatDate = (value: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
};

const formatPeriod = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
};

const truncateHash = (hash: string) => {
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
};

export function ExportHistoryList({
    items,
    isLoading,
    errorMessage,
    onEmptyExport,
    onDownload,
}: ExportHistoryListProps) {
    const copyHash = async (hash: string) => {
        await navigator.clipboard?.writeText(hash);
    };

    if (isLoading) {
        return (
            <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    Carregando historico de exportacoes...
                </div>
            </section>
        );
    }

    if (errorMessage) {
        return (
            <section className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {errorMessage}
            </section>
        );
    }

    if (items.length === 0) {
        return (
            <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <FileText className="mx-auto mb-3 h-6 w-6 text-purple-300" />
                <p className="mb-4 text-sm text-slate-300">Nenhuma exportacao gerada ainda.</p>
                <button
                    type="button"
                    onClick={onEmptyExport}
                    className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/20"
                >
                    Exportar Dominio
                </button>
            </section>
        );
    }

    return (
        <section className="mb-6 space-y-3" aria-label="Historico de exportacoes">
            {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-300">
                                    {item.status}
                                </span>
                                <span className="text-xs uppercase tracking-wider text-slate-500">
                                    {item.targetSystem}
                                </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white">{formatPeriod(item.periodStart, item.periodEnd)}</h4>
                            <p className="mt-1 text-xs text-slate-400">
                                Layout: {item.layoutId} - Gerado em {formatDate(item.createdAt)}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => onDownload(item.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-3">
                        <div className="rounded-xl bg-white/5 p-3">
                            <span className="block text-slate-500">Registros</span>
                            <strong className="text-white">{item.recordCount}</strong>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                            <span className="block text-slate-500">Avisos</span>
                            <strong className="text-white">{item.warningsCount}</strong>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3 col-span-2 sm:col-span-1">
                            <span className="block text-slate-500">Arquivo</span>
                            <strong className="block truncate text-white">{item.fileName}</strong>
                        </div>
                    </div>

                    <details className="mt-3 text-xs text-slate-300">
                        <summary className="cursor-pointer text-purple-300">Ver detalhes</summary>
                        <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3">
                            <p>
                                Usuario: {item.createdByUser.name || item.createdByUser.email}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <code className="break-all rounded bg-black/30 px-2 py-1 text-[11px] text-slate-200">
                                    {truncateHash(item.hash)}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => copyHash(item.hash)}
                                    className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar hash
                                </button>
                            </div>
                        </div>
                    </details>
                </article>
            ))}
        </section>
    );
}
