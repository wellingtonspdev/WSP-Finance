import { PrismaClient, WorkspaceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addDays, subDays } from 'date-fns';

/**
 * MÓDULO 01 — IDENTIDADES & WORKSPACES (Seed V3.0)
 * 
 * Personas:
 *  - Wellington "Sênior" (ACCOUNTANT) → 10 workspaces BUSINESS vinculados
 *  - Fernanda "Iniciante" (ACCOUNTANT) → 0 workspaces ativos (apenas convites PENDING)
 *  - João, Maria, Pedro, Ana, Lucas, Carlos, Rafael, Bruno, Thiago, Daniel (CLIENT)
 *  - Platform Admin (Backoffice isolado)
 * 
 * Segurança:
 *  - emailVerifiedAt setado em todos os users
 *  - user.type = ACCOUNTANT para contadores (evita bug no WorkspaceGuard)
 */

interface IdentitiesResult {
    wellington: any;
    fernanda: any;
    platformAdmin: any;
    clients: {
        joao: any;
        maria: any;
        pedro: any;
        ana: any;
        lucas: any;
        carlos: any;
        rafael: any;
        bruno: any;
        thiago: any;
        daniel: any;
    };
    workspaces: {
        joaoPersonalId: number;
        joaoBusinessId: number;
        mariaPersonalId: number;
        mariaBusinessId: number;
        pedroPersonalId: number;
        pedroBusinessId: number;
        anaPersonalId: number;
        anaBusinessId: number;
        lucasPersonalId: number;
        lucasBusinessId: number;
        carlosBusinessId: number;
        rafaelPersonalId: number;
        rafaelBusinessId: number;
        brunoPersonalId: number;
        brunoBusinessId: number;
        thiagoPersonalId: number;
        thiagoBusinessId: number;
        danielPersonalId: number;
        danielBusinessId: number;
        wellingtonConsultoriaId: number;
        fernandaContabilidadeId: number;
    };
}

