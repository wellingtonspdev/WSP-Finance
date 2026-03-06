/**
 * Query Key Factory
 * 
 * Centraliza a geração de chaves para o TanStack Query.
 * Garante que TODAS as queries sejam estritamente vinculadas ao `workspaceId`.
 * Previne sobrescrita de dados (Race Conditions) entre clientes diferentes.
 */

export const queryKeys = {
    // === TRANSAÇÕES ===
    transactions: {
        all: (workspaceId: string | number) => ['transactions', String(workspaceId)] as const,
        detail: (workspaceId: string | number, txId: string | number) => ['transactions', String(workspaceId), String(txId)] as const,
        summary: (workspaceId: string | number, params?: any) => ['transactions-summary', String(workspaceId), params] as const,
    },

    // === DASHBOARD ===
    dashboard: {
        metrics: (workspaceId: string | number) => ['dashboard-metrics', String(workspaceId)] as const,
    },

    // Adicione novas factories de domínio conforme o sistema cresce...
};
