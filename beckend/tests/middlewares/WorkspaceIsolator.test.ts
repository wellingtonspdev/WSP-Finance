import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceMiddleware } from '../../src/middlewares/WorkspaceMiddleware';
import { prisma } from '../../src/lib/prisma';
import { Request, Response } from 'express';

// Mock do prisma
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        workspaceMember: {
            findUnique: vi.fn(),
        },
    },
}));

describe('WorkspaceMiddleware - Zero Trust Isolation', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            user: { id: 1 } as any,
            headers: {
                'x-workspace-id': '99',
            },
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
    });

    it('deve bloquear ACCOUNTANT de acessar workspace PERSONAL com erro 403', async () => {
        // Configura o mock para simular um contador acessando uma conta pessoal
        (prisma.workspaceMember.findUnique as any).mockResolvedValue({
            userId: 1,
            workspaceId: 99,
            role: 'ACCOUNTANT',
            workspace: {
                type: 'PERSONAL'
            }
        });

        await WorkspaceMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
            where: { userId_workspaceId: { userId: 1, workspaceId: 99 } },
            include: { workspace: { select: { type: true } } }
        });

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Accountants cannot access personal workspaces.'
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('deve permitir ACCOUNTANT acessar workspace BUSINESS', async () => {
        // Configura o mock para simular um contador acessando uma conta comercial
        (prisma.workspaceMember.findUnique as any).mockResolvedValue({
            userId: 1,
            workspaceId: 99,
            role: 'ACCOUNTANT',
            workspace: {
                type: 'BUSINESS'
            }
        });

        await WorkspaceMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
        expect((mockRequest as any).workspaceId).toBe(99);
    });

    it('deve permitir OWNER acessar workspace PERSONAL normalmente', async () => {
        // Configura o mock para simular o dono acessando sua conta pessoal
        (prisma.workspaceMember.findUnique as any).mockResolvedValue({
            userId: 1,
            workspaceId: 99,
            role: 'OWNER',
            workspace: {
                type: 'PERSONAL'
            }
        });

        await WorkspaceMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
    });
});
