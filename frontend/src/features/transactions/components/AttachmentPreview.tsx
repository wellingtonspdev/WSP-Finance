import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';

interface AttachmentPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    downloadUrl: string | null;
    headers?: Record<string, string>;
    isLoadingUrl: boolean;
    errorUrl: string | null;
}

export function AttachmentPreview({
    isOpen,
    onClose,
    downloadUrl,
    headers,
    isLoadingUrl,
    errorUrl
}: AttachmentPreviewProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isFetchingBlob, setIsFetchingBlob] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Efeito para carregar o Blob com Criptografia SSE-C
    useEffect(() => {
        let active = true;

        const fetchSecureAsset = async () => {
            if (!downloadUrl) return;

            setIsFetchingBlob(true);
            setFetchError(null);

            try {
                // Fetch OBRIGATÓRIO pois tags <img> ou <iframe> não suportam injeção de Headers SSE-C nativamente.
                const response = await fetch(downloadUrl, {
                    headers: headers || {}
                });

                if (!response.ok) {
                    throw new Error('Falha na resposta do R2 (Possível expiração ou Access Denied)');
                }

                const blob = await response.blob();
                if (active) {
                    const objectUrl = URL.createObjectURL(blob);
                    setBlobUrl(objectUrl);
                }
            } catch (err) {
                console.error('Falha ao decifrar anexo:', err);
                if (active) {
                    setFetchError('Anexo inacessível. O link pode ter expirado (5 min) ou o formato do Vault não pôde ser lido.');
                }
            } finally {
                if (active) setIsFetchingBlob(false);
            }
        };

        if (isOpen && downloadUrl) {
            fetchSecureAsset();
        }

        return () => {
            active = false;
            // Cleanup Garbage Collection do Browser Memory
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, downloadUrl, headers]);

    // Limpar estado ao fechar
    const handleClose = () => {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
        }
        setFetchError(null);
        onClose();
    };

    if (!isOpen) return null;

    // Determinar se abrimos nova guia (Só pra coisas que o navegador não renderiza)
    const handleDownloadFallback = () => {
        if (downloadUrl && !headers) {
            window.open(downloadUrl, '_blank');
        } else {
            alert("Anexos do tipo Vault (Com Criptografia SSE-C de Cliente) não podem ser abertos em nova guia de forma externa devido a blindagem do AWS KMS. Salve o arquivo localmente.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-200">
            {/* Overlay Escuro com Blur Forte para sigilo do background */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose} />

            <div className="relative w-full max-w-4xl mx-auto my-auto flex flex-col max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/20">
                {/* Header do Visualizador */}
                <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <FileText className="text-purple-400 w-5 h-5" />
                        <h3 className="text-white font-semibold">Visualizador Seguro</h3>
                        {(headers && Object.keys(headers).length > 0) && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-wider uppercase border border-blue-500/30">
                                SSE-C Vault
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {(!headers && downloadUrl) && (
                            <button onClick={handleDownloadFallback} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10" title="Abrir URL Externa">
                                <ExternalLink className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Área Padrão do Documento */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] bg-[url('/grid.svg')] bg-center relative">
                    {/* Estados de Loading */}
                    {(isLoadingUrl || isFetchingBlob) && (
                        <div className="flex flex-col items-center gap-4 text-purple-400">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-sm font-medium animate-pulse">
                                {isLoadingUrl ? 'Assinando URL de Visualização (TTL: 5m)...' : 'Descriptografando bytes seguros (SSE-C)...'}
                            </p>
                        </div>
                    )}

                    {/* Estados de Erro */}
                    {(errorUrl || fetchError) && (
                        <div className="flex flex-col items-center max-w-md text-center bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <h4 className="text-white font-bold mb-2">Acesso Temporário Expirado</h4>
                            <p className="text-sm text-slate-400 mb-6">{errorUrl || fetchError}</p>
                            <Button className="w-full" onClick={handleClose}>Fechar Visualizador</Button>
                        </div>
                    )}

                    {/* Viewer de Sucesso (Imagem ou PDF gerado via Blob Object URL) */}
                    {blobUrl && !isLoadingUrl && !isFetchingBlob && !errorUrl && !fetchError && (
                        <div className="w-full h-full flex items-center justify-center">
                            {/* Heurística Simples: Renderiza como IFrame (Funciona para Imagem, SVG e PDF baseados no Blob mimetype injectado do R2) */}
                            <iframe
                                key={blobUrl}
                                src={`${blobUrl}#view=FitH`} // FitH ajuda no PDF render
                                title="Secure Attachment"
                                className="w-full h-[70vh] rounded-lg border border-white/5 bg-white shadow-inner"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Timer */}
                <div className="px-6 py-3 bg-black/60 border-t border-white/10 shrink-0 text-center">
                    <p className="text-xs text-slate-500 font-medium">Link Temporário • Expira em 5 minutos a partir da geração.</p>
                </div>
            </div>
        </div>
    );
}
