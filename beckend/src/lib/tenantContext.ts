import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
    currentWorkspaceId?: number;
    bypassRls?: boolean;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();
