import { AuditAction, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ExtendedTransactionClient, prisma } from '../lib/prisma';

type AuditClient = ExtendedTransactionClient | typeof prisma;
type DecimalInput = Decimal | number | string | null | undefined;

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

        const id = crypto.randomUUID();

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
        } catch (error) {
            console.error('[AuditLogService] Error saving sync audit log:', error);
            throw new Error('Failed to create audit log');
        }
    }
}
