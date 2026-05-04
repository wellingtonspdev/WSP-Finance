import fs from 'fs';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { sysPrisma } from '../../src/lib/prisma';

const testEmailPrefix = 'system-role-test';

describe('User.systemRole', () => {
  afterAll(async () => {
    await sysPrisma.workspaceMember.deleteMany({
      where: {
        user: {
          email: {
            startsWith: testEmailPrefix,
          },
        },
      },
    });

    await sysPrisma.workspace.deleteMany({
      where: {
        name: {
          startsWith: 'System Role Test',
        },
      },
    });

    await sysPrisma.user.deleteMany({
      where: {
        email: {
          startsWith: testEmailPrefix,
        },
      },
    });
  });

  it('defaults new users to USER when systemRole is omitted', async () => {
    const user = await sysPrisma.user.create({
      data: {
        name: 'Default System Role User',
        email: `${testEmailPrefix}-default@wsp.finance`,
        passwordHash: 'hashed-test-password',
      },
    });

    expect(user.systemRole).toBe('USER');
  });

  it('persists ADMIN when systemRole is explicitly provided', async () => {
    const user = await sysPrisma.user.create({
      data: {
        name: 'Admin System Role User',
        email: `${testEmailPrefix}-admin@wsp.finance`,
        passwordHash: 'hashed-test-password',
        systemRole: 'ADMIN',
      },
    });

    expect(user.systemRole).toBe('ADMIN');
  });

  it('keeps systemRole separate from workspace memberships', async () => {
    const admin = await sysPrisma.user.create({
      data: {
        name: 'Admin Without Workspace Access',
        email: `${testEmailPrefix}-admin-no-workspace@wsp.finance`,
        passwordHash: 'hashed-test-password',
        systemRole: 'ADMIN',
      },
    });

    const workspace = await sysPrisma.workspace.create({
      data: {
        name: 'System Role Test Workspace',
        type: 'BUSINESS',
      },
    });

    const memberships = await sysPrisma.workspaceMember.findMany({
      where: {
        userId: admin.id,
        workspaceId: workspace.id,
      },
    });

    expect(admin.systemRole).toBe('ADMIN');
    expect(memberships).toHaveLength(0);
  });

  it('declares admin@wsp.finance as ADMIN and auditoria@wsp.finance as USER in the seed', () => {
    const seedPath = path.resolve(process.cwd(), 'prisma/seed/modules/01_Identities.ts');
    const seedSource = fs.readFileSync(seedPath, 'utf8');

    // Platform Admin deve ser admin@wsp.finance com systemRole ADMIN
    expect(seedSource).toContain("email: 'admin@wsp.finance'");
    expect(seedSource).toContain("systemRole: 'ADMIN'");

    // Contador auditoria@wsp.finance deve ser USER, não ADMIN
    const auditorBlock = seedSource.substring(
      seedSource.indexOf("email: 'auditoria@wsp.finance'"),
      seedSource.indexOf("email: 'auditoria@wsp.finance'") + 200
    );
    expect(auditorBlock).not.toContain("systemRole: 'ADMIN'");
  });
});
