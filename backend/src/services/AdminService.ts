/**
 * AdminService — Métricas agregadas da plataforma (Backoffice)
 *
 * LGPD Guard:
 * Este service faz bypass controlado do RLS apenas para métricas globais
 * agregadas da plataforma. É proibido selecionar ou retornar linhas de tenant,
 * PII, descrições, valores financeiros, URLs de anexos, e-mails, CPF/CNPJ,
 * nomes, IDs ou qualquer dado individual de cliente.
 */

import { sysPrisma } from '../lib/prisma';

export interface PlatformMetrics {
  platform: {
    totalUsers: number;
    totalWorkspaces: number;
    totalAdmins: number;
  };
  activity: {
    totalTransactions: number;
    pendingMovements: number;
    pendingInvites: number;
  };
  generatedAt: string;
}

export class AdminService {
  async getGlobalMetrics(): Promise<PlatformMetrics> {
    const [
      totalUsers,
      totalWorkspaces,
      totalAdmins,
      totalTransactions,
      pendingMovements,
      pendingInvites,
    ] = await Promise.all([
      sysPrisma.user.count(),
      sysPrisma.workspace.count(),
      sysPrisma.user.count({ where: { systemRole: 'ADMIN' } }),
      sysPrisma.transaction.count(),
      sysPrisma.bankMovement.count({ where: { status: 'PENDING' } }),
      sysPrisma.workspaceInvite.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      platform: {
        totalUsers,
        totalWorkspaces,
        totalAdmins,
      },
      activity: {
        totalTransactions,
        pendingMovements,
        pendingInvites,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
