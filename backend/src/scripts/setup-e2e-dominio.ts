import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../../backend/.env') });

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

const directUrl = process.env.DIRECT_URL;
const prisma = directUrl
  ? new PrismaClient({ datasources: { db: { url: directUrl } } })
  : new PrismaClient();
async function main() {
  const mode = process.argv[2];
  if (mode === 'cleanup') {
    const workspaceId = parseInt(process.argv[3], 10);
    const userId = parseInt(process.argv[4], 10);
    const unauthUserId = parseInt(process.argv[5], 10);
    const workspaceBId = parseInt(process.argv[6], 10);
    const userBId = parseInt(process.argv[7], 10);

    // First, remove dependencies like ExportArchive and AuditLog
    // Use try/catch since ExportArchive might not exist or might fail
    try {
      await prisma.exportArchive.deleteMany({ where: { workspaceId } });
      if (!isNaN(workspaceBId)) {
        await prisma.exportArchive.deleteMany({ where: { workspaceId: workspaceBId } });
      }
    } catch (e) {
      // Ignore if ExportArchive does not exist
    }

    try {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { userId: userId },
            { userId: unauthUserId },
            { userId: userBId }
          ]
        }
      });
    } catch (e) {
      // Ignore if AuditLog does not exist or has errors
    }

    await prisma.transaction.deleteMany({ where: { workspaceId } });
    await prisma.accountingExportMapping.deleteMany({ where: { workspaceId } });
    await prisma.accountingExportConfig.deleteMany({ where: { workspaceId } });
    await prisma.category.deleteMany({ where: { workspaceId } });
    await prisma.account.deleteMany({ where: { workspaceId } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });

    if (!isNaN(workspaceBId)) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspaceBId } });
      await prisma.workspace.delete({ where: { id: workspaceBId } });
    }

    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: unauthUserId } });
    if (!isNaN(userBId)) {
      await prisma.user.delete({ where: { id: userBId } });
    }

    try {
      await prisma.macroCategory.deleteMany({ where: { code: { startsWith: 'MACRO_' } } });
    } catch (e) {
      // Ignore FK errors from concurrent tests
    }
    return;
  }

  const unique = Date.now();

  const user = await prisma.user.create({
    data: {
      name: `E2E Export Admin ${unique}`,
      email: `admin-export-${unique}@e2e.com`,
      passwordHash: '$2b$10$T.6kU8v.3.6y9rT9C2XwOu1Zp1Xp9mXp9mXp9mXp9mXp9mXp9m',
      type: 'CLIENT'
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `E2E Dominio WS ${unique}`,
      type: 'BUSINESS',
      documentType: 'CNPJ',
      document: `123456780001${unique.toString().slice(-2)}`,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER'
        }
      }
    }
  });

  const account = await prisma.account.create({
    data: {
      workspaceId: workspace.id,
      name: 'Conta E2E',
      type: 'CHECKING',
      balance: 1000
    }
  });

  const macroCategory = await prisma.macroCategory.create({
    data: {
      code: `MACRO_${unique}`,
      name: 'Macro Vendas E2E',
      type: 'INCOME'
    }
  });

  const category = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: 'Vendas E2E',
      macroCategoryId: macroCategory.id
    }
  });

  // Config Dominio
  await prisma.accountingExportConfig.create({
    data: {
      workspaceId: workspace.id,
      targetSystem: 'DOMINIO',
      layoutId: 'dominio-separated-v1',
      isActive: true,
      companyCode: '999'
    }
  });

  // Mapping
  await prisma.accountingExportMapping.create({
    data: {
      workspaceId: workspace.id,
      macroCategoryId: macroCategory.id,
      layoutId: 'dominio-separated-v1',
      targetSystem: 'DOMINIO',
      debitAccountCode: '333',
      creditAccountCode: '444'
    }
  });

  // Create 1 valid transaction
  await prisma.transaction.create({
    data: {
      workspaceId: workspace.id,
      accountId: account.id,
      categoryId: category.id,
      type: 'INCOME',
      amount: 1500,
      date: new Date(),
      status: 'COMPLETED',
      description: 'Venda de Software com Acentuação e Maçãs'
    }
  });

  const unauthUser = await prisma.user.create({
    data: {
      name: `E2E Unauth ${unique}`,
      email: `unauth-${unique}@e2e.com`,
      passwordHash: '$2b$10$T.6kU8v.3.6y9rT9C2XwOu1Zp1Xp9mXp9mXp9mXp9mXp9mXp9m',
      type: 'CLIENT'
    }
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: unauthUser.id,
      role: 'VIEWER'
    }
  });

  const userB = await prisma.user.create({
    data: {
      name: `E2E Admin B ${unique}`,
      email: `admin-b-${unique}@e2e.com`,
      passwordHash: '$2b$10$T.6kU8v.3.6y9rT9C2XwOu1Zp1Xp9mXp9mXp9mXp9mXp9mXp9m',
      type: 'CLIENT'
    }
  });

  const workspaceB = await prisma.workspace.create({
    data: {
      name: `E2E Dominio WS B ${unique}`,
      type: 'BUSINESS',
      documentType: 'CNPJ',
      document: `123456780002${unique.toString().slice(-2)}`,
      members: {
        create: {
          userId: userB.id,
          role: 'OWNER'
        }
      }
    }
  });

  const jwtSecret = process.env.JWT_SECRET || 'wsp-finance-super-secret-key-2024-development';

  const token = jwt.sign(
    { sub: user.id.toString(), email: user.email, role: 'authenticated', workspace_id: workspace.id.toString() },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const unauthUserToken = jwt.sign(
    { sub: unauthUser.id.toString(), email: unauthUser.email, role: 'authenticated', workspace_id: workspace.id.toString() },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const result = {
    workspaceId: workspace.id,
    workspaceBId: workspaceB.id,
    accountId: account.id,
    adminEmail: user.email,
    token,
    userId: user.id,
    unauthUserToken,
    unauthUserId: unauthUser.id,
    userBId: userB.id
  };

  console.log(JSON.stringify(result));
}

main()
  .catch((e) => {
    console.error('Setup E2E failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
