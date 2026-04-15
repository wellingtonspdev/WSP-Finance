import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * MÓDULO 05 — LIFECYCLE (Convites + Notificações) — Seed V3.0
 * 
 * - 6 WorkspaceInvites em 4 status diferentes (PENDING, ACCEPTED, EXPIRED, REVOKED)
 * - 12+ Notifications para o feed do sino (🔔) dos contadores
 */

export async function seedLifeCycle(
    prisma: PrismaClient,
    identities: any,
    workspaces: any
) {
    let inviteCount = 0;
    let notifCount = 0;

    // ═══════════════════════════════════════════════════════════════
    // CONVITES (WorkspaceInvite)
    // ═══════════════════════════════════════════════════════════════

    const now = new Date();
    const futureDate = new Date(now); futureDate.setDate(futureDate.getDate() + 5);
    const pastDate3d = new Date(now); pastDate3d.setDate(pastDate3d.getDate() - 3);
    const pastDate10d = new Date(now); pastDate10d.setDate(pastDate10d.getDate() - 10);

    const invites = [
        {
            // 1. PENDING — Fernanda pode aceitar e ver Pedro no Hub
            email: 'fernanda@contabil.com',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'PENDING' as const,
            workspaceId: workspaces.pedroBusinessId,
            inviterId: identities.clients.pedro.id,
            expiresAt: futureDate,
        },
        {
            // 2. PENDING — Convite para user inexistente (testa criação de conta)
            email: 'novo_contador@teste.com',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'PENDING' as const,
            workspaceId: workspaces.joaoBusinessId,
            inviterId: identities.clients.joao.id,
            expiresAt: futureDate,
        },
        {
            // 3. EXPIRED — Token expirado há 3 dias (testa bloqueio de aceitação)
            email: 'expirado@teste.com',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'EXPIRED' as const,
            workspaceId: workspaces.mariaBusinessId,
            inviterId: identities.clients.maria.id,
            expiresAt: pastDate3d,
        },
        {
            // 4. REVOKED — Token revogado pelo OWNER
            email: 'revogado@teste.com',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'REVOKED' as const,
            workspaceId: workspaces.anaBusinessId,
            inviterId: identities.clients.ana.id,
            expiresAt: futureDate,
        },
        {
            // 5. ACCEPTED — Rastro de convite aceito (Wellington em Lucas)
            email: 'auditoria@wsp.finance',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'ACCEPTED' as const,
            workspaceId: workspaces.lucasBusinessId,
            inviterId: identities.clients.lucas.id,
            expiresAt: pastDate10d,
        },
        {
            // 6. EXPIRED — Segundo convite para Fernanda, expirado
            email: 'fernanda@contabil.com',
            role: 'ACCOUNTANT' as const,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'EXPIRED' as const,
            workspaceId: workspaces.mariaBusinessId,
            inviterId: identities.clients.maria.id,
            expiresAt: pastDate10d,
        },
    ];

    for (const invite of invites) {
        await prisma.workspaceInvite.create({ data: invite });
        inviteCount++;
    }

    console.log(`  → ${inviteCount} convites criados (2 PENDING, 2 EXPIRED, 1 ACCEPTED, 1 REVOKED)`);

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICAÇÕES (Feed do 🔔)
    // ═══════════════════════════════════════════════════════════════

    const wellingtonNotifs = [
        { title: '🔴 Alerta de Risco', message: 'Maria Tech Solutions possui 40 transações sem comprovante fiscal nos últimos 30 dias.', daysAgo: 0 },
        { title: '🟡 Convite Pendente', message: 'Pedro Logistics MEI enviou um convite para Fernanda Silva.', daysAgo: 0 },
        { title: '✅ Conciliação Concluída', message: 'João Dropshipping LTDA: Extrato bancário conciliado com 100% dos lançamentos.', daysAgo: 1 },
        { title: '🔔 Nova Transação', message: 'Ana Café Gourmet registrou uma venda de R$ 1.250,00.', daysAgo: 1 },
        { title: '⚠️ Inadimplência Detectada', message: 'João Dropshipping LTDA possui despesa PENDING vencida há 90 dias.', daysAgo: 2 },
        { title: '📊 Relatório Mensal', message: 'Resumo de fevereiro disponível para 10 clientes. Acesse a Torre de Comando.', daysAgo: 3 },
        { title: '🔐 Acesso Auditado', message: 'Sua sessão de auditoria no workspace Maria Tech foi registrada.', daysAgo: 4 },
        { title: '✅ DAS Provisionado', message: 'Lucas Dev Studio: DAS de março calculado automaticamente (R$ 412,80).', daysAgo: 5 },
        { title: '🔴 Saldo Negativo', message: 'Maria Tech Solutions: Conta Reserva com saldo de -R$ 3.200,50.', daysAgo: 6 },
        { title: '📎 Anexo Pendente', message: 'Bruno Engenharia Civil: 3 transações do mês atual sem comprovante.', daysAgo: 7 },
        { title: '✅ Cliente Ativo', message: 'Rafael Marketing Digital: Todas as obrigações fiscais em dia.', daysAgo: 10 },
        { title: '🔔 Novo Cliente', message: 'Daniel Fotografia aceitou seu convite e foi vinculado à sua carteira.', daysAgo: 14 },
    ];

    for (const notif of wellingtonNotifs) {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - notif.daysAgo);
        createdAt.setHours(9, Math.floor(Math.random() * 30));

        await prisma.notification.create({
            data: {
                userId: identities.wellington.id,
                title: notif.title,
                message: notif.message,
                isRead: notif.daysAgo > 3, // Notificações antigas marcadas como lidas
                createdAt,
            }
        });
        notifCount++;
    }

    // Notificações para Fernanda (estado vazio / onboarding)
    const fernandaNotifs = [
        { title: '👋 Bem-vinda ao WSP Finance', message: 'Configure seu escritório e comece a receber clientes.', daysAgo: 0 },
        { title: '📩 Convite Pendente', message: 'Pedro Logistics MEI te enviou um convite para auditoria. Aceite para ver os dados.', daysAgo: 0 },
    ];

    for (const notif of fernandaNotifs) {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - notif.daysAgo);

        await prisma.notification.create({
            data: {
                userId: identities.fernanda.id,
                title: notif.title,
                message: notif.message,
                isRead: false,
                createdAt,
            }
        });
        notifCount++;
    }

    console.log(`  → ${notifCount} notificações criadas`);
    return { inviteCount, notifCount };
}
