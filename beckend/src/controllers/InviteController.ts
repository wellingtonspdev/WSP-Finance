import { Request, Response } from 'express';
import { z } from 'zod';
import { InviteService } from '../services/InviteService';
import { prisma } from '../lib/prisma';

export class InviteController {
    private inviteService: InviteService;

    constructor() {
        this.inviteService = new InviteService();
    }

    /**
     * Endpoint: POST /workspaces/:id/invites
     * Role req.: O middleware validou que a pessoa tem acesso. O service validará se é OWNER.
     */
    async create(req: Request, res: Response) {
        const inviteSchema = z.object({
            email: z.string().email(),
            role: z.enum(['ACCOUNTANT', 'EDITOR', 'VIEWER']).default('ACCOUNTANT')
        });

        const paramsSchema = z.object({
            id: z.string().transform(Number)
        });

        try {
            const { email, role } = inviteSchema.parse(req.body);
            const { id: workspaceId } = paramsSchema.parse(req.params);
            const inviterId = req.user.id; // From AuthMiddleware

            const invite = await this.inviteService.createInvite(workspaceId, inviterId, email, role);

            return res.status(201).json({
                message: 'Invite generated successfully',
                token: invite.token,
                expiresAt: invite.expiresAt
            });
        } catch (err: any) {
            if (err.message.includes('Access denied') || err.message.includes('already exists') || err.message.includes('already a member')) {
                return res.status(403).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: POST /workspaces/:id/invites/:inviteId/revoke
     */
    async revoke(req: Request, res: Response) {
        const paramsSchema = z.object({
            id: z.string().transform(Number),
            inviteId: z.string() // UUID
        });

        try {
            const { id: workspaceId, inviteId } = paramsSchema.parse(req.params);
            const inviterId = req.user.id;

            await this.inviteService.revokeInvite(workspaceId, inviterId, inviteId);
            return res.status(200).json({ message: 'Invite revoked successfully' });
        } catch (err: any) {
            if (err.message.includes('Access denied') || err.message.includes('not found') || err.message.includes('not pending')) {
                return res.status(403).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: POST /invites/accept
     * Requer que o usuário destinatário esteja logado.
     */
    async accept(req: Request, res: Response) {
        const acceptSchema = z.object({
            token: z.string()
        });

        try {
            const { token } = acceptSchema.parse(req.body);
            const acceptingUserId = req.user.id; // Current logged in user from AuthMiddleware

            const membership = await this.inviteService.acceptInvite(token, acceptingUserId);

            return res.status(200).json({
                message: 'Invite accepted successfully',
                workspaceId: membership.workspaceId,
                role: membership.role
            });
        } catch (err: any) {
            if (err.message.includes('Return 403')) {
                return res.status(403).json({ message: err.message.replace('Return 403: ', '') });
            }
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: GET /invites/received
     * Lista convites recebidos pelo email do usuário logado.
     */
    async listReceived(req: Request, res: Response) {
        try {
            const userId = req.user.id;
            // Precisa buscar o email do user pelo ID (vem do JWT)
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(404).json({ message: 'User not found' });

            const invites = await this.inviteService.listReceived(user.email);
            return res.status(200).json(invites);
        } catch (err: any) {
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: GET /workspaces/:id/invites
     * Lista convites enviados por um workspace.
     */
    async listSent(req: Request, res: Response) {
        const paramsSchema = z.object({
            id: z.string().transform(Number)
        });

        try {
            const { id: workspaceId } = paramsSchema.parse(req.params);
            const invites = await this.inviteService.listSent(workspaceId);
            return res.status(200).json(invites);
        } catch (err: any) {
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: GET /workspaces/:id/members
     * Lista membros de um workspace.
     */
    async listMembers(req: Request, res: Response) {
        const paramsSchema = z.object({
            id: z.string().transform(Number)
        });

        try {
            const { id: workspaceId } = paramsSchema.parse(req.params);
            const members = await this.inviteService.listMembers(workspaceId);
            return res.status(200).json(members);
        } catch (err: any) {
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: POST /invites/:id/reject
     * Rejeitar um convite recebido.
     */
    async reject(req: Request, res: Response) {
        const paramsSchema = z.object({
            id: z.string() // UUID
        });

        try {
            const { id: inviteId } = paramsSchema.parse(req.params);
            const rejectingUserId = req.user.id;

            await this.inviteService.rejectInvite(inviteId, rejectingUserId);
            return res.status(200).json({ message: 'Invite rejected successfully' });
        } catch (err: any) {
            if (err.message.includes('Return 403')) {
                return res.status(403).json({ message: err.message.replace('Return 403: ', '') });
            }
            if (err.message.includes('not found')) {
                return res.status(404).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message });
        }
    }

    /**
     * Endpoint: DELETE /workspaces/:id/members/:userId
     * Remover um membro do workspace (apenas OWNER).
     */
    async removeMember(req: Request, res: Response) {
        const paramsSchema = z.object({
            id: z.string().transform(Number),
            userId: z.string().transform(Number)
        });

        try {
            const { id: workspaceId, userId: targetUserId } = paramsSchema.parse(req.params);
            const requestingUserId = req.user.id;

            const result = await this.inviteService.removeMember(workspaceId, requestingUserId, targetUserId);
            return res.status(200).json(result);
        } catch (err: any) {
            if (err.message.includes('Return 403')) {
                return res.status(403).json({ message: err.message.replace('Return 403: ', '') });
            }
            if (err.message.includes('not a member')) {
                return res.status(404).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message });
        }
    }
}
