import { Request, Response } from 'express';
import { z } from 'zod';
import { InviteService } from '../services/InviteService';

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
}
