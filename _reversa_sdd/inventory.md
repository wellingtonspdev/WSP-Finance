# Inventario do Projeto - WSP-Finance

Gerado pelo Reversa Scout em 2026-05-02T18:27:56-03:00.

## Escopo

- Raiz analisada: `C:\Users\Wellington\Desktop\WSP-Finance`
- Pastas excluidas conforme regra do Scout: `node_modules`, `.git`, `.reversa`, `_reversa_sdd`, `dist`, `build`, `coverage`, `__pycache__`, `.cache`
- Observacao: `.agents`, `.claude` e `.codex` existem no repositorio como metadados/skills de agente. Eles foram vistos no inventario bruto, mas nao foram tratados como modulos funcionais da aplicacao.

## Estrutura principal

```text
.
|-- .agents/                    # skills Reversa instaladas no projeto
|-- .claude/                    # skills Reversa para Claude
|-- .codex/                     # configuracao/skill local Codex
|-- .github/workflows/          # CI e release automation
|-- .specify/                   # contratos/artefatos de especificacao
|-- backend/                    # API Express + Prisma
|   |-- archive/sql/            # SQLs arquivados/diagnosticos
|   |-- documentacao/           # docs especificas do backend
|   |-- prisma/                 # schema, seed e migrations
|   |-- scripts/                # utilitarios de runtime/teste
|   |-- src/
|   |   |-- controllers/
|   |   |-- errors/
|   |   |-- infra/external/
|   |   |-- lib/
|   |   |-- middlewares/
|   |   |-- providers/
|   |   |-- repositories/
|   |   |-- services/
|   |   `-- test/
|   `-- tests/
|       |-- controllers/
|       |-- integration/
|       |-- middlewares/
|       |-- providers/
|       |-- routes/
|       |-- services/
|       `-- utils/
|-- documentacao/               # ADRs e benchmarks
|-- frontend/                   # React + Vite
|   |-- public/
|   |-- scripts/
|   |-- src/
|   |   |-- app/
|   |   |-- assets/
|   |   |-- config/
|   |   |-- features/
|   |   |   |-- accountant/
|   |   |   |-- auth/
|   |   |   |-- dashboard/
|   |   |   |-- transactions/
|   |   |   `-- workspaces/
|   |   |-- services/
|   |   `-- shared/
|   `-- tests/
|       |-- app/
|       |-- e2e/
|       |-- hooks/
|       |-- lib/
|       `-- setup/
`-- scripts/                    # scripts SQL operacionais
```

## Linguagens e tipos de arquivo

Contagem bruta de arquivos, excluindo as pastas padrao do Scout:

| Extensao | Arquivos |
|---|---:|
| `.ts` | 159 |
| `.tsx` | 69 |
| `.md` | 65 |
| `.log` | 24 |
| `.sql` | 23 |
| `.js` | 9 |
| `.json` | 9 |
| `.svg` | 3 |
| `.gitignore` | 3 |
| `.yml` | 2 |
| `.cjs` | 2 |
| `.css` | 2 |
| `.example` | 2 |
| `.toml` | 2 |
| `.yaml` | 2 |
| `.mjs` | 2 |
| `.png` | 1 |
| `.env` | 1 |
| `.properties` | 1 |
| `.prisma` | 1 |
| `.html` | 1 |

Linguagem principal: TypeScript.

## Tecnologias identificadas

- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Swagger UI/autogen, Vitest.
- Frontend: React 19, Vite 7, TypeScript, React Router 7, TanStack Query, Zustand, Tailwind CSS 4, Framer Motion, Vitest, Playwright.
- Banco de dados: Prisma schema + migrations SQL, com sinais de PostgreSQL, RLS e extensao `pg_trgm`.
- CI/CD: GitHub Actions para backend tests, frontend tests, Playwright smoke, SonarCloud e Release Please.
- Gerenciador de pacotes: pnpm em `backend/` e `frontend/` via `pnpm-lock.yaml`; CI ativa Corepack com `pnpm@9.0.0`.

## Pontos de entrada

### Backend

- `backend/src/server.ts`: cria app Express, registra middlewares globais, Swagger em `/docs`, arquivos estaticos em `/files`, rotas e error handler; inicia o servidor quando `NODE_ENV !== 'test'`.
- `backend/src/routes.ts`: roteador principal da API, com controllers, middlewares de auth/workspace/RBAC, upload de certificado A1 e rate limit de upload.
- `backend/src/swagger-output.json`: contrato Swagger estatico usado em runtime.
- `backend/swagger.js` e `backend/swagger.config.js`: geracao do Swagger.
- `backend/prisma/schema.prisma`: schema ORM e modelo relacional.
- `backend/prisma/seed.ts` e `backend/prisma/seed/modules/*`: seed da base.

### Frontend

