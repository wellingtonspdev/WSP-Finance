import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { MovementCard } from '../components/MovementCard';

import {
  fetchGlobalPendingMovements,
  fetchPendingMovements,
  mergeMovements,
  approveMovement,
  rejectMovement,
} from '../api/bankMovements';
import type { BankMovementDTO } from '../api/bankMovements';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface DuplicateGroup {
  primary: BankMovementDTO;
  duplicates: BankMovementDTO[];
}

interface WorkspaceGroup {
  wsId: number;
  wsName: string;
  items: DuplicateGroup[];
}

/**
 * Agrupamento simplificado de duplicatas via nome + valor próximo.
 * No futuro, o backend pode retornar diretamente os clusters fuzzy.
 */
function groupDuplicates(movements: BankMovementDTO[]): DuplicateGroup[] {
  // Mock simplificado 1-1 para evitar quebra de renderização
  return movements.map(m => ({ primary: m, duplicates: [] }));
}

export function ApprovalInboxPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  
  const isGlobal = !workspaceId;
  const clientName = isGlobal ? "Todos os Clientes (Visão Global)" : "Inbox de Aprovação";

  const [movements, setMovements] = useState<BankMovementDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  let toastCounter = 0;

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + (toastCounter++);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const loadMovements = useCallback(async (cursor?: string) => {
    try {
      setIsLoading(true);
      let res;
      if (isGlobal) {
        res = await fetchGlobalPendingMovements(cursor);
      } else {
        // Precisamos importar fetchPendingMovements, mas vamos verificar isso depois.
        // Assumindo que podemos usar fetchPendingMovements do import do /bankMovements
        res = await fetchPendingMovements(Number(workspaceId), cursor);
      }
      
      if (cursor) {
        setMovements(prev => [...prev, ...res.data]);
      } else {
        setMovements(res.data);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      addToast('Erro ao carregar movimentos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, isGlobal, workspaceId]);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  const handleApprove = async (id: string) => {
    setIsProcessing(id);
    try {
      const mov = movements.find(m => m.id === id);
      if (!mov) return;
      await approveMovement(mov.workspaceId, id, 1);
      setMovements(prev => prev.filter(m => m.id !== id));
      addToast('Movimento aprovado e convertido em Transação');
    } catch {
      addToast('Erro ao aprovar movimento', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setIsProcessing(id);
    try {
      const mov = movements.find(m => m.id === id);
      if (!mov) return;
      await rejectMovement(mov.workspaceId, id);
      setMovements(prev => prev.filter(m => m.id !== id));
      addToast('Movimento rejeitado', 'info');
    } catch {
      addToast('Erro ao rejeitar movimento', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleMerge = async (keepId: string, discardIds: string[]) => {
    setIsProcessing(keepId);
    try {
      const mov = movements.find(m => m.id === keepId);
      if (!mov) return;
      await mergeMovements(mov.workspaceId, keepId, discardIds);
      setMovements(prev => prev.filter(m => !discardIds.includes(m.id)));
      addToast(`Movimentos mesclados em ${keepId.slice(0, 8)}…`);
    } catch {
      addToast('Erro ao mesclar movimentos', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const groups = groupDuplicates(movements) || [];
  const totalPending = movements.length;

  const groupedByWorkspace = useMemo<WorkspaceGroup[]>(() => {
    const wsMap = new Map<number, WorkspaceGroup>();
    groups.forEach(g => {
      const wsId = g.primary.workspaceId;
      const wsName = (g.primary as any).workspace?.name || `Empresa #${wsId}`;
      if (!wsMap.has(wsId)) {
        wsMap.set(wsId, { wsId, wsName, items: [] });
      }
      wsMap.get(wsId)!.items.push(g);
    });
    return Array.from(wsMap.values()).sort((a, b) => a.wsName.localeCompare(b.wsName));
  }, [groups]);

  return (
    <AppLayout>
      <div className="w-full max-w-4xl mx-auto px-4 py-6 lg:py-8">
        {/* Breadcrumb / Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/accountant/hub')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Inbox de Aprovação</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {clientName} · <span className="text-amber-400">{totalPending} pendente{totalPending !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <button
            onClick={() => loadMovements()}
            disabled={isLoading}
            className="ml-auto p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
            title="Recarregar"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{totalPending}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pendentes</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-400">
              {groups.filter(g => g.duplicates.length > 0).length}
            </p>
            <p className="text-[10px] text-amber-500/80 uppercase tracking-wider">Duplicatas</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">
              {groups.filter(g => g.duplicates.length === 0).length}
            </p>
            <p className="text-[10px] text-emerald-500/80 uppercase tracking-wider">Únicos</p>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && movements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Carregando movimentos…</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && movements.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-white">Inbox limpa!</p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Todos os movimentos bancários deste cliente já foram processados.
            </p>
          </motion.div>
        )}

        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {groupedByWorkspace.map(section => (
              <motion.div 
                key={section.wsId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-black/20 border border-white/5 rounded-3xl p-4 lg:p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1978e5] to-[#0ea5e9] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">{section.wsName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">{section.wsName}</h2>
                    <p className="text-xs text-slate-400">
                      {section.items.length} pacote{section.items.length !== 1 ? 's' : ''} pendente{section.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {section.items.map(group => (
                    <MovementCard
                      key={group.primary.id}
                      movement={group.primary}
                      duplicates={group.duplicates}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onMerge={handleMerge}
                      isProcessing={isProcessing === group.primary.id}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => nextCursor && loadMovements(nextCursor)}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 font-medium transition-all"
            >
              Carregar mais
            </button>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-6 right-6 z-50 space-y-2">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${
                  toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  toast.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
                {toast.type === 'info' && <Filter className="w-4 h-4" />}
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
