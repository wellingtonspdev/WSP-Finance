import { tenantContext } from '../../src/lib/tenantContext';

/**
 * Utilitário para envolver funções de teste em um contexto isolado do Workspace.
 * Extremamente necessário para testes do Row-Level Security V1.0 (Zero-Trust).
 */
export async function withTenantContext<T>(workspaceId: number, callback: () => Promise<T>): Promise<T> {
    return await tenantContext.run({ currentWorkspaceId: workspaceId }, callback);
}
