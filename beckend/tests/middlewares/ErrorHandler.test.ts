import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../../src/server';
import { AuditLogService } from '../../src/services/AuditLogService';

vi.mock('../../src/services/AuditLogService', () => {
    return {
        AuditLogService: {
            logAsync: vi.fn().mockResolvedValue(true)
        }
    };
});

// Stub do environment
process.env.NODE_ENV = 'development';

describe('Global Error Handler (Interceptor de Erros P2004/P2010)', () => {
    let mockRequest: Partial<Request> & { user?: { id: number } };
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            user: { id: 101 },
            headers: {
                'x-workspace-id': '900',
                'user-agent': 'vitest-agent'
            },
            ip: '127.0.0.1',
            originalUrl: '/api/transactions/1',
            method: 'DELETE'
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };

        mockNext = vi.fn();
    });

    it('Deve interceptar P2004 (Violação de RLS) e retornar 403 HTTP com log de auditoria', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'new row violates row-level security policy for table "Transaction"',
            { code: 'P2004', clientVersion: '6.19.2' }
        );

        errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'access_denied',
            message: 'Workspace isolation violated'
        }));

        expect(AuditLogService.logAsync).toHaveBeenCalledWith(expect.objectContaining({
            userId: 101,
            workspaceId: 900,
            entity: 'RLS_VIOLATION',
            action: 'DELETE',
            entityId: 'SECURITY_BLOCK'
        }));
    });

    it('Deve interceptar P2004 comum (Violação de FK) e retornar 400 Bad Request', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'Foreign key constraint failed on the field: `category_id`',
            { code: 'P2004', clientVersion: '6.19.2' }
        );

        errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'bad_request',
            message: 'Database constraint violation'
        }));

        expect(AuditLogService.logAsync).not.toHaveBeenCalled();
    });

    it('Deve retornar 500 para erros desconhecidos do Prisma', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'Table does not exist',
            { code: 'P2021', clientVersion: '6.19.2' }
        );

        errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'error'
        }));
    });
});
