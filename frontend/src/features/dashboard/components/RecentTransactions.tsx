import type { Transaction } from '../api/getRecentTransactions';
import { ListSkeleton } from '../../../shared/components/skeletons/ListSkeleton';
import { ShoppingCart, ArrowRight, Paperclip, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAttachment } from '../../transactions/hooks/useAttachment';
import { AttachmentPreview } from '../../transactions/components/AttachmentPreview';

interface Props {
  data?: Transaction[];
  isLoading: boolean;
  error?: Error | null;
}

export function RecentTransactions({ data, isLoading, error }: Props) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const { getSignedUrl, isLoading: isAttachmentLoading, error: attachmentError, clearError } = useAttachment();
  const [previewData, setPreviewData] = useState<{ url: string, headers?: Record<string, string> } | null>(null);

  const handlePreview = async (txId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await getSignedUrl(txId);
    if (result) {
      setPreviewData({ url: result.downloadUrl, headers: result.headers });
    }
    setSelectedTxId(txId);
  };

  const closePreview = () => {
    setSelectedTxId(null);
    setPreviewData(null);
    clearError();
  };

  if (error && !data) {
    return (
      <section className="px-6 lg:px-0 flex-1">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center min-h-[150px]">
          <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-red-400 font-medium">Erro ao carregar transações</p>
        </div>
      </section>
    );
  }

  if (!data || (isLoading && !data)) {
    return (
      <section className="px-6 lg:px-0 flex-1">
        <div className="h-6 w-40 bg-white/10 rounded animate-pulse mb-4"></div>
        <ListSkeleton />
      </section>
    );
  }

  const formatCurrency = (value: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <section className="px-6 lg:px-0 flex-1 w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold text-lg lg:text-xl">Atividade Recente</h2>
        <button
          onClick={() => navigate(`/${workspaceId}/transactions`)}
          className="text-sm text-blue-400 font-medium hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          Ver extrato completo <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {data?.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-slate-400">Nenhuma transação recente.</p>
        </div>
      )}

      {/* Mobile View (List) */}
      <div className="space-y-4 lg:hidden pb-4">
        {data?.slice(0, 6).map((tx) => (
          <div key={tx.id} className="flex items-start justify-between bg-white/5 p-4 rounded-xl border border-white/5 active:scale-[0.98] transition-transform">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium text-sm break-words hyphens-auto">{tx.description}</p>
                  {tx.attachmentUrl && (
                    <button onClick={(e) => handlePreview(tx.id, e)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                      <Paperclip className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5 break-words">
                  {formatDate(tx.date)} • {tx.category.name}
                </p>
              </div>
            </div>
            <span className={`font-bold text-sm whitespace-nowrap ml-2 ${tx.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
              {tx.type === 'EXPENSE' ? '- ' : '+ '}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Transação</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.slice(0, 6).map((tx) => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-white font-medium truncate">{tx.description}</span>
                    {tx.attachmentUrl && (
                      <button onClick={(e) => handlePreview(tx.id, e)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0" title="Ver Comprovante">
                        <Paperclip className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300 text-sm">
                  <span className="px-2 py-1 rounded-full bg-white/10 text-xs border border-white/5">
                    {tx.category.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(tx.date)}</td>
                <td className={`px-6 py-4 text-right font-bold text-sm ${tx.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                  {tx.type === 'EXPENSE' ? '- ' : '+ '}
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* V3.8 Attachment Modal */}
      <AttachmentPreview
        isOpen={selectedTxId !== null}
        onClose={closePreview}
        downloadUrl={previewData?.url || null}
        headers={previewData?.headers}
        isLoadingUrl={isAttachmentLoading}
        errorUrl={attachmentError}
      />
    </section>
  );
}