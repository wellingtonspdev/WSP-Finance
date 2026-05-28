import { expect, test } from './fixtures/exportDominio';

test.describe('S5-011: Exportação Domínio E2E', () => {
  // Teste 1: Usuário autorizado gera exportação
  test('Usuário autorizado gera exportação', async ({ page, setupDominio }) => {
    // Navigate using the exact route structure from App.tsx
    await page.goto(`/${setupDominio.workspaceId}/transactions`);

    // Wait for Exportar Domínio button to be visible, it means the page loaded successfully
    const exportBtn = page.getByRole('button', { name: /Exportar Domínio/i });
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    await exportBtn.click();

    // The modal should open
    await expect(page.getByRole('heading', { name: 'Exportar Domínio' })).toBeVisible();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    await page.getByLabel(/Data Inicial/i).fill(startStr);
    await page.getByLabel(/Data Final/i).fill(endStr);

    await page.getByRole('button', { name: 'Validar' }).click();

    // Wait for validation success -> button changes to "Baixar TXT"
    const baixarTxtBtn = page.getByRole('button', { name: 'Baixar TXT' });
    await expect(baixarTxtBtn).toBeEnabled({ timeout: 10000 });

    // Click Baixar TXT
    const downloadPromise = page.waitForEvent('download');
    await baixarTxtBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.txt$/i);

    // Assert that the page content does not leak internal keys (smoke security check on the UI)
    const content = await page.content();
    expect(content).not.toContain('objectKey');
    expect(content).not.toContain('presigned');
    expect(content).not.toContain('bucket');
  });

  // Teste 2: Usuário sem permissão não gera exportação
  test('Usuário sem permissão não gera exportação', async ({ request, setupDominio }) => {
    const res = await request.post(`http://127.0.0.1:3333/export/generate`, {
      headers: {
        Authorization: `Bearer ${setupDominio.unauthUserToken}`,
        'x-workspace-id': setupDominio.workspaceId.toString()
      },
      data: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }
    });

    // Expecting 403 because VIEWER cannot export
    expect(res.status()).toBe(403);

    const body = await res.text();
    expect(body).not.toContain('objectKey');
    expect(body).not.toContain('bucket');
    expect(body).not.toContain('presigned');
  });

  // Teste 3: Tentativa cross-tenant é bloqueada
  // Note: This smoke test validates the API middleware and membership blocking (spoofing x-workspace-id).
  // Deep RLS validation at the database layer is covered by backend ExportValidationService tests.
  test('Tentativa cross-tenant é bloqueada', async ({ request, setupDominio }) => {
    // The unauth user token belongs to their workspace or the specific E2E workspace.
    // We try to access workspace B which they have no access to.
    const res = await request.post(`http://127.0.0.1:3333/export/generate`, {
      headers: {
        Authorization: `Bearer ${setupDominio.unauthUserToken}`,
        'x-workspace-id': setupDominio.workspaceBId.toString()
      },
      data: {
        layoutId: 'dominio-separated-v1',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }
    });

    // Must be blocked by WorkspaceMiddleware or RbacMiddleware (403 or 404)
    expect([403, 404]).toContain(res.status());

    const body = await res.text();
    expect(body).not.toContain('objectKey');
    expect(body).not.toContain('bucket');
    expect(body).not.toContain('presigned');
  });

  // Teste 4: Blockers impedem geração
  test('Blockers impedem geração', async ({ page, setupDominio }) => {
    // Navigate using the exact route structure from App.tsx
    await page.goto(`/${setupDominio.workspaceId}/transactions`);

    // Wait for Exportar Domínio button to be visible
    const exportBtn = page.getByRole('button', { name: /Exportar Domínio/i });
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    await exportBtn.click();

    // Use a future date to trigger NO_EXPORTABLE_RECORDS
    await page.getByLabel(/Data Inicial/i).fill('2050-01-01');
    await page.getByLabel(/Data Final/i).fill('2050-12-31');

    await page.getByRole('button', { name: 'Validar' }).click();

    // The blocker message should be displayed (NO_EXPORTABLE_RECORDS)
    await expect(page.getByText(/Nenhuma transação exportável encontrada/i)).toBeVisible();

    // The "Baixar TXT" button should not be enabled/visible or at least should not be clickable to generate
    const baixarTxtBtn = page.getByRole('button', { name: 'Baixar TXT' });
    if (await baixarTxtBtn.isVisible()) {
      await expect(baixarTxtBtn).toBeDisabled();
    }
  });

  // Teste 5: Warnings não impedem geração
  test('Warnings não impedem geração', async ({ page, setupDominio }) => {
    // Navigate using the exact route structure from App.tsx
    await page.goto(`/${setupDominio.workspaceId}/transactions`);

    // Wait for Exportar Domínio button to be visible
    const exportBtn = page.getByRole('button', { name: /Exportar Domínio/i });
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    await exportBtn.click();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    await page.getByLabel(/Data Inicial/i).fill(startStr);
    await page.getByLabel(/Data Final/i).fill(endStr);

    await page.getByRole('button', { name: 'Validar' }).click();

    // Wait for validation to finish and button to be enabled
    const baixarTxtBtn = page.getByRole('button', { name: 'Baixar TXT' });
    await expect(baixarTxtBtn).toBeEnabled({ timeout: 15000 });

    // The warning should not block generation, but it must be displayed
    await expect(page.getByText(/TEXT_SANITIZED|MISSING_HISTORY_CODE|OPTIONAL_BRANCH_CODE_MISSING/i).first()).toBeVisible();
  });
});
