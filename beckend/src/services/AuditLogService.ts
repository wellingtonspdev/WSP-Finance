import { prisma } from '../lib/prisma';
import { AuditAction } from '@prisma/client';

export interface CreateAuditLogDTO {
    userId: number;
    workspaceId: number;
    action: AuditAction;
    entity: string;
    entityId: string;
    oldState?: any;
    newState?: any;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogService {
    /**
     * Registra uma ação de auditoria no sistema de forma assíncrona (fire-and-forget).
     * Não aguarda o banco de dados para não travar a requisição do usuário.
     */
    static async logAsync(dto: CreateAuditLogDTO): Promise<void> {
        // Executa em background
        Promise.resolve().then(async () => {
            try {
                await prisma.auditLog.create({
                    data: {
                        userId: dto.userId,
                        workspaceId: dto.workspaceId,
                        action: dto.action,
                        entity: dto.entity,
                        entityId: dto.entityId,
                        oldState: dto.oldState || null,
                        newState: dto.newState || null,
                        ipAddress: dto.ipAddress || null,
                        userAgent: dto.userAgent || null,
                    }
                });
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
    static async logSync(dto: CreateAuditLogDTO): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: dto.userId,
                    workspaceId: dto.workspaceId,
                    action: dto.action,
                    entity: dto.entity,
                    entityId: dto.entityId,
                    oldState: dto.oldState || null,
                    newState: dto.newState || null,
                    ipAddress: dto.ipAddress || null,
                    userAgent: dto.userAgent || null,
                }
            });
        } catch (error) {
            console.error('[AuditLogService] Error saving sync audit log:', error);
            throw new Error('Failed to create audit log');
        }
    }
}
