import { describe, it, expect, vi, beforeEach } from 'vitest';

import { sysPrisma } from '../../lib/prisma';
import { AdminService } from '../../services/AdminService';

vi.mock('../../lib/prisma', () => ({
  sysPrisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockQueryRawUnsafe = sysPrisma.$queryRawUnsafe as any;

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService();
  });

  // ── Caminho feliz ───────────────────────────────────────────────

  it('retorna PlatformMetrics com todos os campos numéricos e generatedAt ISO', async () => {
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ count: BigInt(42) }])   // totalUsers
      .mockResolvedValueOnce([{ count: BigInt(10) }])   // totalWorkspaces
      .mockResolvedValueOnce([{ count: BigInt(3) }])    // totalAdmins
      .mockResolvedValueOnce([{ count: BigInt(500) }])  // totalTransactions
      .mockResolvedValueOnce([{ count: BigInt(7) }])    // pendingMovements
      .mockResolvedValueOnce([{ count: BigInt(2) }]);   // pendingInvites

    const result = await service.getGlobalMetrics();

    expect(result).toEqual({
      platform: {
        totalUsers: 42,
        totalWorkspaces: 10,
        totalAdmins: 3,
      },
      activity: {
        totalTransactions: 500,
        pendingMovements: 7,
        pendingInvites: 2,
      },
      generatedAt: expect.any(String),
    });

    // generatedAt deve ser ISO 8601
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });

  // ── Conversão de tipos ──────────────────────────────────────────

  it('converte bigint para number', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: BigInt(99) }]);
    const result = await service.getGlobalMetrics();
    expect(typeof result.platform.totalUsers).toBe('number');
    expect(result.platform.totalUsers).toBe(99);
  });

  it('converte string para number', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: '77' }]);
    const result = await service.getGlobalMetrics();
    expect(typeof result.platform.totalUsers).toBe('number');
    expect(result.platform.totalUsers).toBe(77);
  });

  it('mantém number como number', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: 55 }]);
    const result = await service.getGlobalMetrics();
    expect(typeof result.platform.totalUsers).toBe('number');
    expect(result.platform.totalUsers).toBe(55);
  });

  it('converte null/undefined para 0', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: null }]);
    const result = await service.getGlobalMetrics();
    expect(result.platform.totalUsers).toBe(0);
  });

  it('converte resultado vazio para 0', async () => {
    mockQueryRawUnsafe.mockResolvedValue([]);
    const result = await service.getGlobalMetrics();
    expect(result.platform.totalUsers).toBe(0);
  });

  // ── Ausência de PII / campos proibidos ──────────────────────────

  it('NÃO retorna campos proibidos (amount, description, attachmentUrl, email, name, cpf, cnpj, id individual)', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: BigInt(1) }]);
    const result = await service.getGlobalMetrics();

    const json = JSON.stringify(result);

    const forbiddenFields = [
      'amount', 'description', 'attachmentUrl',
      'email', 'name', 'cpf', 'cnpj',
    ];

    for (const field of forbiddenFields) {
      expect(json).not.toContain(`"${field}"`);
    }

    // Não deve conter IDs individuais (UUID ou numérico)
    expect(json).not.toMatch(/"id"\s*:/);
    expect(json).not.toMatch(/"userId"\s*:/);
    expect(json).not.toMatch(/"workspaceId"\s*:/);
  });

  // ── SQL estático ────────────────────────────────────────────────

  it('executa exatamente 6 queries COUNT(*) com SQL estático', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: BigInt(0) }]);
    await service.getGlobalMetrics();

    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(6);

    // Todas as queries devem ser COUNT(*)
    for (const call of mockQueryRawUnsafe.mock.calls) {
      const sql = call[0] as string;
      expect(sql).toContain('COUNT(*)');
      // SQL estático: sem interpolação de variáveis (sem $1, $2, etc.)
      expect(sql).not.toMatch(/\$\d/);
    }
  });

  // ── Queries específicas ─────────────────────────────────────────

  it('usa as tabelas corretas nas queries', async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ count: BigInt(0) }]);
    await service.getGlobalMetrics();

    const queries = mockQueryRawUnsafe.mock.calls.map((c: any[]) => c[0] as string);

    expect(queries.some((q: string) => q.includes('"User"') && !q.includes('ADMIN'))).toBe(true);
    expect(queries.some((q: string) => q.includes('"Workspace"'))).toBe(true);
    expect(queries.some((q: string) => q.includes('"User"') && q.includes('ADMIN'))).toBe(true);
    expect(queries.some((q: string) => q.includes('"Transaction"'))).toBe(true);
    expect(queries.some((q: string) => q.includes('"BankMovement"') && q.includes('PENDING'))).toBe(true);
    expect(queries.some((q: string) => q.includes('"WorkspaceInvite"') && q.includes('PENDING'))).toBe(true);
  });
});
