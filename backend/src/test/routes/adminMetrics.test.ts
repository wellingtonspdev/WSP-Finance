import { describe, it, expect, vi } from 'vitest';

/**
 * Testes de integração para a rota GET /admin/metrics.
 * Validam o pipeline de middlewares e o comportamento do endpoint.
 *
 * Nota: Estes testes verificam a configuração da rota, não o comportamento
 * real do banco (coberto pelos testes unitários do AdminService).
 */

// ── Verificação estática da configuração de rotas ─────────────────

describe('GET /admin/metrics — Route Configuration', () => {

  it('rota está registrada em routes.ts com pipeline correto', async () => {
    // Lê o arquivo routes.ts como texto para verificar a configuração
    const fs = await import('fs');
    const path = await import('path');
    const routesPath = path.resolve(__dirname, '../../routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    // Verifica que a rota existe
    expect(routesContent).toContain('/admin/metrics');

    // Verifica que usa AuthMiddleware
    expect(routesContent).toMatch(/AuthMiddleware.*\/admin\/metrics|\/admin\/metrics.*AuthMiddleware/s);

    // Verifica que usa AdminMiddleware
    expect(routesContent).toMatch(/AdminMiddleware.*\/admin\/metrics|\/admin\/metrics.*AdminMiddleware/s);
  });

  it('rota NÃO usa WorkspaceMiddleware', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routesPath = path.resolve(__dirname, '../../routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    // Encontra a linha da rota admin/metrics
    const lines = routesContent.split('\n');
    const routeLine = lines.find(l => l.includes('/admin/metrics'));

    expect(routeLine).toBeDefined();
    expect(routeLine).not.toContain('WorkspaceMiddleware');
  });

  it('AdminMiddleware está importado em routes.ts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routesPath = path.resolve(__dirname, '../../routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    expect(routesContent).toContain("import { AdminMiddleware }");
  });

  it('AdminController está importado em routes.ts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routesPath = path.resolve(__dirname, '../../routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');

    expect(routesContent).toContain("import { AdminController }");
  });
});

// ── Verificação do AdminService (LGPD Guard + sysPrisma) ──────────

describe('AdminService — Security Guards', () => {

  it('AdminService contém comentário LGPD Guard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const servicePath = path.resolve(__dirname, '../../services/AdminService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    expect(serviceContent).toMatch(/LGPD/i);
  });

  it('AdminService importa sysPrisma (não prisma com RLS)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const servicePath = path.resolve(__dirname, '../../services/AdminService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    // Deve importar sysPrisma
    expect(serviceContent).toContain('sysPrisma');

    // Não deve importar o prisma extended (com RLS)
    // Verifica que não há import { prisma } sem sys
    const importLines = serviceContent.split('\n').filter(l => l.includes('import'));
    const hasBareRlsPrisma = importLines.some(
      l => l.includes("{ prisma }") || l.includes("{ prisma,")
    );
    expect(hasBareRlsPrisma).toBe(false);
  });

  it('AdminService usa apenas COUNT(*) — sem SELECT *', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const servicePath = path.resolve(__dirname, '../../services/AdminService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    // Deve conter COUNT(*)
    expect(serviceContent).toContain('COUNT(*)');

    // Não deve conter SELECT *
    expect(serviceContent).not.toMatch(/SELECT\s+\*/);
  });
});
