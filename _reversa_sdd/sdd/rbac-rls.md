# SDD - RBAC e RLS

## Visão Geral

[CONFIRMADO] O componente `rbac-rls` implementa a cadeia de segurança multi-tenant do WSP Finance: autenticação HTTP, validação de workspace, autorização hierárquica por role, propagação de contexto tenant via `AsyncLocalStorage`, injeção de `app.current_workspace_id` no Prisma e aplicação de Row-Level Security no PostgreSQL.

[CONFIRMADO] A decisão arquitetural documentada em ADR é usar RLS como controle estrutural contra vazamento cross-tenant e impedir startup quando a role runtime do banco possui `SUPERUSER` ou `BYPASSRLS`.

[INFERIDO] O desenho combina defesa em camadas: API valida identidade e membership, RBAC valida capacidade funcional, Prisma propaga contexto e PostgreSQL bloqueia linhas fora do tenant.

## Responsabilidades

- [CONFIRMADO] Rejeitar requests sem JWT válido nas rotas protegidas por `AuthMiddleware`.
- [CONFIRMADO] Injetar `req.user.id` a partir do `sub` do JWT.
- [CONFIRMADO] Exigir `x-workspace-id` numérico em rotas escopadas por workspace.
- [CONFIRMADO] Validar que o usuário autenticado possui `WorkspaceMember` no workspace solicitado.
- [CONFIRMADO] Bloquear `ACCOUNTANT` em workspace `PERSONAL`.
- [CONFIRMADO] Propagar `currentWorkspaceId`, `userRole` e `workspaceType` em `tenantContext`.
- [CONFIRMADO] Comparar role do usuário contra role mínima exigida por rota com `RbacMiddleware`.
- [CONFIRMADO] Injetar `app.current_workspace_id` no PostgreSQL antes de queries/transactions Prisma com contexto tenant.
- [CONFIRMADO] Aplicar RLS em tabelas financeiras multi-tenant.
- [CONFIRMADO] Permitir leitura de categorias globais com `workspaceId IS NULL`.
- [CONFIRMADO] Falhar startup se a role runtime do banco for superuser ou bypassar RLS.
- [CONFIRMADO] Separar `prisma` estendido, com RLS, de `sysPrisma` para operações globais controladas.

## Interface

### Middlewares e Contexto

| Item | Entrada | Saída / efeito | Confiança |
|---|---|---|---|
| `AuthMiddleware` | header `Authorization` | `req.user.id` ou `401` | CONFIRMADO |
| `WorkspaceMiddleware` | `req.user.id`, header `x-workspace-id` | `req.workspaceId`, `tenantContext.run(...)` ou erro | CONFIRMADO |
| `RbacMiddleware(requiredRole)` | `req.user.id`, workspace id, role requerida | `req.userRole` ou `403` | CONFIRMADO |
| `tenantContext` | `currentWorkspaceId`, `userRole`, `workspaceType`, flags | store async por request/transação | CONFIRMADO |
| Prisma extended client | chamada Prisma com store tenant | `set_config('app.current_workspace_id', ...)` + query | CONFIRMADO |
| `checkPrivileges` | conexão Prisma runtime | erro fatal se role insegura | CONFIRMADO |

### Roles

| Role | Nível | Escopo | Confiança |
|---|---:|---|---|
| `VIEWER` | 1 | workspace | CONFIRMADO |
| `EDITOR` | 2 | workspace | CONFIRMADO |
| `ACCOUNTANT` | 2.5 | workspace/persona operacional | CONFIRMADO |
| `OWNER` | 3 | workspace | CONFIRMADO |

### Tabelas RLS

| Tabela | Regra principal | Confiança |
|---|---|---|
| `Transaction` | `workspaceId` deve bater com `app.current_workspace_id` | CONFIRMADO |
| `Account` | `workspaceId` deve bater com `app.current_workspace_id` | CONFIRMADO |
| `Category` | leitura permite global `workspaceId IS NULL` ou workspace atual; escrita exige workspace atual | CONFIRMADO |
| `BankMovement` | `workspaceId` deve bater com `app.current_workspace_id` | CONFIRMADO |

### Rotas e Proteção

