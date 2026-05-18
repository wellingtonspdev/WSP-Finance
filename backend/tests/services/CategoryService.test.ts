import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { CategoryService } from '../../src/services/CategoryService';
import { prisma } from '../../src/lib/prisma';
import { tenantContext } from '../../src/lib/tenantContext';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let workspace: any;
  let createdMacroCategoryIds: number[] = [];

  const uniqueMacroCode = () => `TEST_CATSVC_${randomUUID()}`;

  beforeEach(async () => {
    categoryService = new CategoryService();
    createdMacroCategoryIds = [];
    workspace = await prisma.workspace.create({
      data: { name: 'Test Workspace', type: 'PERSONAL' }
    });
  });

  afterEach(async () => {
    // FK-safe cleanup order: deepest dependents first
    if (workspace?.id) {
      await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
        await prisma.transaction.deleteMany({ where: { workspaceId: workspace.id } });
        await prisma.accountingExportMapping.deleteMany({ where: { workspaceId: workspace.id } });
        await prisma.account.deleteMany({ where: { workspaceId: workspace.id } });
        await prisma.category.deleteMany({ where: { workspaceId: workspace.id } });
      });
      await prisma.workspace.delete({ where: { id: workspace.id } });
    }

    // Clean up only MacroCategory records created by THIS suite
    if (createdMacroCategoryIds.length > 0) {
      await prisma.macroCategory.deleteMany({
        where: { id: { in: createdMacroCategoryIds } }
      });
    }
  });

  it('should create a Category with a valid macroCategoryId', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      const macro = await prisma.macroCategory.create({
        data: { code: uniqueMacroCode(), name: 'Test Macro', type: 'EXPENSE', isActive: true }
      });
      createdMacroCategoryIds.push(macro.id);

      const category = await categoryService.create('Test Category', 'icon', 'color', workspace.id, macro.id);

      expect(category).toBeDefined();
      expect(category.macroCategoryId).toBe(macro.id);
    });
  });

  it('should reject creation if macroCategoryId does not exist', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      await expect(categoryService.create('Test', 'icon', 'color', workspace.id, 99999))
        .rejects.toThrow('MacroCategory not found or inactive');
    });
  });

  it('should reject creation if macroCategoryId is inactive', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      const macro = await prisma.macroCategory.create({
        data: { code: uniqueMacroCode(), name: 'Inactive', type: 'EXPENSE', isActive: false }
      });
      createdMacroCategoryIds.push(macro.id);

      await expect(categoryService.create('Test', 'icon', 'color', workspace.id, macro.id))
        .rejects.toThrow('MacroCategory not found or inactive');
    });
  });

  it('should reject creation if macroCategoryId is missing/null directly in service', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      await expect(categoryService.create('Test', 'icon', 'color', workspace.id, undefined as any))
        .rejects.toThrow('MacroCategoryId is required');
    });
  });

  it('should read old category with macroCategoryId = null', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      // Insert directly via prisma to bypass service validation
      await prisma.category.create({
        data: { name: 'Old Category', workspaceId: workspace.id } // no macroCategoryId
      });

      const categories = await categoryService.list(workspace.id);
      const oldCat = categories.find(c => c.name === 'Old Category');
      expect(oldCat).toBeDefined();
      expect(oldCat!.macroCategoryId).toBeNull();
    });
  });

  it('should preserve Category -> Transaction relation', async () => {
    await tenantContext.run({ currentWorkspaceId: workspace.id }, async () => {
      const macro = await prisma.macroCategory.create({
        data: { code: uniqueMacroCode(), name: 'Test', type: 'INCOME', isActive: true }
      });
      createdMacroCategoryIds.push(macro.id);

      const category = await categoryService.create('Cat', 'icon', 'color', workspace.id, macro.id);

      // Create an account
      const account = await prisma.account.create({
        data: { name: 'Account', workspaceId: workspace.id, type: 'CHECKING' }
      });

      // Create a transaction
      const transaction = await prisma.transaction.create({
        data: {
          description: 'Test Tx',
          amount: 100,
          date: new Date(),
          type: 'INCOME',
          accountId: account.id,
          categoryId: category.id,
          workspaceId: workspace.id
        }
      });

      expect(transaction).toBeDefined();
      expect(transaction.categoryId).toBe(category.id);
    });
  });
});
