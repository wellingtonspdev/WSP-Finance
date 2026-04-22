import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Factory que retorna um novo React wrapper com QueryClient fresco a cada teste.
 * Uso: renderHook(() => useHook(), { wrapper: createWrapper() })
 */
export function createWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
}
