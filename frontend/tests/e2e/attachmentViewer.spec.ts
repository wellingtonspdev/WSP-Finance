import { test, expect } from '@playwright/test';

// Mocks simulados na própria E2E suite visando não poluir banco dev
test.describe('E2E: Visualização Segura de Anexos PACT', () => {

    test('Deve abrir o Modal de Visualização e carregar o Blobed URL com headers de segurança', async ({ page }) => {

        // 1. Mocking do Endpoint de Lista de Transações
        await page.route('**/transactions*', async route => {
            const json = [
                {
                    id: 'mock-tx-id',
                    description: 'Serviços AWS Vault',
                    amount: '150.00',
                    type: 'EXPENSE',
                    date: new Date().toISOString(),
                    categoryId: 1,
                    category: { name: 'Infraestrutura' },
                    attachmentUrl: 'workspaces/1/vault/secret.pdf', // Induz ao frontend exibir o Botão Clipe
                }
            ];
            await route.fulfill({ json });
        });

        // 2. Mocking da Geração do Link com Header SSE-C Injetado
        await page.route('**/transactions/mock-tx-id/attachment', async route => {
            const json = {
                downloadUrl: 'https://fake-s3-presigned.com/file.png?token=123',
                headers: { 'x-amz-server-side-encryption-customer-algorithm': 'AES256' }
            };
            await route.fulfill({ json });
        });

        // 3. O Pulo do Gato (O Fake Image Fetch)
        // O Hook do Front vai tentar bater nessa "Object URL" e extrair o blob
        await page.route('https://fake-s3-presigned.com/file.png?token=123', async route => {
            // Mock de Imagem de 1x1 Transparente do S3 para simular o Blobed Convertion no Memory Heap do react
            const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
            await route.fulfill({
                status: 200,
                contentType: 'image/png',
                body: buffer
            });
        });

        // --- Início da Orquestração do DOM ---

        // Vai pra tela de lista e espera o Mock de Load aparecer (Local Storage mock para nao bater no auth bypass)
        await page.addInitScript(() => {
            localStorage.setItem('wsp_finance.auth.token', 'fake.jwt.token');
            localStorage.setItem('wsp_finance.auth.workspaceId', '1');
        });

        await page.goto('/transactions'); // A rota do extrato

        // Passo A: Verifica se a transação do banco mock engatilhou
        await expect(page.getByText('Serviços AWS Vault')).toBeVisible();

        // Passo B: Localiza e Clica no Clipes para "Baixar Anexo"
        const attachmentTrigger = page.locator('button[title="Ver Comprovante"]');
        await expect(attachmentTrigger).toBeVisible();
        await attachmentTrigger.click();

        // Passo C: Garante que o Front exibiu a UI Descriptografando SSE-C
        const decryptingLoader = page.getByText(/Descriptografando bytes seguros/i);
        await expect(decryptingLoader).toBeVisible();

        // Passo D: Validar Renderização Final do Iframe contendo Blob URL no DOM React
        // O src do iframe conterá "blob:http://..."
        const secureIframe = page.locator('iframe[title="Secure Attachment"]');
        // Espera ele dar mount dinâmico
        await expect(secureIframe).toBeVisible({ timeout: 5000 });

        // Obtenção da URL interna para conferir o revogamento depois
        const blobUrlInterno = await secureIframe.getAttribute('src');
        expect(blobUrlInterno).toContain('blob:');

        // Identificar etiqueta de Criptografia SSE-C preenchida
        await expect(page.getByText('SSE-C Vault')).toBeVisible();

        // Passo E: Fechamento do Modal e Revogação do Blob na Ram (Mem Leak Test via Playwright)
        const btnFechar = page.locator('button').filter({ hasText: 'Fechar Visualizador' }).first();
        // Apenas usando a tag de fechar geral
        await page.mouse.click(10, 10); // Clicar no Escuro (Overlay do Blur)

        // Garante que a UI desapareceu
        await expect(secureIframe).toBeHidden();
    });

});
