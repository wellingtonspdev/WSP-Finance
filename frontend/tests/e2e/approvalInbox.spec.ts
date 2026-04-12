import { test, expect } from '@playwright/test';

test.describe('E2E: Inbox de Aprovação (Hub do Contador) com Merge e Aprovação', () => {

    test('Deve carregar inbox, visualizar duplicatas, mesclar e aprovar transação', async ({ page }) => {

        // 1. Mocking do Endpoint de Lista de Movimentos (PENDING)
        await page.route('**/bank-movements?*', async route => {
            const json = {
                data: [
                    {
                        id: 'mov-1',
                        description: 'PGTO FORNECEDOR XPTO',
                        amount: -1500.00,
                        date: new Date().toISOString(),
                        status: 'PENDING',
                        accountId: 10,
                        workspaceId: 1,
                        account: { name: 'Conta Nubank' }
                    },
                    {
                        id: 'mov-2-duplicate',
                        description: 'PGTO FORNECEDOR XPTO',
                        amount: -1500.00,
                        date: new Date().toISOString(),
                        status: 'PENDING',
                        accountId: 10,
                        workspaceId: 1,
                        account: { name: 'Conta Caixa' }
                    }
                ],
                nextCursor: null,
                hasMore: false
            };
            await route.fulfill({ json });
        });

        // 2. Mocking Endpoint de Merge (Mesclar candidate duplicate)
        await page.route('**/bank-movements/mov-1/merge', async route => {
            const body = await route.request().postDataJSON();
            expect(body.discardIds).toContain('mov-2-duplicate');
            await route.fulfill({ status: 200, json: { success: true } });
        });

        // 3. Mocking Endpoint de Approve
        await page.route('**/bank-movements/mov-1/approve', async route => {
            const body = await route.request().postDataJSON();
            expect(body.categoryId).toBe(1); // O mock na pág envia categoryId = 1
            await route.fulfill({ status: 201, json: { id: 'new-transaction-id' } });
        });

        // Mock do refresh token pra não dar logout
        await page.route('**/auth/refresh', async route => {
            await route.fulfill({ status: 200, json: { token: 'mockToken', refreshToken: 'mockRefresh' } });
        });

        // Autenticação bypass
        await page.addInitScript(() => {
            localStorage.setItem('wsp_refresh_token', 'fake.jwt.token');
            localStorage.setItem('wsp_user_info', JSON.stringify({
                id: 1,
                name: 'Contador E2E',
                email: 'acc@e2e.com',
                type: 'ACCOUNTANT',
                memberships: [{ id: 1, name: 'Workspace Teste', type: 'BUSINESS', role: 'ACCOUNTANT' }]
            }));
            localStorage.setItem('wsp_finance.auth.workspaceId', '1');
            localStorage.setItem('wsp_finance.auth.userRole', 'ACCOUNTANT');
        });

        // Ir para a tela de Inbox de Aprovação (workspaceId=1 hardcoded no param)
        await page.goto('http://localhost:5173/accountant/inbox/1');

        // Verificar header
        await expect(page.getByRole('heading', { name: 'Inbox de Aprovação' })).toBeVisible();
        await expect(page.getByText(/2 pendentes/i)).toBeVisible();

        // Verificar agrupamento
        // Deve listar apenas um card principal "Original" para "PGTO FORNECEDOR XPTO" pq o segundo agrupou
        const originalCard = page.locator('text=PGTO FORNECEDOR XPTO').first();
        await expect(originalCard).toBeVisible();

        // Expande o card principal (clica na área do card)
        await originalCard.click();

        // Verifica a exibição da badge de duplicata (2x)
        await expect(page.locator('text=2x')).toBeVisible();

        // Verifica o botão de mesclar
        const mergeBtn = page.getByRole('button', { name: /Mesclar/i });
        await expect(mergeBtn).toBeVisible();

        // Mesclar duplicata
        await mergeBtn.click();
        
        // Verifica o toast de sucesso de mesclagem (o mock da lista vai remover mov-2 na UI)
        await expect(page.getByText(/Movimentos mesclados em/i)).toBeVisible();

        // Agora, aprovar a transação original
        const approveBtn = page.getByRole('button', { name: /Aprovar/i });
        await expect(approveBtn).toBeVisible();
        
        // Aprovar original
        await approveBtn.click();

        // Verifica success
        await expect(page.getByText('Movimento aprovado e convertido em Transação')).toBeVisible();
        
        // Final: Inbox vazia
        await expect(page.getByText('Inbox limpa!')).toBeVisible();
    });

});
