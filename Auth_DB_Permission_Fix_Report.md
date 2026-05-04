# Auth DB Permission Fix Report

## Causa Raiz
Após o processo de reseeding e drop do banco de dados (que provavelmente foi executado como superusuário `postgres`), os privilégios do usuário de aplicação (`wsp_test_user`) sobre o schema `public` e seus objetos foram perdidos. Isso ocasionava o erro de `permission denied for schema public` quando o backend, autenticado como `wsp_test_user`, tentava executar as queries do Prisma Client (ex: `prisma.user.findUnique()`).

## Solução Aplicada
Foi executado um script de conexão direta ao banco usando as credenciais do `postgres` (via `DIRECT_URL`) para conceder novamente os privilégios necessários ao usuário da aplicação (`wsp_test_user`). 

As seguintes `GRANTs` e políticas padrão (`DEFAULT PRIVILEGES`) foram aplicadas cirurgicamente:

```sql
-- 1. Permite o uso do schema
GRANT USAGE ON SCHEMA public TO wsp_test_user;

-- 2. Permite CRUD em todas as tabelas atuais
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wsp_test_user;

-- 3. Permite acesso a sequências atuais (importante para auto-incrementos e IDs)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO wsp_test_user;

-- 4. Garante as mesmas permissões para tabelas que forem criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wsp_test_user;

-- 5. Garante as mesmas permissões para sequências que forem criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO wsp_test_user;
```

## Validação
- **Conexão**: Script de verificação confirmou que `wsp_test_user` agora consegue realizar count em `public."User"`.
- **Backend API**: A rota de login (`/auth/session`) foi validada. O erro de permissão no Prisma foi resolvido, e a API respondeu normalmente o fluxo de autenticação (401 apenas para credenciais incorretas no script de teste, mas sem estourar o erro de DB 500 original).
- **Acesso**: A falha no `prisma.user.findUnique()` não ocorre mais no ambiente de desenvolvimento local.
