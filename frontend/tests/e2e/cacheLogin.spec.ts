import { expect, test } from '@playwright/test';

/**
 * Smoke E2E for the browser restore path.
 * The backend endpoints are mocked on purpose, so this spec validates the
 * frontend route/session wiring instead of acting as a full-stack test.
 */
test.describe('Smoke E2E: accountant session restore via dashboardCache', () => {
  test('opens /accountant/hub directly with a valid session and renders the cache summary without calling /dashboard/summary', async ({
    page,
  }) => {
    const heavyDashboardCalls = await mockAccountantRestore(page);

    await page.goto('/accountant/hub');

    await expect(page).toHaveURL(/\/accountant\/hub$/);
    await expect(page.locator('body')).toContainText('Clientes Ativos');
    await expect(page.locator('body')).toContainText('Documentos Pendentes');

    const normalizedText = normalizeWhitespace(await page.locator('body').textContent());
    expect(normalizedText).toMatch(/Clientes Ativos\s*2/);
    expect(normalizedText).toMatch(/Documentos Pendentes\s*20/);
    expect(normalizedText).toContain('Joao Business');
    expect(normalizedText).toContain('Maria Tech');
    expect(heavyDashboardCalls).toHaveLength(0);
  });

  test('starts from /, restores the session, and lands on the same /accountant/hub summary', async ({ page }) => {
    const heavyDashboardCalls = await mockAccountantRestore(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/accountant\/hub$/);
    await expect(page.locator('body')).toContainText('Clientes Ativos');
    await expect(page.locator('body')).toContainText('Documentos Pendentes');

    const normalizedText = normalizeWhitespace(await page.locator('body').textContent());
    expect(normalizedText).toMatch(/Clientes Ativos\s*2/);
    expect(normalizedText).toMatch(/Documentos Pendentes\s*20/);
    expect(heavyDashboardCalls).toHaveLength(0);
  });
});

async function mockAccountantRestore(page: import('@playwright/test').Page) {
  const heavyDashboardCalls: string[] = [];

  page.on('request', (request) => {
    if (request.url().includes('/dashboard/summary')) {
      heavyDashboardCalls.push(request.url());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('wsp_refresh_token', 'seed-refresh-token');
    localStorage.removeItem('wsp_user_info');
    localStorage.removeItem('wsp_dashboard_cache');
  });

  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        token: 'token-restored',
        refreshToken: 'refresh-restored',
      },
    });
  });

  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        id: 1,
        name: 'Wellington Contador',
        email: 'auditoria@wsp.finance',
        type: 'ACCOUNTANT',
        memberships: [
          {
            id: 3,
            name: 'Joao Business',
            type: 'BUSINESS',
            role: 'ACCOUNTANT',
            closedUntil: null,
          },
          {
            id: 5,
            name: 'Maria Tech',
            type: 'BUSINESS',
            role: 'ACCOUNTANT',
            closedUntil: null,
          },
        ],
        dashboardCache: [
          {
            id: 101,
            userId: 1,
            workspaceId: 3,
            pendingMovements: 12,
            missingAttachments: 3,
            cashRiskAlert: false,
            totalBalance: '126022.8852',
            updatedAt: '2026-04-20T12:00:00.000Z',
          },
          {
            id: 102,
            userId: 1,
            workspaceId: 5,
            pendingMovements: 5,
            missingAttachments: 0,
            cashRiskAlert: true,
            totalBalance: '-80938.2903',
            updatedAt: '2026-04-20T12:01:00.000Z',
          },
        ],
      },
    });
  });

  return heavyDashboardCalls;
}

function normalizeWhitespace(value: string | null) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}
