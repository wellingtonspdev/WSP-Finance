import { Loader2, X } from 'lucide-react';
import { useTransaction } from '../../transactions/hooks/useTransaction';
import { TransactionAccordionItem } from '../../transactions/components/TransactionAccordionItem';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string | null;
}

export function TransactionDetailModal({ isOpen, onClose, transactionId }: TransactionDetailModalProps) {
    const { data: transaction, isLoading, isError } = useTransaction(transactionId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-lg font-semibold text-white">Detalhes da Transação</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto min-h-[200px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 mt-10">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            <p>Carregando transação...</p>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-10 text-red-400">
                            Erro ao carregar os detalhes da transação.
                        </div>
                    ) : transaction ? (
                        <div className="pointer-events-auto">
                            <TransactionAccordionItem
                                transaction={transaction}
                                defaultExpanded={true}
                                // onEdit/onDelete could be passed here if needed in the future
                            />
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            Transação não encontrada.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