| Categoria de rota | Proteção esperada | Confiança |
|---|---|---|
| Rotas privadas gerais | `AuthMiddleware` | CONFIRMADO |
| Rotas operacionais por workspace | `AuthMiddleware` + `WorkspaceMiddleware` | CONFIRMADO |
| Rotas administrativas específicas | `AuthMiddleware` + `WorkspaceMiddleware` + `RbacMiddleware` ou validação equivalente no service | CONFIRMADO |
| Rotas globais do contador | `AuthMiddleware` + validações internas por membership `ACCOUNTANT` | CONFIRMADO |
| Webhook Open Finance | bearer próprio, sem `AuthMiddleware` | CONFIRMADO |
| CNPJ/CEP externo | sem `AuthMiddleware` no código analisado | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Request com `AuthMiddleware` sem header `Authorization` retorna `401 Token not provided`.
- [CONFIRMADO] JWT inválido ou expirado retorna `401 Token invalid or expired`.
- [CONFIRMADO] JWT é verificado com `process.env.JWT_SECRET || 'super-secret-key-change-me'`.
- [CONFIRMADO] `AuthMiddleware` injeta `req.user.id = Number(sub)`.
- [CONFIRMADO] A tipagem global declara `Request.user.id: number` e `Request.workspaceId?: number`.
- [CONFIRMADO] `WorkspaceMiddleware` aceita header `x-workspace-id` como string ou array, usando o primeiro item quando array.
- [CONFIRMADO] `WorkspaceMiddleware` converte `x-workspace-id` para `Number` e rejeita `NaN`.
- [CONFIRMADO] `WorkspaceMiddleware` exige `req.user.id`.
- [CONFIRMADO] Membership é buscado pela chave composta `userId_workspaceId`.
- [CONFIRMADO] Sem membership, o acesso ao workspace é negado.
- [CONFIRMADO] `ACCOUNTANT` em workspace `PERSONAL` é bloqueado com log `[ZERO TRUST BLOCK]`.
- [CONFIRMADO] `tenantContext` carrega `currentWorkspaceId`, `userRole`, `workspaceType`, `bypassRls` e `inTransaction`.
- [CONFIRMADO] `RbacMiddleware(requiredRole)` resolve workspace pelo header `x-workspace-id` ou fallback `req.workspaceId`.
- [CONFIRMADO] Se contexto de usuário/workspace está ausente no RBAC, retorna erro de contexto inválido.
- [CONFIRMADO] Se usuário não é membro no RBAC, retorna `403`.
- [CONFIRMADO] Se `roleHierarchy[membership.role] < roleHierarchy[requiredRole]`, retorna `403 Permissão insuficiente`.
- [CONFIRMADO] Em sucesso, `RbacMiddleware` injeta `userRole` na request.
- [CONFIRMADO] `prisma` exportado é um client estendido sobre `basePrisma`.
- [CONFIRMADO] `sysPrisma` é o `basePrisma` sem extensão automática de tenant.
- [CONFIRMADO] `DATABASE_URL` recebe `connection_limit` quando esse parâmetro não está presente.
- [CONFIRMADO] Em query normal com `currentWorkspaceId`, sem `bypassRls` e sem `inTransaction`, o Prisma estendido abre transação, executa `set_config` e depois a query.
- [CONFIRMADO] Em transação interativa, o Prisma estendido marca `inTransaction`, injeta `set_config` no mesmo `tx` e chama a função do usuário.
- [CONFIRMADO] Em array transaction, o Prisma estendido antepõe `set_config` antes das queries.
- [CONFIRMADO] Quando `inTransaction` já está ativo, o hook global evita reinjetar contexto.
- [CONFIRMADO] Quando não há `currentWorkspaceId` ou quando `bypassRls` está ativo, a operação segue pelo client base.
- [CONFIRMADO] RLS é habilitado e forçado para tabelas multi-tenant financeiras.
- [CONFIRMADO] Policies usam `current_setting('app.current_workspace_id', true)::int` ou versão otimizada com subquery estável.
- [CONFIRMADO] Role de migration `prisma_migration` recebe `BYPASSRLS` condicionalmente quando existe.
- [CONFIRMADO] `checkPrivileges` consulta `pg_roles` e rejeita `rolsuper === true` ou `rolbypassrls === true`.
- [CONFIRMADO] `server.ts` executa `checkPrivileges(prisma as any)` antes de cron jobs e `app.listen`.
- [CONFIRMADO] Falha no check de privilégios impede startup com `process.exit(1)`.
- [CONFIRMADO] `AuthMiddleware` usa `authorization.split(' ')` e não valida explicitamente o prefixo `Bearer`; header malformado falha por consequência no `jwt.verify`. [Revisão Reviewer]
- [CONFIRMADO] Algumas rotas autenticadas não usam `WorkspaceMiddleware` (`/transactions/all`, `/bridge/transfer`, `/accountant/bank-movements/pending`) e dependem de autorização interna/global no service. [Revisão Reviewer]
- [CONFIRMADO] Esta especificação é baseada em leitura estática; testes RLS não foram executados contra banco real nesta fase. [Revisão Reviewer]

