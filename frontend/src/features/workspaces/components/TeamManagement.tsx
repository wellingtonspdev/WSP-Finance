import { useState } from 'react';
import { Users, Plus, Shield, X } from 'lucide-react';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { InviteModal } from './InviteModal';

interface TeamManagementProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TeamManagement({ isOpen, onClose }: TeamManagementProps) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const { activeMembership, activeWorkspaceId } = useWorkspaceStore();

    const isOwner = activeMembership?.role === 'OWNER';

    if (!activeWorkspaceId || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#11051F]/95 border border-white/5 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" /> Delegação Contábil
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Gerencie quem tem acesso à auditoria deste Workspace.</p>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Convidar Contador
                        </button>
                    )}
                </div>

                {!isOwner && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-sm text-yellow-300">
                        <Shield className="w-5 h-5 shrink-0" />
                        <p>Você não é o Administrador (Owner) deste Workspace. Apenas o proprietário pode convidar novos membros.</p>
                    </div>
                )}

                {/* Tabela Fake por enquanto (Opcional, pois o escopo 4B pede apenas o Onboarding Flow do Link) */}
                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden mt-4">
                    <div className="p-4 text-sm text-slate-400 text-center font-medium">
                        Módulo Frontend de Tabela em Construção. Utilize o botão acima para despachar convites via Token.
                    </div>
                </div>

                <InviteModal
                    workspaceId={activeWorkspaceId}
                    workspaceName={activeMembership?.name || 'Workspace'}
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    onInviteGenerated={() => {
                        // Pode disparar refresh de uma query react-query de pending-invites se houver.
                    }}
                />
            </div>
        </div>
    );
}
