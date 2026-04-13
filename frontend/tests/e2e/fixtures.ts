import { test as base } from '@playwright/test';
import { generateMockToken } from './jwtMocker';

// Estendemos a base de teste do Playwright para incluir o nosso contexto mockado.
export const test = base.extend<{ authSession: void }>({
  authSession: async ({ context }, use) => {
    const token = generateMockToken();

    // Adiciona o mock no LocalStorage que clientes como supabase-js utilizam (simulação local)
    // O nome da chave exato depende da base de app, geralmente sb-[projetoref]-auth-token
    // Injetamos um fallback global que intercepte e defina cookies também
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
      }
    ]);

    await context.addInitScript((tokenVal) => {
      // Injeta no local storage do navegador virtual
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: {
          access_token: tokenVal,
          refresh_token: tokenVal,
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'qa@wspfinance.com',
          }
        }
      }));
    }, token);

    // Setup finalizado, libere para rodar o teste
    await use();
  },
});

export { expect } from '@playwright/test';
