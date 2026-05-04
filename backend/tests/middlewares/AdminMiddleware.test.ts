import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminMiddleware } from '../../src/middlewares/AdminMiddleware';
import { sysPrisma } from '../../src/lib/prisma';
import { Request, Response } from 'express';

// Mock do prisma
vi.mock('../../src/lib/prisma', () => ({
    sysPrisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

describe('AdminMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockRequest = {
            user: { id: 1 } as any,
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
    });

    it('T1 - deve retornar 403 se systemRole for USER', async () => {
        (sysPrisma.user.findUnique as any).mockResolvedValue({
            systemRole: 'USER'
        });

        await AdminMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(sysPrisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
            select: { systemRole: true }
        });

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Acesso negado: Requer privilégios de administrador.'
        });
        expect(nextFunction).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith('[AdminMiddleware] Usuário 1 tentou acessar rota admin sem privilégios.');
        expect((mockRequest as any).workspaceId).toBeUndefined();
    });

    it('T2 - deve chamar next() se systemRole for ADMIN', async () => {
        mockRequest.user = { id: 2 } as any;
        (sysPrisma.user.findUnique as any).mockResolvedValue({
            systemRole: 'ADMIN'
        });

        await AdminMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(sysPrisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 2 },
            select: { systemRole: true }
        });

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('[AdminMiddleware] Acesso admin concedido ao usuário 2.');
        expect((mockRequest as any).workspaceId).toBeUndefined();
    });

    it('T3 - deve retornar 403 se usuário não for encontrado no banco', async () => {
        mockRequest.user = { id: 999 } as any;
        (sysPrisma.user.findUnique as any).mockResolvedValue(null);

        await AdminMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(sysPrisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 999 },
            select: { systemRole: true }
        });

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Acesso negado: Usuário não encontrado ou privilégios insuficientes.'
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('T4 - deve retornar 401 se não houver usuário autenticado', async () => {
        mockRequest.user = undefined;

        await AdminMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(sysPrisma.user.findUnique).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Autenticação necessária para acesso admin.'
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('T5 - deve retornar 500 em caso de erro no Prisma', async () => {
        const dbError = new Error('Database down');
        (sysPrisma.user.findUnique as any).mockRejectedValue(dbError);

        await AdminMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Erro interno ao validar privilégios de administrador.'
        });
        expect(nextFunction).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('AdminMiddleware Error:', dbError);
    });
});
