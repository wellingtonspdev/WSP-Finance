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
      usersResult,
      workspacesResult,
      adminsResult,
      transactionsResult,
      movementsResult,
      invitesResult,
    ] = await Promise.all([
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "User"'),
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "Workspace"'),
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "User" WHERE "systemRole" = \'ADMIN\''),
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "Transaction"'),
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "BankMovement" WHERE "status" = \'PENDING\''),
      sysPrisma.$queryRawUnsafe<[{ count: unknown }]>('SELECT COUNT(*) as count FROM "WorkspaceInvite" WHERE "status" = \'PENDING\''),
    ]);

    return {
      platform: {
        totalUsers: toSafeNumber(usersResult),
        totalWorkspaces: toSafeNumber(workspacesResult),
        totalAdmins: toSafeNumber(adminsResult),
      },
      activity: {
        totalTransactions: toSafeNumber(transactionsResult),
        pendingMovements: toSafeNumber(movementsResult),
        pendingInvites: toSafeNumber(invitesResult),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

/** Normaliza bigint | string | number | null | undefined | resultado vazio → number */
function toSafeNumber(rows: { count: unknown }[] | undefined): number {
  if (!rows || rows.length === 0) return 0;
  const raw = rows[0]?.count;
  if (raw == null) return 0;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') return parseInt(raw, 10) || 0;
  if (typeof raw === 'number') return raw;
  return 0;
}
