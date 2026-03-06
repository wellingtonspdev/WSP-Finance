import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedIdentities(prisma: PrismaClient) {
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. WELLINGTON (O Contador B2B2C)
    // Possui seu próprio Workspace "WSP Consultoria" como OWNER.
    const wellington = await prisma.user.create({
        data: {
            name: 'Wellington Contador',
            email: 'auditoria@wsp.finance',
            passwordHash,
            memberships: {
                create: {
                    role: 'OWNER',
                    workspace: {
                        create: { name: 'WSP Consultoria', type: 'BUSINESS' }
                    }
                }
            }
        },
        include: { memberships: true }
    });

    // 2. JOÃO (Marketplace)
    // Possui Conta Pessoal + Conta PJ.
    const joao = await prisma.user.create({
        data: {
            name: 'João Silva',
            email: 'joao@wsp.finance',
            passwordHash,
            memberships: {
                create: [
                    {
                        role: 'OWNER',
                        workspace: { create: { name: 'Conta Pessoal do João', type: 'PERSONAL' } }
                    },
                    {
                        role: 'OWNER',
                        workspace: { create: { name: 'João Dropshipping LTDA', type: 'BUSINESS', taxRate: 6.00 } }
                    }
                ]
            }
        },
        include: { memberships: { include: { workspace: true } } }
    });

    // 3. MARIA (Tech Solutions)
    const maria = await prisma.user.create({
        data: {
            name: 'Maria Oliveira',
            email: 'maria@wsp.finance',
            passwordHash,
            memberships: {
                create: {
                    role: 'OWNER',
                    workspace: { create: { name: 'Maria Tech Solutions', type: 'BUSINESS', taxRate: 15.50 } }
                }
            }
        },
        include: { memberships: { include: { workspace: true } } }
    });

    // 4. CARLOS (O Vazio)
    const carlos = await prisma.user.create({
        data: {
            name: 'Carlos O Vazio',
            email: 'vazio@wsp.finance',
            passwordHash,
            memberships: {
                create: {
                    role: 'OWNER',
                    workspace: { create: { name: 'Empresa do Carlos', type: 'BUSINESS' } }
                }
            }
        }
    });

    // ========= DELEGAÇÃO ONBOARDING SINTÉTICOS =========

    // A. Injetar Wellington como ACCOUNTANT na Joao Dropshipping
    const joaoBusinessId = joao.memberships.find(m => m.workspace.type === 'BUSINESS')?.workspaceId!;
    await prisma.workspaceMember.create({
        data: { userId: wellington.id, workspaceId: joaoBusinessId, role: 'ACCOUNTANT' }
    });

    // B. Injetar Wellington como ACCOUNTANT na Maria Tech
    const mariaBusinessId = maria.memberships[0].workspaceId;
    await prisma.workspaceMember.create({
        data: { userId: wellington.id, workspaceId: mariaBusinessId, role: 'ACCOUNTANT' }
    });

    // C. Injetar Convite Pendente na Workspace do João para testar UI 
    await prisma.workspaceInvite.create({
        data: {
            email: 'novo_auditor@teste.com',
            role: 'ACCOUNTANT',
            token: 'token_fake_123',
            workspaceId: joaoBusinessId,
            inviterId: joao.id,
            expiresAt: new Date(new Date().setDate(new Date().getDate() + 5))
        }
    })

    return {
        wellington,
        joao,
        joaoBusinessId,
        joaoPersonalId: joao.memberships.find(m => m.workspace.type === 'PERSONAL')?.workspaceId!,
        maria,
        mariaBusinessId,
        carlos
    };
}
