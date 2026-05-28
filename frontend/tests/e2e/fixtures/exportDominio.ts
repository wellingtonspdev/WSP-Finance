import { test as base } from '@playwright/test';
import { expect } from '../fixtures';
import { execSync } from 'child_process';
import path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

type ExportDominioFixture = {
  setupDominio: { workspaceId: number; workspaceBId: number; accountId: number; adminEmail: string; token: string; userId: string; unauthUserToken: string };
};

export const test = base.extend<ExportDominioFixture>({
  setupDominio: [async ({ context }, use) => {
    // Call backend script to setup DB
    const backendPath = path.resolve(__dirname, '../../../../backend');
    const out = execSync(`pnpm exec ts-node src/scripts/setup-e2e-dominio.ts`, { cwd: backendPath, encoding: 'utf-8' });

    // Parse result
    const resultJsonMatch = out.match(/\{.*\}/s);
    if (!resultJsonMatch) {
      throw new Error('Failed to parse backend setup script output: ' + out);
    }
    const result = JSON.parse(resultJsonMatch[0]);

    // Inject token for UI tests
    await context.addCookies([
      { name: 'sb-access-token', value: result.token, domain: 'localhost', path: '/' },
      { name: 'sb-refresh-token', value: result.token, domain: 'localhost', path: '/' },
    ]);

    await context.route('**/auth/refresh', async (route) => {
      console.log('MOCK HIT: /auth/refresh');
      await route.fulfill({
        status: 200,
        json: { token: result.token, refreshToken: result.token },
      });
    });

    await context.route('**/auth/me', async (route) => {
      console.log('MOCK HIT: /auth/me');
      await route.fulfill({
        status: 200,
        json: {
          id: result.userId,
          name: 'E2E Admin',
          email: result.adminEmail,
          type: 'CLIENT',
          memberships: [{ id: parseInt(result.workspaceId.toString(), 10), name: 'Workspace Teste', type: 'BUSINESS', role: 'OWNER' }]
        },
      });
    });

    await context.addInitScript(({ tokenVal, wsId, userEmail, userId }) => {
      window.localStorage.setItem('wsp_refresh_token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.workspaceId', wsId);
      window.localStorage.setItem('wsp_finance.auth.userRole', 'OWNER');
      window.localStorage.setItem(
        'wsp_user_info',
        JSON.stringify({
          id: userId,
          name: 'E2E Admin',
          email: userEmail,
          type: 'CLIENT',
          memberships: [{ id: parseInt(wsId), name: 'Workspace Teste', type: 'BUSINESS', role: 'OWNER' }],
        })
      );
    }, { tokenVal: result.token, wsId: result.workspaceId.toString(), userEmail: result.adminEmail, userId: result.userId });

    await use({
      workspaceId: result.workspaceId,
      workspaceBId: result.workspaceBId,
      accountId: result.accountId,
      adminEmail: result.adminEmail,
      token: result.token,
      userId: result.userId,
      unauthUserToken: result.unauthUserToken
    });

    // Cleanup
    execSync(`pnpm exec ts-node src/scripts/setup-e2e-dominio.ts cleanup ${result.workspaceId} ${result.userId} ${result.unauthUserId} ${result.workspaceBId} ${result.userBId}`, { cwd: backendPath, encoding: 'utf-8' });
  }, { auto: false }],
});

export { expect };
