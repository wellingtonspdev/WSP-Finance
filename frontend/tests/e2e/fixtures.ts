import { test as base, expect } from '@playwright/test';
import { generateMockToken } from './jwtMocker';

type AuthFixture = {
  authSession: void;
};

type IsolatedAuthFixture = {
  isolatedAuth: {
    workspaceId: string;
    userId: string;
    email: string;
    token: string;
  };
};

type AccountantFixture = {
  accountantSession: {
    workspaceId: string;
    token: string;
  };
};

/**
 * Fixture base: Injeta sessão mockada com JWT válido.
 * Cada teste roda em um browser context isolado (padrão do Playwright),
 * garantindo que cookies/localStorage não contaminam testes subsequentes.
 */
export const test = base.extend<AuthFixture & IsolatedAuthFixture & AccountantFixture>({
  authSession: [async ({ context }, use) => {
    const token = generateMockToken();

    await context.addCookies([
      {
        name: 'sb-access-token',
        value: token,
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'sb-refresh-token',
        value: token,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await context.addInitScript((tokenVal) => {
      window.localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          currentSession: {
            access_token: tokenVal,
            refresh_token: tokenVal,
            user: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'qa@wspfinance.com',
            },
          },
        })
      );
    }, token);

    await use();
  }, { auto: false }],

  /**
   * Fixture com workspace parametrizável.
   * Gera JWT com workspace_id específico e injeta em contexto isolado.
   * Uso: test('meu teste', async ({ isolatedAuth, page }) => { ... })
   */
  isolatedAuth: [async ({ context }, use) => {
    const workspaceId = '11111111-2222-3333-4444-555555555555';
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const email = 'qa@wspfinance.com';
    const token = generateMockToken({ workspace_id: workspaceId });

    await context.addCookies([
      { name: 'sb-access-token', value: token, domain: 'localhost', path: '/' },
      { name: 'sb-refresh-token', value: token, domain: 'localhost', path: '/' },
    ]);

    await context.addInitScript(({ tokenVal, wsId, userEmail }) => {
      window.localStorage.setItem('wsp_refresh_token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.workspaceId', wsId);
      window.localStorage.setItem(
        'wsp_user_info',
        JSON.stringify({
          id: 1,
          name: 'QA Tester',
          email: userEmail,
          type: 'CLIENT',
          memberships: [{ id: parseInt(wsId) || 1, name: 'Workspace Teste', type: 'BUSINESS', role: 'EDITOR' }],
        })
      );
    }, { tokenVal: token, wsId: workspaceId, userEmail: email });

    await use({ workspaceId, userId, email, token });
  }, { auto: false }],

  /**
   * Fixture especializada para o contador.
   * Injeta role ACCOUNTANT no JWT e localStorage, contexto isolado por padrão.
   */
  accountantSession: [async ({ context }, use) => {
    const workspaceId = '1';
    const token = generateMockToken({
      workspace_id: workspaceId,
      role: 'authenticated',
      email: 'contador@wspfinance.com',
      user_metadata: { type: 'ACCOUNTANT' },
    });

    await context.addCookies([
      { name: 'sb-access-token', value: token, domain: 'localhost', path: '/' },
      { name: 'sb-refresh-token', value: token, domain: 'localhost', path: '/' },
    ]);

    // Mock do refresh token endpoint
    await context.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        json: { token: token, refreshToken: 'mock-refresh' },
      });
    });

    await context.addInitScript(({ tokenVal, wsId }) => {
      window.localStorage.setItem('wsp_refresh_token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.token', tokenVal);
      window.localStorage.setItem('wsp_finance.auth.workspaceId', wsId);
      window.localStorage.setItem('wsp_finance.auth.userRole', 'ACCOUNTANT');
      window.localStorage.setItem(
        'wsp_user_info',
        JSON.stringify({
          id: 1,
          name: 'Contador E2E',
          email: 'contador@wspfinance.com',
          type: 'ACCOUNTANT',
          memberships: [{ id: 1, name: 'Workspace Teste', type: 'BUSINESS', role: 'ACCOUNTANT' }],
        })
      );
    }, { tokenVal: token, wsId: workspaceId });

    await use({ workspaceId, token });
  }, { auto: false }],
});

export { expect };