export async function seedIdentities(prisma: PrismaClient): Promise<IdentitiesResult> {
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date();

    // ═══════════════════════════════════════════════════════════════
    // PLATFORM ADMIN (Backoffice isolado)
    // ═══════════════════════════════════════════════════════════════

    const platformAdmin = await prisma.user.upsert({
        where: { email: 'admin@wsp.finance' },
        update: {},
        create: {
            name: 'Platform Admin',
            email: 'admin@wsp.finance',
            passwordHash,
            type: 'CLIENT',
            systemRole: 'ADMIN',
            emailVerifiedAt: now,
            cpf: '000.000.000-00',
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTADORES (type: ACCOUNTANT, emailVerifiedAt: now)
    // ═══════════════════════════════════════════════════════════════

    let wellington: any = await prisma.user.upsert({
        where: { email: 'auditoria@wsp.finance' },
        update: {},
        create: {
            name: 'Wellington Contador',
            email: 'auditoria@wsp.finance',
            passwordHash,
            type: 'ACCOUNTANT',
            systemRole: 'USER',
            emailVerifiedAt: now,
            cpf: '111.222.333-44',
            phone: '(11) 98765-4321',
        }
    });
    let wellingtonMembership: any = await prisma.workspaceMember.findFirst({
        where: { userId: wellington.id, workspace: { name: 'WSP Consultoria Contábil' } },
        include: { workspace: true }
    });
    if (!wellingtonMembership) {
        wellingtonMembership = await prisma.workspaceMember.create({
            data: {
                role: 'OWNER',
                user: { connect: { id: wellington.id } },
                workspace: { create: { name: 'WSP Consultoria Contábil', type: WorkspaceType.BUSINESS } }
            },
            include: { workspace: true }
        });
    }
    wellington = await prisma.user.findUnique({ where: { id: wellington.id }, include: { memberships: { include: { workspace: true } } } }) as any;

    let fernanda: any = await prisma.user.upsert({
        where: { email: 'fernanda@contabil.com' },
        update: {},
        create: {
            name: 'Fernanda Silva',
            email: 'fernanda@contabil.com',
            passwordHash,
            type: 'ACCOUNTANT',
            emailVerifiedAt: now,
            cpf: '555.666.777-88',
            phone: '(21) 91234-5678',
        }
    });
    let fernandaMembership: any = await prisma.workspaceMember.findFirst({
        where: { userId: fernanda.id, workspace: { name: 'Fernanda Contabilidade' } },
        include: { workspace: true }
    });
    if (!fernandaMembership) {
        fernandaMembership = await prisma.workspaceMember.create({
            data: {
                role: 'OWNER',
                user: { connect: { id: fernanda.id } },
                workspace: { create: { name: 'Fernanda Contabilidade', type: WorkspaceType.BUSINESS } }
            },
            include: { workspace: true }
        });
    }
    fernanda = await prisma.user.findUnique({ where: { id: fernanda.id }, include: { memberships: { include: { workspace: true } } } }) as any;

    // ═══════════════════════════════════════════════════════════════
    // CLIENTES (type: CLIENT, emailVerifiedAt: now)
    // Cada um com PERSONAL + BUSINESS workspace
    // ═══════════════════════════════════════════════════════════════

    const nowRaw = new Date();
    const lastMonthEnd = new Date(nowRaw.getFullYear(), nowRaw.getMonth(), 0);
    const twoMonthsAgoEnd = new Date(nowRaw.getFullYear(), nowRaw.getMonth() - 1, 0);

    const clientConfigs = [
        { name: 'João Silva', email: 'joao@wsp.finance', bizName: 'João Dropshipping LTDA', taxRate: 6.00, cnae: '4761003', doc: '12.345.678/0001-90', docType: 'CNPJ' as const, closedUntil: lastMonthEnd, certExp: addDays(nowRaw, 30) },
        { name: 'Maria Oliveira', email: 'maria@wsp.finance', bizName: 'Maria Tech Solutions', taxRate: 15.50, cnae: '6201501', doc: '98.765.432/0001-10', docType: 'CNPJ' as const, closedUntil: twoMonthsAgoEnd, certExp: addDays(nowRaw, 10) },
        { name: 'Pedro Santos', email: 'pedro@wsp.finance', bizName: 'Pedro Logistics MEI', taxRate: 0.00, cnae: '5320202', doc: '11.222.333/0001-44', docType: 'CNPJ' as const, closedUntil: null, certExp: subDays(nowRaw, 5) },
        { name: 'Ana Costa', email: 'ana@wsp.finance', bizName: 'Ana Café Gourmet', taxRate: 6.00, cnae: '5611201', doc: '22.333.444/0001-55', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Lucas Ferreira', email: 'lucas@wsp.finance', bizName: 'Lucas Dev Studio', taxRate: 6.00, cnae: '6201501', doc: '33.444.555/0001-66', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Carlos Rocha', email: 'carlos@wsp.finance', bizName: 'Carlos Comércio Varejista', taxRate: 4.00, cnae: '4712100', doc: '44.555.666/0001-77', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Rafael Mendes', email: 'rafael@wsp.finance', bizName: 'Rafael Marketing Digital', taxRate: 6.00, cnae: '7311400', doc: '55.666.777/0001-88', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Bruno Almeida', email: 'bruno@wsp.finance', bizName: 'Bruno Engenharia Civil', taxRate: 11.33, cnae: '7112000', doc: '66.777.888/0001-99', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Thiago Nascimento', email: 'thiago@wsp.finance', bizName: 'Thiago Advocacia', taxRate: 6.00, cnae: '6911701', doc: '77.888.999/0001-00', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
        { name: 'Daniel Ribeiro', email: 'daniel@wsp.finance', bizName: 'Daniel Fotografia', taxRate: 6.00, cnae: '7420001', doc: '88.999.000/0001-11', docType: 'CNPJ' as const, closedUntil: null, certExp: null },
    ];

    const clientUsers: any = {};
    const clientKeys = ['joao', 'maria', 'pedro', 'ana', 'lucas', 'carlos', 'rafael', 'bruno', 'thiago', 'daniel'];

    for (let i = 0; i < clientConfigs.length; i++) {
        const cfg = clientConfigs[i];
        let user: any = await prisma.user.upsert({
            where: { email: cfg.email },
            update: {},
            create: {
                name: cfg.name,
                email: cfg.email,
                passwordHash,
                type: 'CLIENT',
                emailVerifiedAt: now,
            }
        });
        
        let bizWorkspace: any = await prisma.workspaceMember.findFirst({
            where: { userId: user.id, workspace: { type: WorkspaceType.BUSINESS } },
            include: { workspace: true }
        });
        
        if (!bizWorkspace) {
            await prisma.workspaceMember.create({
                data: {
                    role: 'OWNER',
                    user: { connect: { id: user.id } },
                    workspace: {
                        create: {
                            name: cfg.bizName,
                            type: WorkspaceType.BUSINESS,
                            taxRate: cfg.taxRate,
                            cnae: cfg.cnae,
                            document: cfg.doc,
                            documentType: cfg.docType,
                            closedUntil: cfg.closedUntil,
                            certificateExpiresAt: cfg.certExp,
                            certificateObjectKey: cfg.certExp ? `certs/dummy_${cfg.doc}.pfx` : null
                        }
                    }
                }
            });
            await prisma.workspaceMember.create({
                data: {
                    role: 'OWNER',
                    user: { connect: { id: user.id } },
                    workspace: { create: { name: `Conta Pessoal de ${cfg.name.split(' ')[0]}`, type: WorkspaceType.PERSONAL } }
                }
            });
        }
        user = await prisma.user.findUnique({ where: { id: user.id }, include: { memberships: { include: { workspace: true } } } }) as any;
        clientUsers[clientKeys[i]] = user;
    }

    // ═══════════════════════════════════════════════════════════════
    // DELEGAÇÃO: Wellington como ACCOUNTANT em 10 workspaces BUSINESS
    // ═══════════════════════════════════════════════════════════════

    const getBusinessId = (user: any) => user.memberships.find((m: any) => m.workspace.type === 'BUSINESS')?.workspaceId!;
    const getPersonalId = (user: any) => user.memberships.find((m: any) => m.workspace.type === 'PERSONAL')?.workspaceId!;

    const wellingtonClientKeys = clientKeys; // Todos os 10 clientes
    for (const key of wellingtonClientKeys) {
        const workspaceId = getBusinessId(clientUsers[key]);
        if (workspaceId) {
            await prisma.workspaceMember.upsert({
                where: { userId_workspaceId: { userId: wellington.id, workspaceId } },
                update: { role: 'ACCOUNTANT' },
                create: {
                    userId: wellington.id,
                    workspaceId,
                    role: 'ACCOUNTANT'
                }
            });
        }
    }

    console.log(`  → Wellington vinculado como ACCOUNTANT a ${wellingtonClientKeys.length} workspaces`);
    console.log(`  → Fernanda: 0 workspaces ativos (convites serão criados no módulo 05)`);

    // ═══════════════════════════════════════════════════════════════
    // MAPEAMENTO DE IDs
    // ═══════════════════════════════════════════════════════════════

    return {
        wellington,
        fernanda,
        platformAdmin,
        clients: clientUsers,
        workspaces: {
            joaoPersonalId: getPersonalId(clientUsers.joao),
            joaoBusinessId: getBusinessId(clientUsers.joao),
            mariaPersonalId: getPersonalId(clientUsers.maria),
            mariaBusinessId: getBusinessId(clientUsers.maria),
            pedroPersonalId: getPersonalId(clientUsers.pedro),
            pedroBusinessId: getBusinessId(clientUsers.pedro),
            anaPersonalId: getPersonalId(clientUsers.ana),
            anaBusinessId: getBusinessId(clientUsers.ana),
            lucasPersonalId: getPersonalId(clientUsers.lucas),
            lucasBusinessId: getBusinessId(clientUsers.lucas),
            carlosBusinessId: getBusinessId(clientUsers.carlos),
            rafaelPersonalId: getPersonalId(clientUsers.rafael),
            rafaelBusinessId: getBusinessId(clientUsers.rafael),
            brunoPersonalId: getPersonalId(clientUsers.bruno),
            brunoBusinessId: getBusinessId(clientUsers.bruno),
            thiagoPersonalId: getPersonalId(clientUsers.thiago),
            thiagoBusinessId: getBusinessId(clientUsers.thiago),
            danielPersonalId: getPersonalId(clientUsers.daniel),
            danielBusinessId: getBusinessId(clientUsers.daniel),
            wellingtonConsultoriaId: wellington.memberships[0].workspaceId,
            fernandaContabilidadeId: fernanda.memberships[0].workspaceId,
        }
    };
}
