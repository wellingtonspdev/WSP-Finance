import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, FileText, CheckCircle, Download, Loader2 } from 'lucide-react';
import { useExportDominio } from '../hooks/useExportDominio';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';

interface ExportDominioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ExportDominioModal({ isOpen, onClose }: ExportDominioModalProps) {
    const {
        startDate,
        endDate,
        modalState,
        errorMessage,
        validationResult,
        handleDateChange,
        validate,
        download,
        reset
    } = useExportDominio();

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px]"
                        onClick={handleClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />

                    <motion.div
                        className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[500px] z-50 flex flex-col h-[92%] md:h-full bg-[#11051f]/85 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 rounded-t-[32px] md:rounded-l-[32px] md:rounded-tr-none shadow-2xl"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-6 pt-4 pb-6 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                Exportar Domínio
                            </h2>
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-40 space-y-6">
                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-slate-400 mb-2 ml-1">Data Inicial</label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        disabled={modalState === 'validating' || modalState === 'downloading'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-slate-400 mb-2 ml-1">Data Final</label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        disabled={modalState === 'validating' || modalState === 'downloading'}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={validate}
                                isLoading={modalState === 'validating'}
                                disabled={modalState === 'validating' || modalState === 'downloading'}
                                className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10"
                            >
                                Validar
                            </Button>

                            {/* Status and Feedback */}
                            <div className="space-y-4">
                                {modalState === 'idle' && (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-slate-400 text-sm text-center">
                                        Selecione o período para exportação.
                                    </div>
                                )}

                                {modalState === 'validating' && (
                                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 flex flex-col items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                                        <p className="text-sm text-purple-200">Validando dados para exportação...</p>
                                    </div>
                                )}

                                {modalState === 'downloading' && (
                                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex flex-col items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                                        <p className="text-sm text-blue-200">Baixando arquivo TXT...</p>
                                    </div>
                                )}

                                {modalState === 'error' && errorMessage && (
                                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-200">{errorMessage}</p>
                                    </div>
                                )}

                                {modalState === 'ready' && validationResult && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                            <div className="text-sm text-green-200">
                                                <p className="font-semibold mb-1">Exportação pronta.</p>
                                                <p>Registros encontrados: {validationResult.totalRecords}.</p>
                                                {validationResult.warnings.length > 0 && (
                                                    <p>Warnings: {validationResult.warnings.length}.</p>
                                                )}
                                            </div>
                                        </div>

                                        {validationResult.warnings.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider ml-1">Avisos (Não impedem exportação)</h3>
                                                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 max-h-40 overflow-y-auto no-scrollbar space-y-2">
                                                    {validationResult.warnings.map((w, idx) => (
                                                        <div key={idx} className="text-xs text-yellow-200/80 bg-yellow-500/10 p-2 rounded">
                                                            <span className="font-medium">[{w.code}]</span> {w.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {modalState === 'blocked' && validationResult && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                            <div className="text-sm text-red-200">
                                                <p className="font-semibold mb-1">Exportação bloqueada.</p>
                                                <p>Corrija as pendências antes de gerar o arquivo.</p>
                                            </div>
                                        </div>

                                        {validationResult.blockers.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider ml-1">Pendências Obrigatórias</h3>
                                                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 max-h-60 overflow-y-auto no-scrollbar space-y-2">
                                                    {validationResult.blockers.map((b, idx) => (
                                                        <div key={idx} className="text-xs text-red-200/80 bg-red-500/10 p-2 rounded">
                                                            <span className="font-medium">[{b.code}]</span> {b.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-[#0f0518]/95 backdrop-blur-xl border-t border-white/5 pt-4 pb-8 px-6 rounded-t-2xl md:rounded-none">
                            <Button
                                type="button"
                                onClick={download}
                                disabled={modalState !== 'ready'}
                                isLoading={modalState === 'downloading'}
                                className="w-full h-14 text-lg bg-brand-gradient text-white border-transparent shadow-lg shadow-purple-500/20 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Baixar TXT
                            </Button>
                            <div className="h-1 w-1/3 bg-white/10 rounded-full mx-auto mt-6 md:hidden" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
