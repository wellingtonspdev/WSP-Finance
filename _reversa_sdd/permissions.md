# Permissions Matrix - WSP Finance

## Papéis

| Papel | Escopo | Descrição | Confiança |
|---|---|---|---|
| `CLIENT` | usuário | tipo padrão de usuário final. | 🟢 |
| `ACCOUNTANT` | usuário/persona | contador B2B2C com hub próprio. | 🟢 |
| `OWNER` | workspace role | controle total do workspace. | 🟢 |
| `EDITOR` | workspace role | edição operacional. | 🟢 |
| `VIEWER` | workspace role | leitura. | 🟢 |
| `ACCOUNTANT` | workspace role | contador associado ao workspace. | 🟢 |

## Hierarquia RBAC

| Role | Nível | Confiança |
|---|---:|---|
| `VIEWER` | 1 | 🟢 |
| `EDITOR` | 2 | 🟢 |
| `ACCOUNTANT` | 2.5 | 🟢 |
| `OWNER` | 3 | 🟢 |

## Matriz Backend

| Funcionalidade/Rota | Middleware/Regra | OWNER | EDITOR | ACCOUNTANT | VIEWER | Observação |
|---|---|---:|---:|---:|---:|---|
| `GET /workspaces` | Auth | Sim | Sim | Sim | Sim | Lista memberships do usuário. |
| `POST /workspaces` | Auth | Sim | Sim | Sim | Sim | Cria novo workspace e OWNER. |
| `PUT /workspaces/:id` | Auth + service ownership | Sim | Não | Não | Não | Confirmado em service. |
| `POST /workspaces/:id/certificate-a1` | Auth + Workspace + `RbacMiddleware('OWNER')` | Sim | Não | Não | Não | Rota mais restrita que service. |
| `POST /workspaces/:id/invites` | Auth + Workspace + service OWNER | Sim | Não | Não | Não | Convite só por OWNER. |
| `DELETE /workspaces/:id/members/:userId` | Auth + Workspace + service OWNER | Sim | Não | Não | Não | Auto-remoção bloqueada. |
| `GET /categories` | Auth + Workspace | Sim | Sim | Sim* | Sim | `ACCOUNTANT` bloqueado se workspace PERSONAL. |
| `POST /categories` | Auth + Workspace | Sim | Sim | Sim* | Sim | Não há `RbacMiddleware`; permissões dependem de service/RLS. |
| `GET /accounts` | Auth + Workspace | Sim | Sim | Sim* | Sim | idem. |
| `POST/PUT/PATCH/DELETE /accounts` | Auth + Workspace | Sim | Sim | Sim* | Sim | 🔴 sem RBAC explícito de escrita na rota. |
| `GET /transactions` | Auth + Workspace | Sim | Sim | Sim* | Sim | Listagem por workspace. |
| `POST /transactions` | Auth + Workspace + fiscal lock | Sim | Sim | Sim* | Sim | 🔴 sem RBAC explícito de escrita na rota. |
| `DELETE /transactions/:id` | Auth + Workspace + fiscal lock | Sim | Sim | Sim* | Sim | 🔴 sem RBAC explícito de escrita na rota. |
| `GET /transactions/all` | Auth | Sim | Sim | Sim | Sim | Lista por memberships; sem WorkspaceMiddleware. |
| `GET /dashboard/summary` | Auth + Workspace | Sim | Sim | Sim* | Sim | Dashboard escopado. |
| `POST /uploads/presigned` | Auth + Workspace + rate limit | Sim | Sim | Sim* | Sim | Quota/MIME no service. |
| `GET /transactions/:id/attachment` | Auth + Workspace | Sim | Sim | Sim* | Sim | Audita visualização. |
| `POST /transactions/import` | Auth + Workspace | Sim | Sim | Sim* | Sim | 🔴 sem RBAC explícito de escrita na rota. |
| `GET /bank-movements` | Auth + Workspace | Sim | Sim | Sim* | Sim | Lista pendências do workspace. |
| `POST /bank-movements/:id/approve` | Auth + Workspace + fiscal lock | Sim | Sim | Sim* | Sim | 🔴 sem RBAC explícito de aprovação na rota. |
| `GET /accountant/bank-movements/pending` | Auth + repository memberships ACCOUNTANT | Não | Não | Sim | Não | Global do contador. |
| `POST /bridge/transfer` | Auth + service requires OWNER/ACCOUNTANT in both workspaces | Sim | Não | Sim | Não | Service valida dois lados. |
| `GET /external/document/:cnpj` | Nenhum AuthMiddleware | Público | Público | Público | Público | 🔴 endpoint externo aberto. |
| `POST /api/webhooks/open-finance` | Bearer token próprio | N/A | N/A | N/A | N/A | Sem AuthMiddleware. |

`Sim*`: permitido se houver membership e se `WorkspaceMiddleware` não bloquear `ACCOUNTANT` em `PERSONAL`.

## Matriz Frontend

| Capacidade UI | Regra | Confiança |
|---|---|---|
| Editar ações comuns | `useCapabilities.canEdit = role not in ACCOUNTANT, VIEWER` | 🟢 |
| Ver banner de auditoria | `role === ACCOUNTANT` | 🟢 |
| Entrar no hub contador | rota privada `/accountant/hub` | 🟢 |
| Contador em workspace PERSONAL | redirecionado para hub | 🟢 |
| Header `x-workspace-id` | derivado da URL pelo interceptor Axios | 🟢 |

## Lacunas de Permissão

- 🔴 **LACUNA**: várias rotas de escrita em finanças usam Auth + Workspace, mas não aplicam `RbacMiddleware`; a real autorização de escrita fica implícita ou ausente.
- 🔴 **LACUNA**: frontend simula capabilities, mas isso não substitui autorização backend.
- 🔴 **LACUNA**: rotas externas CNPJ/CEP estão públicas.
- 🟡 **INFERIDO**: a intenção é evoluir para capabilities vindas do backend, indicada por comentário em `useCapabilities`.
