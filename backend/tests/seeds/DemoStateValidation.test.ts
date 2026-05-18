import { describe, it, expect } from 'vitest';
import { sysPrisma as prisma } from '../../src/lib/prisma';
import { ExportValidationService } from '../../src/services/ExportValidationService';

/**
 * Sprint 4B — Demo State Validation
 *
 * Validates that the seed data is complete and correct for the Domínio export
 * demonstration scenario. All 9 criteria from the acceptance checklist.
 */
describe('Demo State Validation (Sprint 4B)', () => {
    // Shared state across tests — resolved once in the first test
    let accountantId: number;
    let demoWorkspaceId: number;

    it('1. auditoria@wsp.finance exists as ACCOUNTANT user', async () => {
        const accountant = await prisma.user.findUnique({
            where: { email: 'auditoria@wsp.finance' },
        });
        expect(accountant).toBeDefined();
        expect(accountant!.type).toBe('ACCOUNTANT');
        accountantId = accountant!.id;
    });

    it('2. auditoria@wsp.finance has WorkspaceMember ACCOUNTANT in a BUSINESS workspace', async () => {
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: accountantId, role: 'ACCOUNTANT' },
            include: { workspace: true },
        });
        const businessMemberships = memberships.filter(m => m.workspace.type === 'BUSINESS');
        expect(businessMemberships.length).toBeGreaterThan(0);

        // Pick the first BUSINESS workspace as the demo workspace
        demoWorkspaceId = businessMemberships[0].workspaceId;
    });

    it('3. Demo BUSINESS workspace has a client OWNER', async () => {
        const ownerMembership = await prisma.workspaceMember.findFirst({
            where: { workspaceId: demoWorkspaceId, role: 'OWNER' },
            include: { user: true },
        });
        expect(ownerMembership).toBeDefined();
        expect(ownerMembership!.user.type).toBe('CLIENT');
    });

    it('4. AccountingExportConfig exists with branchCode filled', async () => {
        const config = await prisma.accountingExportConfig.findUnique({
            where: { workspaceId_layoutId: { workspaceId: demoWorkspaceId, layoutId: 'dominio-separated-v1' } },
        });
        expect(config).toBeDefined();
        expect(config!.isActive).toBe(true);
        expect(config!.targetSystem).toBe('DOMINIO');
        expect(config!.companyCode).toBe('000001');
        expect(config!.branchCode).toBeTruthy();
        expect(config!.branchCode).toBe('0001');
        expect(config!.sourceLabel).toBe('WSP');
        expect(config!.historyCodeRequired).toBe(false);
    });

    it('5. AccountingExportMapping exists for all MacroCategories used by demo transactions', async () => {
        // Get all unique macroCategoryIds used by transactions in the demo workspace
        const transactions = await prisma.transaction.findMany({
            where: {
                workspaceId: demoWorkspaceId,
                status: { in: ['COMPLETED', 'RECONCILED'] },
            },
            include: { category: true },
        });

        const usedMacroCatIds = [...new Set(
            transactions
                .map(t => t.category.macroCategoryId)
                .filter((id): id is number => id !== null)
        )];
        expect(usedMacroCatIds.length).toBeGreaterThan(0);

        // Verify mappings exist for each
        const mappings = await prisma.accountingExportMapping.findMany({
            where: {
                workspaceId: demoWorkspaceId,
                layoutId: 'dominio-separated-v1',
                isActive: true,
            },
        });
        const mappedMacroCatIds = new Set(mappings.map(m => m.macroCategoryId));

        for (const macroId of usedMacroCatIds) {
            expect(mappedMacroCatIds.has(macroId)).toBe(true);
        }
    });

    it('6. All mappings used by demo transactions have historyCode filled', async () => {
        const mappings = await prisma.accountingExportMapping.findMany({
            where: {
                workspaceId: demoWorkspaceId,
                layoutId: 'dominio-separated-v1',
                isActive: true,
            },
        });

        for (const mapping of mappings) {
            expect(mapping.historyCode).toBeTruthy();
            expect(mapping.debitAccountCode).toBeTruthy();
            expect(mapping.creditAccountCode).toBeTruthy();
        }
    });

    it('7. Categories used in demo transactions have macroCategoryId', async () => {
        const categories = await prisma.category.findMany({
            where: { workspaceId: demoWorkspaceId },
        });

        // At minimum, categories that transactions reference must have macroCategoryId
        const transactions = await prisma.transaction.findMany({
            where: {
                workspaceId: demoWorkspaceId,
                status: { in: ['COMPLETED', 'RECONCILED'] },
            },
            select: { categoryId: true },
        });
        const usedCatIds = new Set(transactions.map(t => t.categoryId));

        for (const cat of categories) {
            if (usedCatIds.has(cat.id)) {
                expect(cat.macroCategoryId).not.toBeNull();
            }
        }
    });

    it('8. Exportable transactions exist in May 2026 period', async () => {
        const startDate = new Date('2026-05-01T00:00:00.000Z');
        const endDate = new Date('2026-06-01T00:00:00.000Z');

        const count = await prisma.transaction.count({
            where: {
                workspaceId: demoWorkspaceId,
                status: { in: ['COMPLETED', 'RECONCILED'] },
                date: { gte: startDate, lt: endDate },
            },
        });
        expect(count).toBeGreaterThan(0);
    });

    it('9. AccountantDashboardCache exists for auditoria@wsp.finance', async () => {
        const cache = await prisma.accountantDashboardCache.findUnique({
            where: { userId_workspaceId: { userId: accountantId, workspaceId: demoWorkspaceId } },
        });
        expect(cache).toBeDefined();
    });

    it('10. ExportValidationService returns no blockers for May 2026', async () => {
        const validationService = new ExportValidationService(prisma as any);
        const result = await validationService.validate({
            workspaceId: demoWorkspaceId,
            layoutId: 'dominio-separated-v1',
            startDate: '2026-05-01',
            endDate: '2026-05-31',
        });

        console.log('[Demo Validation] totalRecords:', result.totalRecords);
        console.log('[Demo Validation] warnings:', result.summary.warningsCount, result.warnings.map(w => w.code));
        console.log('[Demo Validation] blockers:', result.summary.blockersCount, result.blockers.map(b => b.code));

        expect(result.blockers).toHaveLength(0);
    });

    it('11. ExportValidationService returns 0 warnings for May 2026 (ideal)', async () => {
        const validationService = new ExportValidationService(prisma as any);
        const result = await validationService.validate({
            workspaceId: demoWorkspaceId,
            layoutId: 'dominio-separated-v1',
            startDate: '2026-05-01',
            endDate: '2026-05-31',
        });

        // Log details for debugging if warnings exist
        if (result.warnings.length > 0) {
            console.warn('[Demo Validation] Remaining warnings:');
            for (const w of result.warnings) {
                console.warn(`  - [${w.code}] ${w.field || ''} ${w.transactionId || ''}: ${w.message}`);
            }
        }

        expect(result.warnings).toHaveLength(0);
    });
});
