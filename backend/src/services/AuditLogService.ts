import { AuditAction, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma';
import { tenantContext } from '../lib/tenantContext';

type AuditClient = Pick<typeof prisma, '$executeRaw'>;
type DecimalInput = Decimal | number | string | null | undefined;

export type ExportAuditMetadata = {
    layoutId: string;
    targetSystem: 'DOMINIO';
    periodStart: string;
    periodEnd: string;
    recordCount: number;
    warningsCount: number;
    fileHash: string;
    fileName: string;
    archiveId?: string;
};

export function buildExportAuditNewState(input: ExportAuditMetadata): ExportAuditMetadata {
    const state: ExportAuditMetadata = {
        layoutId: input.layoutId,
        targetSystem: input.targetSystem,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        recordCount: input.recordCount,
        warningsCount: input.warningsCount,
        fileHash: input.fileHash,
        fileName: input.fileName,
    };

    if (input.archiveId !== undefined) {
        state.archiveId = input.archiveId;
    }

    return state;
}

export interface CreateAuditLogDTO {
    userId: number;
    workspaceId?: number | null;
    action: AuditAction;
    entity: string;
    entityId: string;
    oldState?: Prisma.JsonValue | null;
    newState?: Prisma.JsonValue | null;
    balanceBefore?: DecimalInput;
    balanceAfter?: DecimalInput;
    delta?: DecimalInput;
    fromAccount?: number | null;
    toAccount?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export class AuditLogService {
    private static normalizeDecimal(value: DecimalInput): string | null {
        if (value === undefined || value === null) {
            return null;
        }

        if (value instanceof Decimal) {
            return value.toString();
        }

        return String(value);
    }

    private static normalizeJson(value?: Prisma.JsonValue | null): string | null {
        if (value === undefined || value === null) {
            return null;
        }

        return JSON.stringify(value);
    }

    private static async insert(dto: CreateAuditLogDTO, client: AuditClient): Promise<void> {
        const oldState = this.normalizeJson(dto.oldState);
        const newState = this.normalizeJson(dto.newState);
        const balanceBefore = this.normalizeDecimal(dto.balanceBefore);
        const balanceAfter = this.normalizeDecimal(dto.balanceAfter);
        const delta = this.normalizeDecimal(dto.delta);

        const currentTenant = tenantContext.getStore();
        if (dto.workspaceId && currentTenant?.currentWorkspaceId && dto.workspaceId !== currentTenant.currentWorkspaceId) {
            throw new Error(`Workspace mismatch: Context workspaceId ${currentTenant.currentWorkspaceId} does not match DTO workspaceId ${dto.workspaceId}`);
        }

        const id = crypto.randomUUID();

        // If client is a root PrismaClient (has $transaction), wrap in transaction to ensure
        // set_config and INSERT use the exact same connection from the pool.
        if ('$transaction' in client) {
            await (client as any).$transaction(async (tx: AuditClient) => {
                const currentRes: any = await (tx as any).$queryRaw`SELECT current_setting('app.current_workspace_id', true)`;
                const currentSetting = currentRes?.[0]?.current_setting;

                if (dto.workspaceId && currentSetting !== String(dto.workspaceId)) {
                    await (tx as any).$executeRaw`SELECT set_config('app.current_workspace_id', ${String(dto.workspaceId)}, true)`;
                }

                await this.executeInsert(tx, dto, id, oldState, newState, balanceBefore, balanceAfter, delta);
            });
        } else {
            // Already inside a transaction or it's a transaction client
            if (dto.workspaceId) {
                await client.$executeRaw`SELECT set_config('app.current_workspace_id', ${String(dto.workspaceId)}, true)`;
            }
            await this.executeInsert(client, dto, id, oldState, newState, balanceBefore, balanceAfter, delta);
        }
    }

    private static async executeInsert(client: AuditClient, dto: CreateAuditLogDTO, id: string, oldState: string | null, newState: string | null, balanceBefore: string | null, balanceAfter: string | null, delta: string | null): Promise<void> {
        await client.$executeRaw`
            INSERT INTO "AuditLog" (
                "id",
                "userId",
                "workspaceId",
                "action",
                "entity",
                "entityId",
                "oldState",
                "newState",
                "balanceBefore",
                "balanceAfter",
                "delta",
                "fromAccount",
                "toAccount",
                "ipAddress",
                "userAgent"
            ) VALUES (
                ${id},
                ${dto.userId},
                ${dto.workspaceId ?? null},
                ${dto.action}::"AuditAction",
                ${dto.entity},
                ${dto.entityId},
                ${oldState}::jsonb,
                ${newState}::jsonb,
                ${balanceBefore}::decimal(19,4),
                ${balanceAfter}::decimal(19,4),
                ${delta}::decimal(19,4),
                ${dto.fromAccount ?? null},
                ${dto.toAccount ?? null},
                ${dto.ipAddress ?? null},
                ${dto.userAgent ?? null}
            )
        `;
    }

    /**
     * Registra uma ação de auditoria no sistema de forma assíncrona (fire-and-forget).
     * Não aguarda o banco de dados para não travar a requisição do usuário.
     */
    static async logAsync(dto: CreateAuditLogDTO): Promise<void> {
        // Executa em background
        Promise.resolve().then(async () => {
            try {
                await this.insert(dto, prisma);
            } catch (error) {
                // Falhas de auditoria não devem quebrar o fluxo principal, mas devem ser logadas
                console.error('[AuditLogService] Error saving audit log:', error);
            }
        });
    }

    /**
     * Registra uma ação de auditoria de forma síncrona, caso seja necessário garantir
     * que a transação principal falhe se a auditoria falhar (ex: partidas dobradas).
     */
    static async logSync(dto: CreateAuditLogDTO, client: AuditClient = prisma): Promise<void> {
        try {
            await this.insert(dto, client);
        } catch (error: any) {
            console.error(`[AuditLogService] Error saving sync audit log: ${error.message}`);
            if (error.message.includes('Workspace mismatch')) {
                throw error;
            }
            throw new Error('Failed to create audit log');
        }
    }
}
