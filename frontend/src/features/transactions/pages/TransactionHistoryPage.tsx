import { useState, useRef, useCallback, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionAccordionItem } from '../components/TransactionAccordionItem';
import { ArrowLeft, Filter, Loader2, FileText, History } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAttachment } from '../hooks/useAttachment';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { ExportDominioModal } from '../components/ExportDominioModal';
import { ExportHistoryList } from '../components/ExportHistoryList';
import { useExportHistory } from '../hooks/useExportHistory';
import { dismissAIInsight } from '../api/aiInsightApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../config/queryKeys';
import { AppLayout } from '../../../shared/components/layout/AppLayout';

export function TransactionHistoryPage() {
    const [filterMode, setFilterMode] = useState<'ALL' | 'PACT' | 'SERVICES' | 'SUBS'>('ALL');
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useTransactions();
    const navigate = useNavigate();
    const { workspaceId } = useParams<{ workspaceId: string }>();

    const activeMembership = useWorkspaceStore(state => state.activeMembership);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExportHistoryOpen, setIsExportHistoryOpen] = useState(false);
    const queryClient = useQueryClient();
    const canUseExports = activeMembership?.type === 'BUSINESS' && (activeMembership.role === 'OWNER' || activeMembership.role === 'ACCOUNTANT');
    const exportHistory = useExportHistory(workspaceId, isExportHistoryOpen && !!canUseExports);

    const transactions = useMemo(
        () => data?.pages.flatMap((page) => page.data) ?? [],
        [data]
    );

    const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
    const { getSignedUrl, isLoading: isAttachmentLoading, error: attachmentError, clearError } = useAttachment();
    const [previewData, setPreviewData] = useState<{ url: string, headers?: Record<string, string> } | null>(null);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastItemRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isFetchingNextPage) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            });
            if (node) observer.current.observe(node);
        },
        [isFetchingNextPage, hasNextPage, fetchNextPage]
    );

    const handlePreviewAttachment = async (id: string) => {
        const txIdStr = String(id);
        const result = await getSignedUrl(txIdStr);
        if (result) {
            setPreviewData({ url: result.downloadUrl, headers: result.headers });
        }
        setSelectedTxId(txIdStr);
    };

    const closePreview = () => {
        setSelectedTxId(null);
        setPreviewData(null);
        clearError();
    };

    const handleDismissInsight = useCallback(async (insightId: string) => {
        await dismissAIInsight(insightId);
        queryClient.invalidateQueries({
            queryKey: queryKeys.transactions.all(workspaceId || 'null'),
        });
    }, [queryClient, workspaceId]);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex-1 pt-6 text-white w-full">
                    <div className="flex items-center justify-between mb-6 px-2 animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-24"></div>
                        <div className="h-4 bg-white/10 rounded w-32"></div>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-[#1e293b]/50 border border-white/10 rounded-2xl h-20 animate-pulse flex items-center px-4 justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10"></div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-white/10 rounded w-32"></div>
                                        <div className="h-2 bg-white/10 rounded w-20"></div>
                                    </div>
                                </div>
                                <div className="space-y-2 flex flex-col items-end">
                                    <div className="h-4 bg-white/10 rounded w-24"></div>
                                    <div className="h-2 bg-white/10 rounded w-10"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (isError) {
        return (
            <AppLayout>
                <div className="p-8 text-center text-red-500 w-full">Erro ao carregar transacoes. Verifique sua conexao.</div>
            </AppLayout>
        );
    }

    const filteredTransactions = transactions.filter(t => {
        if (filterMode === 'PACT') return t.grossAmount !== undefined && t.grossAmount !== null && t.grossAmount > 0;
        return true;
    });

    return (
        <AppLayout>
            <div className="flex flex-col relative w-full h-full text-white">
                <div className="relative z-10 flex flex-col h-full lg:pt-4">
                    <header className="lg:hidden px-6 pt-6 pb-4 flex items-center justify-between z-20 sticky top-0 bg-[#11051f]/60 backdrop-blur-xl border-b border-white/5">
                        <button
                            onClick={() => navigate(`/${workspaceId}/dashboard`)}
                            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-semibold text-white">Extrato</h1>
                        <button className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
                            <Filter className="w-6 h-6" />
                        </button>
                    </header>

                    <div className="hidden lg:flex items-center justify-between mb-6 px-1">
                        <h1 className="text-2xl font-bold text-white">Extrato</h1>
                    </div>

                    <main className="flex-1 pb-16 lg:pb-8">
                        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 px-1">
                            <button
                                onClick={() => setFilterMode('ALL')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-transform active:scale-95 ${filterMode === 'ALL' ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/50 text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterMode('PACT')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-transform active:scale-95 ${filterMode === 'PACT' ? 'bg-brand-gradient text-white border-transparent shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                            >
                                Marketplace
                            </button>

                            {canUseExports && (
                                <>
                                    <button
                                        onClick={() => setIsExportModalOpen(true)}
                                        className="px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-transform active:scale-95 bg-white/5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Exportar Dominio
                                    </button>
                                    <button
                                        onClick={() => setIsExportHistoryOpen(value => !value)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-transform active:scale-95 flex items-center gap-2 ${isExportHistoryOpen ? 'bg-purple-500/20 text-white border-purple-500/50' : 'bg-white/5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10'}`}
                                    >
                                        <History className="w-4 h-4" />
                                        Historico
                                    </button>
                                </>
                            )}
                        </div>

                        {isExportHistoryOpen && canUseExports && (
                            <ExportHistoryList
                                items={exportHistory.items}
                                isLoading={exportHistory.isLoading}
                                errorMessage={exportHistory.errorMessage}
                                onEmptyExport={() => setIsExportModalOpen(true)}
                                onDownload={(archiveId) => exportHistory.downloadArchive(archiveId)}
                            />
                        )}

                        <div className="flex items-center justify-between mb-3 px-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Todo o Periodo</h3>
                            <span className="text-xs text-slate-500">
                                Total exibido: {filteredTransactions.length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">Nenhuma transacao encontrada.</div>
                            ) : (
                                filteredTransactions.map((transaction, index) => (
                                    <div
                                        key={transaction.id}
                                        ref={index === filteredTransactions.length - 1 ? lastItemRef : undefined}
                                    >
                                        <TransactionAccordionItem
                                            transaction={transaction}
                                            onEdit={(id) => console.log('Edit', id)}
                                            onDelete={(id) => console.log('Delete', id)}
                                            onPreviewAttachment={(id) => handlePreviewAttachment(id)}
                                            onDismissInsight={handleDismissInsight}
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        {isFetchingNextPage && (
                            <div className="flex items-center justify-center py-8 gap-2">
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                                <span className="text-sm text-slate-400">Carregando mais transacoes...</span>
                            </div>
                        )}

                        {!hasNextPage && filteredTransactions.length > 0 && (
                            <div className="text-center py-8">
                                <span className="text-xs text-slate-600">Todas as transacoes foram carregadas</span>
                            </div>
                        )}
                    </main>
                </div>

                <AttachmentPreview
                    isOpen={selectedTxId !== null}
                    onClose={closePreview}
                    downloadUrl={previewData?.url || null}
                    headers={previewData?.headers}
                    isLoadingUrl={isAttachmentLoading}
                    errorUrl={attachmentError}
                />

                <ExportDominioModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                />
            </div>
        </AppLayout>
    );
}
