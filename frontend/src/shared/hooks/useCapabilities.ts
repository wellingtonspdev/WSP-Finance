import { useWorkspaceStore } from '../stores/useWorkspaceStore';

// Mapeamento das capabilities passivas de acordo com a Role (Regra emulada pelo frontend com base na regra suprema vinda do server)
// NOTA ARQUITETURAL: No futuro (V2 backend final), o próprio Auth virá com `membership.capabilities = { canEdit: true }`.
// Por enquanto, usaremos a Role do activeMembership inferida.

export function useCapabilities() {
    const { activeMembership, activeWorkspaceId } = useWorkspaceStore();

    const role = activeMembership?.role || 'VIEWER';

    // Se a role é ACCOUNTANT ou VIEWER, não pode editar.
    const canEdit = !['ACCOUNTANT', 'VIEWER'].includes(role); // Simula backend (ACCOUNTANT ou VIEWER tem false)

    // Posso ver o componente de auditoria? (Exclusivo p/ view contábil)
    const canViewAuditBanner = role === 'ACCOUNTANT';

    // Posso executar requisições em background?
    const isAvailable = Boolean(activeWorkspaceId);

    return {
        canEdit,
        canViewAuditBanner,
        isAvailable,
        activeRole: role // Se precisar debug, evitar usar na UI final se possivel.
    };
}
