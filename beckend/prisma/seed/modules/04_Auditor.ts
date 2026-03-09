import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * MÓDULO 04 — AUDITOR (AuditLogs + Chaos Edge Cases) — Seed V3.0
 * 
 * - 30+ AuditLogs distribuídos temporalmente (30 dias)
 * - Edge cases: saldo negativo, inadimplência, texto longo, rateio decimal
 * - Transações pendentes (PENDING) vencidas para simular risco
 */

const AUDIT_TEMPLATES = [
    { action: 'CREATE' as const, entity: 'Transaction', desc: 'Nova transação de venda criada pelo sistema' },
    { action: 'UPDATE' as const, entity: 'Transaction', desc: 'Valor de despesa reclassificado' },
    { action: 'ATTACHMENT_VIEW' as const, entity: 'Transaction', desc: 'Contador visualizou comprovante fiscal' },
    { action: 'CATEGORY_UPDATE' as const, entity: 'Category', desc: 'Categoria reclassificada pelo auditor' },
    { action: 'BRIDGE_TRANSFER' as const, entity: 'Account', desc: 'Pró-labore transferido PJ→PF' },
    { action: 'CREATE' as const, entity: 'Account', desc: 'Nova conta bancária cadastrada' },
    { action: 'LOGIN' as const, entity: 'User', desc: 'Login realizado com sucesso' },
    { action: 'UPDATE' as const, entity: 'Transaction', desc: 'Descrição de transação corrigida' },
    { action: 'ATTACHMENT_VIEW' as const, entity: 'Transaction', desc: 'Anexo de NF visualizado' },
    { action: 'CREATE' as const, entity: 'Transaction', desc: 'Lançamento de despesa fixa mensal' },
];