## Fluxo Principal

### Request Escopado por Workspace

1. [CONFIRMADO] Cliente envia request com Bearer token.
2. [CONFIRMADO] `AuthMiddleware` valida JWT e injeta `req.user.id`.
3. [CONFIRMADO] `WorkspaceMiddleware` lê `x-workspace-id`.
4. [CONFIRMADO] Middleware valida que o workspace id é numérico.
5. [CONFIRMADO] Middleware busca `WorkspaceMember` por usuário e workspace.
6. [CONFIRMADO] Middleware bloqueia ausência de membership.
7. [CONFIRMADO] Middleware bloqueia contador em workspace pessoal.
8. [CONFIRMADO] Middleware injeta `req.workspaceId`.
9. [CONFIRMADO] Middleware executa `next()` dentro de `tenantContext.run`.
10. [CONFIRMADO] Se a rota usa `RbacMiddleware`, role atual é comparada com a role mínima.
11. [CONFIRMADO] Controller/service executa regra de negócio.
12. [CONFIRMADO] Chamada Prisma recebe contexto tenant.
13. [CONFIRMADO] Prisma injeta `app.current_workspace_id`.
14. [CONFIRMADO] PostgreSQL aplica policies RLS e limita linhas ao workspace atual.

### Transação Prisma com RLS

1. [CONFIRMADO] Service chama `prisma.$transaction` dentro de request com tenant context.
2. [CONFIRMADO] Extensão Prisma detecta `currentWorkspaceId`.
3. [CONFIRMADO] Para transação interativa, o store é reexecutado com `inTransaction=true`.
4. [CONFIRMADO] Prisma abre transação no `basePrisma`.
5. [CONFIRMADO] Prisma executa `SELECT set_config('app.current_workspace_id', workspaceId, true)` no mesmo `tx`.
6. [CONFIRMADO] Função transacional do service executa queries usando o `tx`.
7. [CONFIRMADO] Policies RLS enxergam o setting local durante a transação.

### Startup Seguro

1. [CONFIRMADO] Backend inicializa Prisma.
2. [CONFIRMADO] `server.ts` chama `checkPrivileges`.
3. [CONFIRMADO] `checkPrivileges` consulta `pg_roles` para `current_user`.
4. [CONFIRMADO] Se role é `SUPERUSER` ou `BYPASSRLS`, lança erro.
5. [CONFIRMADO] Startup é interrompido antes de cron jobs e `app.listen`.

## Fluxos Alternativos

- [CONFIRMADO] Se `Authorization` está ausente, request protegida termina em `401`.
- [CONFIRMADO] Se JWT é inválido ou expirado, request termina em `401`.
- [CONFIRMADO] Se `x-workspace-id` está ausente, `WorkspaceMiddleware` retorna erro `400`.
- [CONFIRMADO] Se `x-workspace-id` não é número, `WorkspaceMiddleware` retorna erro `400`.
- [CONFIRMADO] Se `req.user.id` não existe antes do workspace middleware, retorna `401`.
- [CONFIRMADO] Se membership não existe, retorna `403`.
- [CONFIRMADO] Se contador tenta workspace pessoal, retorna `403` e registra warning.
- [CONFIRMADO] Se role atual é inferior à role requerida, `RbacMiddleware` retorna `403`.
- [CONFIRMADO] Se não há tenant context, Prisma não injeta `set_config`; a operação depende de query direta/base ou de validação interna.
- [CONFIRMADO] Se `bypassRls` está ativo, Prisma delega para `basePrisma`.
- [CONFIRMADO] Se `inTransaction` está ativo, o hook global não reinjeta `set_config`.
- [CONFIRMADO] Se uma policy RLS não permite a linha, PostgreSQL oculta ou bloqueia a operação.

## Dependências

