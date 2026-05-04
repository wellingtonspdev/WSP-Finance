import { FileText } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { CertificateUploadSection } from '../components/CertificateUploadSection';

export function DocumentsPage() {
    const { activeMembership } = useWorkspaceStore();
    const wsId = activeMembership?.id || 0;
    const canManageCertificates = activeMembership?.role === 'OWNER' || activeMembership?.role === 'ACCOUNTANT';

    return (
        <AppLayout>
            <div className="flex flex-col w-full max-w-4xl mx-auto pb-24 lg:pb-8 px-4 md:px-0">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <FileText className="w-7 h-7 text-[#D946EF]" />
                            Documentos
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Gerencie os documentos e certificados do workspace <strong className="text-white">{activeMembership?.name}</strong>.
                        </p>
                    </div>
                </header>

                {canManageCertificates && wsId > 0 && (
                    <div className="mb-8">
                        <CertificateUploadSection workspaceId={wsId} />
                    </div>
                )}
                
                {!canManageCertificates && (
                    <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Sem permissão</h3>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">
                            Você não possui permissão para gerenciar documentos ou certificados neste workspace.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
