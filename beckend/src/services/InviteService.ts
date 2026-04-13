import { WorkspaceRole, InviteStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
export class InviteService {
    /**
     * Cria um convite para o Workspace.
     * Somente um OWNER pode criar convites.
     */
    async createInvite(workspaceId: number, inviterId: number, emailToInvite: string, role: WorkspaceRole = 'ACCOUNTANT') {
        // 1. Verifica se quem está convidando é OWNER do Workspace
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: inviterId,
                    workspaceId: workspaceId
                }
            }
        });

        if (!membership || membership.role !== 'OWNER') {
            throw new Error('Access denied: only OWNER can invite new members to this workspace.');
        }

        // 2. Verifica se o usuário já não é membro desta workspace
        const targetUser = await prisma.user.findUnique({ where: { email: emailToInvite } });
        if (targetUser) {
            const existingMembership = await prisma.workspaceMember.findUnique({
                where: {
                    userId_workspaceId: {
                        userId: targetUser.id,
                        workspaceId: workspaceId
                    }
                }
            });
            if (existingMembership) {
                throw new Error('User is already a member of this workspace.');
            }
        }

        // 3. Verifica se já existe um convite pendente para este email
        const existingInvite = await prisma.workspaceInvite.findFirst({
            where: {
                workspaceId,
                email: emailToInvite,
                status: 'PENDING'
            }
        });

        if (existingInvite) {
            throw new Error('A pending invite already exists for this email.');
        }

        // 4. Criação do Token Criptográfico (Zero OpEx Smart Link)
        // Para simplificar, vamos gerar um token aleatório seguro ao invés de JWT, já que nós o guardamos no DB com expiração.
        const token = crypto.randomBytes(32).toString('hex');

        // Expira em 7 dias
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await prisma.workspaceInvite.create({
            data: {
                email: emailToInvite,
                role: role,
                token: token,
                status: 'PENDING',
                workspaceId: workspaceId,
                inviterId: inviterId,
                expiresAt: expiresAt
            }
        });

        return invite;
    }

    /**
     * Revoga um convite previamente enviado (Somente OWNER).
     */
    async revokeInvite(workspaceId: number, inviterId: number, inviteId: string) {
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: inviterId,
                    workspaceId: workspaceId
                }
            }
        });

        if (!membership || membership.role !== 'OWNER') {
            throw new Error('Access denied: only OWNER can revoke invites.');
        }

        const invite = await prisma.workspaceInvite.findFirst({
            where: {
                id: inviteId,
                workspaceId: workspaceId
            }
        });

        if (!invite) throw new Error('Invite not found.');
        if (invite.status !== 'PENDING') throw new Error('Invite is not pending anymore.');

        return prisma.workspaceInvite.update({
            where: { id: inviteId },
            data: { status: 'REVOKED' }
        });
    }

    /**
     * Double Handshake Acceptance
     * O usuário alvo clica no link, o front intercepta e bate aqui mandando o Token.
     * O AuthMiddleware vai dizer quem é o usuário logado (acceptingUserId).
     */
    async acceptInvite(token: string, acceptingUserId: number) {
        // 1. Busca o convite pelo Token
        const invite = await prisma.workspaceInvite.findUnique({
            where: { token }
        });

        if (!invite) throw new Error('Invalid or non-existent invite link.');

        if (invite.status === 'REVOKED') throw new Error('Return 403: This invite was revoked by the owner.');
        if (invite.status === 'ACCEPTED') throw new Error('Return 403: This invite was already accepted.');
        if (invite.expiresAt < new Date()) {
            await prisma.workspaceInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
            throw new Error('Return 403: This invite has expired.');
        }

        // 2. Double Handshake Security: Garante que quem está logado tem o e-mail do convite
        const acceptingUser = await prisma.user.findUnique({ where: { id: acceptingUserId } });
        if (!acceptingUser) throw new Error('User not found.');

        if (acceptingUser.email !== invite.email) {
            // FALHA DE SEGURANÇA! (Alguém interceptou o link mas não é o destinatário)
            throw new Error('Return 403: Email Mismatch. This invite is not for your account.');
        }

        // 3. Insere como Membro da Workspace bloqueando Privilege Escalation
        // Independente do que o Hacker mandar na requisição, nós pegamos a ROLE de drento do invite seguro.

        const newMembership = await prisma.$transaction(async (tx) => {
            // A - Cria Associação
            const member = await tx.workspaceMember.create({
                data: {
                    userId: acceptingUserId,
                    workspaceId: invite.workspaceId,
                    role: invite.role // A Extração Segura da Role
                }
            });

            // B - Marca Convite como Aceito
            await tx.workspaceInvite.update({
                where: { id: invite.id },
                data: { status: 'ACCEPTED' }
            });

            return member;
        });

        return newMembership;
    }

    /**
     * Lista convites recebidos pelo email do usuário logado.
     */
    async listReceived(userEmail: string) {
        return prisma.workspaceInvite.findMany({
            where: { email: userEmail },
            include: {
                workspace: { select: { id: true, name: true, type: true } },
                inviter: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Lista convites enviados por um workspace (Somente membros com acesso).
     */
    async listSent(workspaceId: number) {
        return prisma.workspaceInvite.findMany({
            where: { workspaceId },
            include: {
                inviter: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Lista membros de um workspace com dados do usuário.
     */
    async listMembers(workspaceId: number) {
        return prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: { select: { id: true, name: true, email: true, type: true } }
            },
            orderBy: { userId: 'asc' }
        });
    }

    /**
     * Rejeita um convite (Somente o destinatário pode rejeitar).
     * Double Handshake: email do user logado deve bater com email do convite.
     */
    async rejectInvite(inviteId: string, rejectingUserId: number) {
        const invite = await prisma.workspaceInvite.findUnique({
            where: { id: inviteId }
        });

        if (!invite) throw new Error('Invite not found.');
        if (invite.status !== 'PENDING') throw new Error('Return 403: Invite is not pending.');

        const user = await prisma.user.findUnique({ where: { id: rejectingUserId } });
        if (!user || user.email !== invite.email) {
            throw new Error('Return 403: This invite is not for your account.');
        }

        return prisma.workspaceInvite.update({
            where: { id: inviteId },
            data: { status: 'REJECTED' }
        });
    }

    /**
     * Remove um membro de um workspace (Somente OWNER pode remover).
     * O OWNER não pode remover a si mesmo.
     */
    async removeMember(workspaceId: number, requestingUserId: number, targetUserId: number) {
        // 1. Verifica se quem solicita é OWNER
        const requesterMembership = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: requestingUserId,
                    workspaceId
                }
            }
        });

        if (!requesterMembership || requesterMembership.role !== 'OWNER') {
            throw new Error('Return 403: Only the OWNER can remove members.');
        }

        // 2. Não pode remover a si mesmo
        if (requestingUserId === targetUserId) {
            throw new Error('Return 403: You cannot remove yourself from the workspace.');
        }

        // 3. Verifica se o alvo é realmente membro
        const targetMembership = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: targetUserId,
                    workspaceId
                }
            }
        });

        if (!targetMembership) {
            throw new Error('Target user is not a member of this workspace.');
        }

        // 4. Remove o vínculo
        await prisma.workspaceMember.delete({
            where: {
                userId_workspaceId: {
                    userId: targetUserId,
                    workspaceId
                }
            }
        });

        return { message: 'Member removed successfully', removedUserId: targetUserId };
    }
}
