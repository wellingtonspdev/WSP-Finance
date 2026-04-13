import jwt from 'jsonwebtoken';

// Segredo que bate com a definição da Tarefa
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

/**
 * Gera um token falso com a assinatura real usada no ambiente local de testes (Supabase local secret).
 * O token contém os metadados necessários para que as requisições autenticadas para o
 * backend e regras RLS interpretem a role autenticada sem precisar executar
 * fluxos pesados de UI de Autenticação.
 */
export function generateMockToken(overrides = {}) {
  const payload = {
    // Mock user
    sub: '123e4567-e89b-12d3-a456-426614174000',      
    email: 'qa@wspfinance.com',
    role: 'authenticated',         
    aud: 'authenticated',         
    app_metadata: { provider: 'email' },
    user_metadata: {},
    workspace_id: '11111111-2222-3333-4444-555555555555',
    ...overrides,
  };
  
  // Utiliza HMAC SHA256 (HS256) como padrão no Supabase
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}