- [CONFIRMADO] `jsonwebtoken` valida JWT no `AuthMiddleware`.
- [CONFIRMADO] Prisma persiste e consulta memberships, workspaces e dados financeiros.
- [CONFIRMADO] `AsyncLocalStorage` propaga tenant context por cadeia async.
- [CONFIRMADO] PostgreSQL aplica `current_setting('app.current_workspace_id', true)`.
- [CONFIRMADO] Migrations Prisma habilitam e ajustam RLS.
- [CONFIRMADO] `backend/src/server.ts` controla ordem de startup.
- [CONFIRMADO] Test helpers usam role restrita `wsp_test_user` para integração RLS.
- [CONFIRMADO] Frontend Axios injeta `x-workspace-id` para rotas por workspace.

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|---|---|---|---|
| Segurança | Rotas privadas devem exigir JWT válido. | `AuthMiddleware.ts` | CONFIRMADO |
| Segurança | Rotas por workspace devem exigir membership. | `WorkspaceMiddleware.ts` | CONFIRMADO |
| Segurança | Contador deve ser bloqueado em workspace pessoal. | `WorkspaceMiddleware.ts` | CONFIRMADO |
| Segurança | Role funcional deve ser comparada por hierarquia. | `RbacMiddleware.ts` | CONFIRMADO |
| Segurança | Filtro por tenant não deve depender apenas de repositories. | migrations RLS + ADR 001 | CONFIRMADO |
| Segurança | Runtime não deve rodar com role `SUPERUSER`/`BYPASSRLS`. | `checkEnvironment.ts`, `server.ts` | CONFIRMADO |
| Consistência | `set_config` precisa ocorrer no mesmo contexto transacional da query. | `backend/src/lib/prisma.ts` | CONFIRMADO |
| Performance | Policies RLS usam versão otimizada com subquery estável. | migration `20260413052239_optimize_rls_and_statistics` | CONFIRMADO |
| Testabilidade | Testes devem conseguir usar role restrita e rollback efêmero. | `setup-test-role.ts`, `prisma-test-clients.ts` | CONFIRMADO |
| Auditabilidade | Bloqueios zero-trust relevantes devem ser visíveis em logs. | warning `[ZERO TRUST BLOCK]` | CONFIRMADO |

## Critérios de Aceitação

```gherkin
Dado uma rota protegida por AuthMiddleware
Quando a request não possui Authorization
Então o sistema rejeita com 401 Token not provided

Dado uma rota protegida por AuthMiddleware
Quando o JWT é válido
Então o sistema injeta req.user.id com o sub numérico do token

Dado uma rota protegida por WorkspaceMiddleware
Quando x-workspace-id está ausente ou não é numérico
Então o sistema rejeita a request antes do controller

Dado um usuário autenticado sem membership no workspace solicitado
Quando ele chama uma rota escopada por workspace
Então o sistema rejeita com 403

Dado um usuário ACCOUNTANT tentando acessar workspace PERSONAL
Quando a request passa pelo WorkspaceMiddleware
Então o sistema rejeita com 403 e registra bloqueio zero-trust

Dado uma rota com RbacMiddleware('OWNER')
Quando o usuário tem role EDITOR
Então o sistema rejeita com 403 Permissão insuficiente

Dado uma request com tenantContext ativo
Quando o service executa uma query Prisma normal
Então o Prisma injeta app.current_workspace_id antes da query

Dado uma transação Prisma interativa com tenantContext ativo
Quando a transação inicia
Então o sistema executa set_config no mesmo tx antes das queries de domínio

Dado uma query em Transaction com RLS habilitado
Quando app.current_workspace_id aponta para outro workspace
Então o PostgreSQL não retorna linhas fora do workspace atual

Dado uma role runtime do banco com SUPERUSER ou BYPASSRLS
Quando o backend inicia
Então o startup falha antes de app.listen
```

## Cenários de Borda

| Cenário | Comportamento Esperado | Confiança |
|---|---|---|
| Header Authorization ausente | `401 Token not provided`. | CONFIRMADO |
| JWT expirado | `401 Token invalid or expired`. | CONFIRMADO |
| Header `Authorization` sem prefixo Bearer explícito | Falha por `jwt.verify`, mas sem validação semântica explícita do prefixo. | CONFIRMADO |
| `x-workspace-id` como array | Usa o primeiro valor. | CONFIRMADO |
| `x-workspace-id` não numérico | Rejeição `400`. | CONFIRMADO |
| Membership inexistente | Rejeição `403`. | CONFIRMADO |
| `ACCOUNTANT` em `PERSONAL` | Rejeição `403` com warning. | CONFIRMADO |
| Role abaixo da mínima | Rejeição `403`. | CONFIRMADO |
| Query Prisma sem tenant context | Não injeta `set_config`; segurança depende do caminho chamador. | CONFIRMADO |
| Operação com `bypassRls` | Usa `basePrisma` sem extensão tenant. | CONFIRMADO |
| Categoria global | Pode ser lida quando `workspaceId IS NULL`; escrita exige workspace atual. | CONFIRMADO |
| Runtime DB superuser | Startup bloqueado. | CONFIRMADO |
| Runtime DB com bypassrls | Startup bloqueado. | CONFIRMADO |

