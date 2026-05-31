import { test, expect } from './fixtures';

test.describe('E2E: Inbox de Aprovação (Hub do Contador) com Fixtures Isoladas', () => {

  test('Deve carregar inbox, visualizar duplicatas, mesclar e aprovar transação', async ({
    accountantSession,
    page,
  }) => {
    // Log page errors to debug why it is failing to render the header
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('response', res => {
      if (res.status() === 401) {
        console.log('401 REQ:', res.request().url());
      }
    });

    // 1. Mocking do Endpoint de Lista de Movimentos (PENDING)
    await page.route('**/bank-movements?*', async (route) => {
      const json = {
        data: [
          {
            id: 'mov-1',
            description: 'PGTO FORNECEDOR XPTO',
            amount: -1500.0,
            date: new Date().toISOString(),
            status: 'PENDING',
            accountId: 10,
            workspaceId: 1,
            account: { name: 'Conta Nubank' },
          },
          {
            id: 'mov-2-duplicate',
            description: 'PGTO FORNECEDOR XPTO',
            amount: -1500.0,
            date: new Date().toISOString(),
            status: 'PENDING',
            accountId: 10,
            workspaceId: 1,
            account: { name: 'Conta Caixa' },
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
      await route.fulfill({ json });
    });

    // 2. Mocking Endpoint de Merge
    await page.route('**/bank-movements/mov-1/merge', async (route) => {
      const body = await route.request().postDataJSON();
      expect(body.discardIds).toContain('mov-2-duplicate');
      await route.fulfill({ status: 200, json: { success: true } });
    });

    // 3. Mocking Endpoint de Approve
    await page.route('**/bank-movements/mov-1/approve', async (route) => {
      const body = await route.request().postDataJSON();
      expect(body.categoryId).toBe(1);
      await route.fulfill({ status: 201, json: { id: 'new-transaction-id' } });
    });

    // Ir para a tela de Inbox de Aprovação
    await page.goto(`/accountant/inbox/${accountantSession.workspaceId}`);

    // Verificar header
    await expect(page.getByRole('heading', { name: 'Inbox de Aprovação' })).toBeVisible();
    await expect(page.getByText(/2 pendentes/i)).toBeVisible();

    // Verificar agrupamento
    const originalCard = page.locator('text=PGTO FORNECEDOR XPTO').first();
    await expect(originalCard).toBeVisible();

    // Expande o card principal
    await originalCard.click();

    // Verifica badge de duplicata
    await expect(page.locator('text=2x')).toBeVisible();

    // Mesclar duplicata
    const mergeBtn = page.getByRole('button', { name: /Mesclar/i });
    await expect(mergeBtn).toBeVisible();
    await mergeBtn.click();

    // Toast de sucesso
    await expect(page.getByText(/Movimentos mesclados em/i)).toBeVisible();

    // Aprovar transação
    const approveBtn = page.getByRole('button', { name: /Aprovar/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verificar sucesso
    await expect(page.getByText('Movimento aprovado e convertido em Transação')).toBeVisible();

    // Inbox vazia
    await expect(page.getByText('Inbox limpa!')).toBeVisible();
  });
});
