import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
    currentWorkspaceId?: number;
    userRole?: string;
    workspaceType?: string;
    bypassRls?: boolean;
    inTransaction?: boolean;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();
