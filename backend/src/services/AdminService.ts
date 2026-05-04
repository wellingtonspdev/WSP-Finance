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

/**
 * Converte valores de COUNT(*) (bigint, string, number, null) para number.
 */
function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'number') return value;
  return 0;
}

/**
 * Extrai o count de um resultado de query raw.
 */
function extractCount(rows: Array<{ count: unknown }>): number {
  if (!rows || rows.length === 0) return 0;
  return toSafeNumber(rows[0].count);
}

export class AdminService {
  async getGlobalMetrics(): Promise<PlatformMetrics> {
    const [
      usersResult,
      workspacesResult,
      adminsResult,
      transactionsResult,
      pendingMovementsResult,
      pendingInvitesResult,
    ] = await Promise.all([
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "User"'),
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Workspace"'),
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "User" WHERE "systemRole" = \'ADMIN\''),
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Transaction"'),
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "BankMovement" WHERE "status" = \'PENDING\''),
      sysPrisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "WorkspaceInvite" WHERE "status" = \'PENDING\''),
    ]);

    return {
      platform: {
        totalUsers: extractCount(usersResult as any[]),
        totalWorkspaces: extractCount(workspacesResult as any[]),
        totalAdmins: extractCount(adminsResult as any[]),
      },
      activity: {
        totalTransactions: extractCount(transactionsResult as any[]),
        pendingMovements: extractCount(pendingMovementsResult as any[]),
        pendingInvites: extractCount(pendingInvitesResult as any[]),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
