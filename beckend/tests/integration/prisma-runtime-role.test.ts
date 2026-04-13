import { describe, it, expect, vi } from 'vitest';
import { checkPrivileges } from '../../src/lib/checkEnvironment';
import { PrismaClient } from '@prisma/client';

describe('Enforcement RLS Workspace: Integração Banco-API', () => {

    it('Deve disparar um erro fatal se o Prisma usar uma Role com bypassrls=true', async () => {
        const mockPrisma = {
            $queryRaw: vi.fn().mockResolvedValue([{
                rolname: 'postgres_bypass',
                rolsuper: false,
                rolbypassrls: true
            }])
        } as unknown as PrismaClient;

        await expect(checkPrivileges(mockPrisma)).rejects.toThrow('bypassrls ou rolsuper');
    });

    it('Deve disparar um erro fatal se o Prisma usar uma Role superuser', async () => {
        const mockPrisma = {
            $queryRaw: vi.fn().mockResolvedValue([{
                rolname: 'postgres',
                rolsuper: true,
                rolbypassrls: false
            }])
        } as unknown as PrismaClient;

        await expect(checkPrivileges(mockPrisma)).rejects.toThrow('bypassrls ou rolsuper');
    });

    it('Deve passar silenciosamente e permitir a runtime rodar caso bypassrls e rolsuper estejam falsos', async () => {
        // Simula o caso ideal onde a connection string usa uma db Role não master ("Zero-Trust")
        const mockPrisma = {
            $queryRaw: vi.fn().mockResolvedValue([{
                rolname: 'postgres_runtime',
                rolsuper: false,
                rolbypassrls: false
            }])
        } as unknown as PrismaClient;

        await expect(checkPrivileges(mockPrisma)).resolves.not.toThrow();
    });

});