- `frontend/src/main.tsx`: bootstrap React, QueryClientProvider, ToastProvider, AuthProvider e WorkspaceProvider.
- `frontend/src/App.tsx`: roteamento principal com lazy loading e rotas autenticadas.
- `frontend/index.html`: HTML de entrada do Vite.
- `frontend/vite.config.ts`: configuracao de build/test runner frontend.

## Configuracoes relevantes

- Raiz: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `sonar-project.properties`, `release-please-config.json`, `.release-please-manifest.json`.
- Backend: `backend/.env.example`, `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.mjs`, `backend/vitest.config.ts`, `backend/swagger.config.js`.
- Frontend: `frontend/.env.example`, `frontend/package.json`, `frontend/tsconfig*.json`, `frontend/vite.config.ts`, `frontend/vitest.config.mjs`, `frontend/playwright.config.ts`, `frontend/tailwind.config.js`, `frontend/eslint.config.js`.

## CI/CD

- `.github/workflows/ci.yml`
  - Backend tests + coverage em Ubuntu com PostgreSQL 16.
  - Prisma generate, `tsc --noEmit`, migrate deploy, seed, `pnpm test -- --coverage`.
  - Frontend tests + coverage.
  - Playwright smoke usando `frontend/tests/e2e/cacheLogin.spec.ts`.
  - SonarCloud apos os jobs de teste.
- `.github/workflows/release-please.yml`
  - Release Please em push para `main`.

## Docker

Nao foram encontrados `Dockerfile`, `docker-compose.yml` ou `docker-compose.yaml` na raiz, em `backend/` ou em `frontend/`.

## Banco de dados e ORM

- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Seed: `backend/prisma/seed.ts`, `backend/prisma/seed.js`, `backend/prisma/seed/modules/`
- SQLs operacionais/diagnosticos: `backend/archive/sql/*.sql`, `scripts/*.sql`

Modelos Prisma identificados:

- `User`
- `WorkspaceMember`
- `Workspace`
- `Category`
- `Account`
- `Transaction`
- `AuditLog`
- `Notification`
- `RefreshToken`
- `PasswordResetToken`
- `AccountVerificationToken`
- `WorkspaceInvite`
- `BankMovement`
- `AccountantDashboardCache`

Enums Prisma identificados:

- `UserType`
- `WorkspaceType`
- `DocumentType`
- `MovementSource`
- `MovementStatus`
- `TransactionType`
- `AccountType`
- `TransactionStatus`
- `WorkspaceRole`
- `InviteStatus`
- `AuditAction`

## Testes

Frameworks identificados:

- Backend: Vitest, Supertest, coverage V8.
- Frontend: Vitest, Testing Library, jsdom, Playwright.

Arquivos de teste encontrados: 35.

Distribuicao:

- Backend: 24 arquivos (`backend/src/test`, `backend/tests`)
- Frontend: 11 arquivos (`frontend/tests`)
- E2E Playwright: 4 specs em `frontend/tests/e2e`

## Modulos funcionais identificados

- `auth`: registro, login, refresh, perfil, verificacao de email e recuperacao de senha.
- `workspaces`: criacao/listagem/edicao de workspaces, membros, convites e certificado A1.
- `rbac-rls`: middlewares `AuthMiddleware`, `WorkspaceMiddleware`, `RbacMiddleware` e checks de privilegio/RLS.
- `finance-core`: contas, categorias, transacoes, dashboard e reconciliacao de saldo.
- `uploads-storage`: URLs pre-assinadas, upload local, anexos e provedores S3/local.
- `imports-open-finance`: importacao OFX, webhook Open Finance e ingestao financeira.
- `bank-movements`: staging de movimentos bancarios, deduplicacao fuzzy, merge, approve/reject.
- `accountant`: hub do contador, cache de dashboard, inbox de convites e inbox de aprovacao.
- `external-data`: clientes ReceitaWS, ViaCEP e BrasilAPI.
- `frontend-shell`: providers, roteamento, layouts, guards, UI shared e estado de workspace.

## Integracoes externas detectadas

- AWS SDK S3 / presigned URLs (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- ReceitaWS, ViaCEP e BrasilAPI por clientes em `backend/src/infra/external/`.
- OFX/Open Finance por `ofx-js` e webhook `/api/webhooks/open-finance`.
- Email transacional por Nodemailer/Ethereal.
- SonarCloud via GitHub Actions.

## Observacoes para proximos agentes

- A escavacao deve priorizar a cadeia backend-controller-service-repository-Prisma e a cadeia frontend-api-hook-route por modulo.
- O schema tem RLS/multi-tenant como preocupacao arquitetural central.
- `backend/src/swagger-output.json` e os comentarios Swagger em `backend/src/routes.ts` indicam que o contrato HTTP esta parcialmente codificado no roteador.
- Existem arquivos `.env` e logs locais no workspace; nao foram copiados para estes artefatos.