export async function seedAuditAndChaos(
    prisma: PrismaClient,
    identities: any,
    structures: any,
    workspaces: any
) {
    let auditCount = 0;
    let chaosCount = 0;

    // ═══════════════════════════════════════════════════════════════
    // CHAOS ENGINE — Edge Cases
    // ═══════════════════════════════════════════════════════════════

    const mariaStruct = structures.business['mariaBusinessId'];
    const joaoStruct = structures.business['joaoBusinessId'];

    // 1. Inadimplência — Despesa PENDING vencida há 90 dias
    if (joaoStruct) {
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - 3);

        await prisma.transaction.create({
            data: {
                description: 'Documento Bloqueado Judicialmente (Inadimplência de Fornecedor)',
                amount: new Decimal('5000.00'),
                date: pastDate,
                dueDate: pastDate,
                type: 'EXPENSE',
                status: 'PENDING',
                accountId: joaoStruct.checkingId,
                categoryId: joaoStruct.catTaxId,
                workspaceId: workspaces.joaoBusinessId,
            }
        });
        chaosCount++;
    }

    // 2. Texto Ultra-Longo (Stress test do line-clamp mobile)
    if (mariaStruct) {
        await prisma.transaction.create({
            data: {
                description: 'Aquisição de suprimentos de informática urgentes contendo 35 monitores, 12 teclados mecânicos importados da Alemanha onde o fornecedor atrasou a entrega no porto de Santos e gerou uma multa aduaneira massiva que precisamos contestar via tribunal federal de pequenas causas mas que contabilidade não aprovou o lançamento por falta de documentação fiscal adequada.',
                amount: new Decimal('125000.00'),
                date: new Date(),
                type: 'EXPENSE',
                status: 'COMPLETED',
                accountId: mariaStruct.checkingId,
                categoryId: mariaStruct.catRentId,
                workspaceId: workspaces.mariaBusinessId,
            }
        });
        chaosCount++;
    }

    // 3. Saldo Negativo Forçado (Cheque Especial na Maria — simulando risco)
    if (mariaStruct) {
        await prisma.account.update({
            where: { id: mariaStruct.reserveId },
            data: { balance: new Decimal('-3200.50') }
        });
    }

    // 4. Rateio Decimal Infinito (Stress test de Decimal)
    if (joaoStruct) {
        await prisma.transaction.create({
            data: {
                description: 'Rateio de Custo Fixo (1/3 de R$ 1.000,00)',
                amount: new Decimal('333.3333'),
                date: new Date(),
                type: 'EXPENSE',
                status: 'COMPLETED',
                accountId: joaoStruct.checkingId,
                categoryId: joaoStruct.catEnergyId,
                workspaceId: workspaces.joaoBusinessId,
            }
        });
        chaosCount++;
    }

    // 5. Despesas PENDING vencidas na Maria (gerar risco)
    if (mariaStruct) {
        const vencimentos = [7, 15, 22, 30]; // dias atrás
        for (const diasAtras of vencimentos) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() - diasAtras);

            await prisma.transaction.create({
                data: {
                    description: `Conta a Pagar Vencida (${diasAtras}d atrás)`,
                    amount: new Decimal(String(800 + Math.random() * 2000)),
                    date: dueDate,
                    dueDate,
                    type: 'EXPENSE',
                    status: 'PENDING',
                    accountId: mariaStruct.checkingId,
                    categoryId: mariaStruct.catTaxId,
                    workspaceId: workspaces.mariaBusinessId,
                }
            });
            chaosCount++;
        }
    }

    console.log(`  → ${chaosCount} edge cases de chaos injetados`);

    // ═══════════════════════════════════════════════════════════════
    // AUDIT ENGINE — 30+ AuditLogs distribuídos nos últimos 30 dias
    // ═══════════════════════════════════════════════════════════════

    // Distribuir logs entre os workspaces dos clientes ativos
    const auditTargets = [
        { wsId: workspaces.joaoBusinessId, userId: identities.wellington.id },
        { wsId: workspaces.mariaBusinessId, userId: identities.wellington.id },
        { wsId: workspaces.anaBusinessId, userId: identities.wellington.id },
        { wsId: workspaces.lucasBusinessId, userId: identities.wellington.id },
        { wsId: workspaces.pedroBusinessId, userId: identities.wellington.id },
        { wsId: workspaces.mariaBusinessId, userId: identities.clients.maria.id },
        { wsId: workspaces.joaoBusinessId, userId: identities.clients.joao.id },
    ];

    for (let i = 0; i < 35; i++) {
        const target = auditTargets[i % auditTargets.length];
        const template = AUDIT_TEMPLATES[i % AUDIT_TEMPLATES.length];
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        createdAt.setHours(Math.floor(Math.random() * 14) + 8); // 08h-22h
        createdAt.setMinutes(Math.floor(Math.random() * 60));

        const ips = ['192.168.0.1', '10.0.0.15', '177.184.22.91', '201.17.132.8', '2804:14d:8a8e::1'];

        await prisma.auditLog.create({
            data: {
                userId: target.userId,
                workspaceId: target.wsId,
                action: template.action,
                entity: template.entity,
                entityId: String(Math.floor(Math.random() * 500) + 1),
                newState: { description: template.desc, timestamp: createdAt.toISOString() },
                ipAddress: ips[i % ips.length],
                userAgent: i % 2 === 0
                    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0'
                    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3) Safari/604.1',
                createdAt,
            }
        });
        auditCount++;
    }

    // Audit Especial: Transação mascarada (Maria tentando esconder valor)
    if (mariaStruct) {
        const txAlvo = await prisma.transaction.create({
            data: {
                description: 'Compra Suspeita de Servidor Premium',
                amount: new Decimal('8500.00'),
                date: new Date(),
                type: 'EXPENSE',
                status: 'COMPLETED',
                accountId: mariaStruct.checkingId,
                categoryId: mariaStruct.catRentId,
                workspaceId: workspaces.mariaBusinessId,
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: identities.clients.maria.id,
                workspaceId: workspaces.mariaBusinessId,
                action: 'CREATE',
                entity: 'Transaction',
                entityId: txAlvo.id,
                newState: JSON.parse(JSON.stringify(txAlvo)),
                ipAddress: '192.168.0.1',
            }
        });

        const txAtualizada = await prisma.transaction.update({
            where: { id: txAlvo.id },
            data: { amount: new Decimal('850.00'), description: 'Compra de Material de Escritório' }
        });

        await prisma.auditLog.create({
            data: {
                userId: identities.clients.maria.id,
                workspaceId: workspaces.mariaBusinessId,
                action: 'UPDATE',
                entity: 'Transaction',
                entityId: txAtualizada.id,
                oldState: JSON.parse(JSON.stringify(txAlvo)),
                newState: JSON.parse(JSON.stringify(txAtualizada)),
                ipAddress: '192.168.0.1',
            }
        });
        auditCount += 2;
    }

    console.log(`  → ${auditCount} audit logs injetados`);
    return { chaosCount, auditCount };
}