## Prioridade

| Requisito | MoSCoW | Justificativa | Confiança |
|---|---|---|---|
| JWT obrigatório em rotas privadas | Must | Base da identidade da request. | CONFIRMADO |
| Membership obrigatório em rotas por workspace | Must | Base do isolamento multi-tenant na API. | CONFIRMADO |
| Bloqueio `ACCOUNTANT` em `PERSONAL` | Must | Regra zero-trust explícita. | CONFIRMADO |
| RLS em tabelas financeiras | Must | Controle estrutural contra vazamento cross-tenant. | CONFIRMADO |
| Startup sem `SUPERUSER`/`BYPASSRLS` | Must | Garante que RLS não é neutralizado pela role runtime. | CONFIRMADO |
| RBAC hierárquico | Must | Controla operações administrativas e sensíveis. | CONFIRMADO |
| `set_config` em transações | Must | Mantém RLS correto em operações atômicas. | CONFIRMADO |
| Testes com role restrita | Should | Reduz risco de regressão em RLS. | CONFIRMADO |
| Validação explícita de prefixo Bearer | Should | Melhoraria clareza de erro e robustez do middleware. | LACUNA |
| Capabilities centralizadas no backend | Could | Frontend hoje simula parte das permissões. | INFERIDO |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---|---|---|
| `backend/src/middlewares/AuthMiddleware.ts` | `AuthMiddleware` | CONFIRMADO |
| `backend/src/middlewares/WorkspaceMiddleware.ts` | `WorkspaceMiddleware` | CONFIRMADO |
| `backend/src/middlewares/RbacMiddleware.ts` | `RbacMiddleware`, `roleHierarchy` | CONFIRMADO |
| `backend/src/lib/tenantContext.ts` | `tenantContext`, `TenantContext` | CONFIRMADO |
| `backend/src/lib/prisma.ts` | `basePrisma`, `sysPrisma`, `prisma` extended client | CONFIRMADO |
| `backend/src/lib/checkEnvironment.ts` | `checkPrivileges` | CONFIRMADO |
| `backend/src/server.ts` | chamada de `checkPrivileges` antes do startup | CONFIRMADO |
| `backend/src/@types/express.d.ts` | tipos de `Request.user`, `Request.workspaceId` | CONFIRMADO |
| `backend/prisma/migrations/20260310203000_enable_rls_multi_tenant/migration.sql` | habilitação/força RLS e policies iniciais | CONFIRMADO |
| `backend/prisma/migrations/20260413052239_optimize_rls_and_statistics/migration.sql` | policies otimizadas e `BankMovement` | CONFIRMADO |
| `backend/src/test/setup-test-role.ts` | criação/normalização de role restrita | CONFIRMADO |
| `backend/src/test/prisma-test-clients.ts` | clients de teste management/application e rollback efêmero | CONFIRMADO |
| `backend/tests/middlewares/WorkspaceIsolator.test.ts` | bloqueio contador em workspace pessoal | CONFIRMADO |
| `backend/tests/integration/RLS.integration.test.ts` | prova de isolamento RLS entre workspaces | CONFIRMADO |
| `backend/tests/integration/role-audit.test.ts` | auditoria de role restrita | CONFIRMADO |
| `backend/tests/integration/prisma-runtime-role.test.ts` | falha para `rolsuper`/`rolbypassrls` | CONFIRMADO |
| `frontend/src/shared/lib/axios.ts` | injeção de `x-workspace-id` no client | CONFIRMADO |
| `_reversa_sdd/flowcharts/rbac-rls.md` | visão consolidada da cadeia | CONFIRMADO |
| `_reversa_sdd/flowcharts/rbac-rls-prisma.md` | injeção RLS no Prisma | CONFIRMADO |
| `_reversa_sdd/flowcharts/rbac-rls-middleware.md` | middlewares Auth/Workspace/RBAC | CONFIRMADO |
| `_reversa_sdd/flowcharts/rbac-rls-policy.md` | policies PostgreSQL RLS | CONFIRMADO |
| `_reversa_sdd/adrs/001-multi-tenant-rls-zero-trust.md` | decisão arquitetural de RLS e role restrita | CONFIRMADO |
