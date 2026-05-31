# Codebase Structure

**Analysis Date:** 2026-05-31

## Directory Layout

```
WSP-Finance/
├── .agents/                 # Local Reversa skill definitions and references
├── .codex/                  # Project-specific Codex skills and lightweight repo maps
├── .github/                 # CI workflow configuration
├── .planning/codebase/      # GSD-generated codebase maps
├── .reversa/                # Reversa runtime state and context
├── .specify/                # Specification workflow metadata
├── _reversa_sdd/            # Reversa-generated SDD/process documentation
├── backend/                 # Express API, Prisma schema/migrations, services, tests
├── documentacao/            # Project documentation and benchmark notes
├── frontend/                # React/Vite SPA, feature slices, shared UI/state, tests
├── scripts/                 # Repo-level SQL/utility scripts
├── AGENTS.md                # Repo agent instructions
├── BACKEND_GUIDELINES.md    # Backend engineering constraints
├── FRONTEND_GUIDELINES.md   # Frontend engineering constraints
├── PRODUCT_SCOPE_MASTER.md  # Product scope reference
└── README.md                # Setup and project overview
```

## Directory Purposes

**`.agents/skills`:**
- Purpose: Defines Reversa framework skills used by the project.
- Contains: `reversa`, `reversa-scout`, `reversa-archaeologist`, `reversa-architect`, `reversa-data-master`, `reversa-detective`, `reversa-writer`, `reversa-reviewer`, and UI/design/reconstruction helpers.
- Key files: `.agents/skills/reversa/SKILL.md`, `.agents/skills/reversa-architect/SKILL.md`, `.agents/skills/reversa-data-master/SKILL.md`

**`.codex/skills`:**
- Purpose: Defines repo-specific Codex operating guidance.
- Contains: `wsp-finance-token-ops` skill and references.
- Key files: `.codex/skills/wsp-finance-token-ops/SKILL.md`, `.codex/skills/wsp-finance-token-ops/references/project-map.md`

**`.github/workflows`:**
- Purpose: Defines automated validation in GitHub Actions.
- Contains: CI workflow files.
- Key files: `.github/workflows/ci.yml`

**`.planning/codebase`:**
- Purpose: Stores GSD codebase mapping documents consumed by planning/execution commands.
- Contains: Architecture, structure, stack, integration, convention, testing, and concern maps as generated.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`

**`backend`:**
- Purpose: Backend application root.
- Contains: `package.json`, TypeScript configs, Prisma schema/migrations, Express source, tests, scripts.
- Key files: `backend/package.json`, `backend/src/server.ts`, `backend/src/routes.ts`, `backend/prisma/schema.prisma`

**`backend/src`:**
- Purpose: Backend source root.
- Contains: Express entrypoints, controllers, middlewares, services, repositories, providers, infra clients, workers, schemas, libs, and tests/helpers.
- Key files: `backend/src/server.ts`, `backend/src/routes.ts`, `backend/src/lib/prisma.ts`

**`backend/src/controllers`:**
- Purpose: HTTP request/response adapters.
- Contains: Class-based controllers for auth, users, workspaces, finance, ingestion, accountant, export, admin, AI, and Telegram.
- Key files: `backend/src/controllers/AuthController.ts`, `backend/src/controllers/TransactionController.ts`, `backend/src/controllers/BankMovementController.ts`, `backend/src/controllers/ExportController.ts`, `backend/src/controllers/TelegramIntegrationController.ts`

**`backend/src/middlewares`:**
- Purpose: Express middleware for auth, workspace tenancy, RBAC, admin, and route-param guards.
- Contains: `AuthMiddleware.ts`, `WorkspaceMiddleware.ts`, `RbacMiddleware.ts`, `AdminMiddleware.ts`, `WorkspaceRouteParamGuard.ts`.
- Key files: `backend/src/middlewares/AuthMiddleware.ts`, `backend/src/middlewares/WorkspaceMiddleware.ts`, `backend/src/middlewares/RbacMiddleware.ts`

**`backend/src/services`:**
- Purpose: Business logic and side-effect orchestration.
- Contains: Domain services for auth, workspace, transactions, dashboard, ingestion, bank movement approval, accountant cache, exports, uploads, AI, Telegram, cron, audit, and outbox.
- Key files: `backend/src/services/TransactionService.ts`, `backend/src/services/FinancialIngestionEngine.ts`, `backend/src/services/BankMovementService.ts`, `backend/src/services/AccountantCacheService.ts`, `backend/src/services/OutboxService.ts`

**`backend/src/repositories`:**
- Purpose: Prisma query wrappers and persistence helpers.
- Contains: Repository classes for accounts, categories, transactions, dashboard, workspace, users, notifications, bank movements, and accountant cache.
- Key files: `backend/src/repositories/TransactionRepository.ts`, `backend/src/repositories/AccountRepository.ts`, `backend/src/repositories/BankMovementRepository.ts`

**`backend/src/lib`:**
- Purpose: Shared backend infrastructure helpers.
- Contains: Prisma singleton/RLS extension, tenant context, environment checks, Swagger setup, sanitization/masking, encoding, formatting helpers.
- Key files: `backend/src/lib/prisma.ts`, `backend/src/lib/tenantContext.ts`, `backend/src/lib/checkEnvironment.ts`

**`backend/src/providers`:**
- Purpose: Abstractions and concrete providers for storage, mail, and AI.
- Contains: Interfaces and implementations for local/S3 storage, mail, fake AI, and provider factories.
- Key files: `backend/src/providers/IStorageProvider.ts`, `backend/src/providers/S3StorageProvider.ts`, `backend/src/providers/exportStorageProviderFactory.ts`, `backend/src/providers/AiProvider.ts`

**`backend/src/infra/external`:**
- Purpose: External data service clients.
- Contains: BrasilAPI, ReceitaWS, ViaCEP clients and coordination service.
- Key files: `backend/src/infra/external/ExternalDataService.ts`, `backend/src/infra/external/ViaCepClient.ts`, `backend/src/infra/external/ReceitaWsClient.ts`

**`backend/src/workers`:**
- Purpose: Background processors for outbox and AI insights.
- Contains: Outbox worker, AI outbox worker, and AI transaction insight handlers.
- Key files: `backend/src/workers/OutboxWorker.ts`, `backend/src/workers/AiOutboxWorker.ts`, `backend/src/workers/ai/TransactionExpenseInsightHandler.ts`

**`backend/prisma`:**
- Purpose: Prisma schema, migrations, and seed.
- Contains: `schema.prisma`, migration directories, seed script.
- Key files: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/prisma/migrations`

**`backend/tests`:**
- Purpose: Backend test suites outside `src`.
- Contains: Controller, service, integration, middleware, provider, route, seed, worker, Prisma, and utility tests.
- Key files: `backend/tests/services`, `backend/tests/integration`, `backend/tests/middlewares`

**`frontend`:**
- Purpose: Frontend application root.
- Contains: Vite/React app source, configs, test suites, package manifest.
- Key files: `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/vite.config.ts`

**`frontend/src`:**
- Purpose: Frontend source root.
- Contains: App providers, feature slices, shared components/lib/state, global styles, config, assets.
- Key files: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`

**`frontend/src/app`:**
- Purpose: App-level React context.
- Contains: Authentication provider and user/session state.
- Key files: `frontend/src/app/AuthProvider.tsx`

**`frontend/src/features`:**
- Purpose: Feature-sliced frontend domain code.
- Contains: `accountant`, `admin`, `ai-insights`, `auth`, `dashboard`, `transactions`, `workspaces`.
- Key files: `frontend/src/features/transactions/pages/TransactionHistoryPage.tsx`, `frontend/src/features/dashboard/routes/DashboardPage.tsx`, `frontend/src/features/accountant/routes/AccountantHubPage.tsx`

**`frontend/src/features/accountant`:**
- Purpose: Accountant hub, approval inbox, invite inbox, and accountant-specific navigation components.
- Contains: `api`, `components`, `routes`.
- Key files: `frontend/src/features/accountant/routes/AccountantHubPage.tsx`, `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx`, `frontend/src/features/accountant/api/bankMovements.ts`

**`frontend/src/features/auth`:**
- Purpose: Login, registration, verification, and password recovery UI.
- Contains: `components`, `hooks`, `routes`, `types`.
- Key files: `frontend/src/features/auth/routes/LoginPage.tsx`, `frontend/src/features/auth/hooks/useLogin.ts`, `frontend/src/features/auth/types/index.ts`

**`frontend/src/features/transactions`:**
- Purpose: Transaction history, create/edit flows, attachments, AI badges, Domínio export.
- Contains: `api`, `components`, `hooks`, `pages`, `types`.
- Key files: `frontend/src/features/transactions/components/TransactionModal.tsx`, `frontend/src/features/transactions/pages/TransactionHistoryPage.tsx`, `frontend/src/features/transactions/hooks/useTransactions.ts`

**`frontend/src/features/workspaces`:**
- Purpose: Workspace context, workspace creation, team settings, invites, bridge transfer, documents, Telegram config.
- Contains: `api`, `components`, `context`, `hooks`, `routes`, `types`.
- Key files: `frontend/src/features/workspaces/context/WorkspaceProvider.tsx`, `frontend/src/features/workspaces/routes/TeamSettingsPage.tsx`, `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`

**`frontend/src/shared`:**
- Purpose: Reusable frontend infrastructure and UI.
- Contains: Shared components, guards, layout, context, hooks, API client, query client, formatting helpers, Zustand store.
- Key files: `frontend/src/shared/lib/axios.ts`, `frontend/src/shared/lib/react-query.ts`, `frontend/src/shared/stores/useWorkspaceStore.ts`, `frontend/src/shared/components/layout/AppLayout.tsx`

**`frontend/tests`:**
- Purpose: Frontend tests.
- Contains: App integration, E2E, feature, hook, lib, and setup tests.
- Key files: `frontend/tests/app`, `frontend/tests/e2e`, `frontend/tests/features`, `frontend/tests/hooks`

**`scripts`:**
- Purpose: Repo-level operational and benchmark scripts.
- Contains: SQL/utilities outside the backend package.
- Key files: `scripts/benchmark_pg_trgm.sql`

**`documentacao`:**
- Purpose: Supporting documentation.
- Contains: Benchmark notes and architecture/product documentation.
- Key files: `documentacao/benchmark_pg_trgm_staging.md`

## Key File Locations

**Entry Points:**
- `backend/src/server.ts`: Express app construction, startup checks, cron, Telegram polling, global error handler.
- `backend/src/routes.ts`: API route table and middleware ordering.
- `frontend/src/main.tsx`: React mount and provider composition.
- `frontend/src/App.tsx`: React Router route graph and lazy-loaded screens.

**Configuration:**
- `backend/package.json`: Backend scripts and runtime/test dependencies.
- `frontend/package.json`: Frontend scripts and runtime/test dependencies.
- `backend/prisma/schema.prisma`: Prisma datasource, enums, models, and relations.
- `backend/vitest.config.ts` or `backend/vitest.config.mjs`: Backend Vitest configuration.
- `frontend/vitest.config.ts` or `frontend/vitest.config.mjs`: Frontend Vitest configuration.
- `frontend/playwright.config.ts`: Frontend E2E configuration.
- `.github/workflows/ci.yml`: CI validation workflow.
- `sonar-project.properties`: Sonar analysis configuration.

**Core Logic:**
- `backend/src/lib/prisma.ts`: RLS-aware Prisma client and `sysPrisma`.
- `backend/src/lib/tenantContext.ts`: Request-scoped tenant context.
- `backend/src/middlewares/WorkspaceMiddleware.ts`: Workspace membership and tenant context enforcement.
- `backend/src/services/TransactionService.ts`: Transaction creation/deletion, balance, tax, audit, outbox rules.
- `backend/src/services/FinancialIngestionEngine.ts`: External financial movement staging.
- `backend/src/services/BankMovementService.ts`: Accountant approval inbox transitions.
- `backend/src/services/AccountantCacheService.ts`: Accountant dashboard cache materialization.
- `backend/src/services/ExportService.ts`: Accounting export orchestration.
- `frontend/src/shared/lib/axios.ts`: API client, token injection, workspace header derivation, refresh queue.
- `frontend/src/app/AuthProvider.tsx`: Session restore and auth state.
- `frontend/src/shared/stores/useWorkspaceStore.ts`: Persisted active workspace state.

**Testing:**
- `backend/tests/services`: Backend unit/service tests.
- `backend/tests/integration`: Backend integration and RLS tests.
- `backend/tests/middlewares`: Middleware behavior tests.
- `frontend/tests/app`: Frontend app/provider integration tests.
- `frontend/tests/features`: Feature route/component tests.
- `frontend/tests/e2e`: Playwright smoke/E2E tests.
- `frontend/tests/hooks`: React hook tests.

**Generated/Derived:**
- `backend/src/swagger-output.json`: Swagger output consumed by `backend/src/server.ts`.
- `backend/dist`: Backend build output when generated.
- `frontend/dist`: Frontend build output when generated.
- `coverage`: Test coverage output when generated.

## Naming Conventions

**Files:**
- Backend controllers use PascalCase plus role suffix: `backend/src/controllers/TransactionController.ts`, `backend/src/controllers/AuthController.ts`.
- Backend services use PascalCase plus `Service`: `backend/src/services/TransactionService.ts`, `backend/src/services/OutboxService.ts`.
- Backend repositories use PascalCase plus `Repository`: `backend/src/repositories/TransactionRepository.ts`, `backend/src/repositories/AccountRepository.ts`.
- Backend middlewares use PascalCase plus `Middleware` or guard name: `backend/src/middlewares/AuthMiddleware.ts`, `backend/src/middlewares/WorkspaceRouteParamGuard.ts`.
- Frontend route/page components use PascalCase plus `Page`: `frontend/src/features/dashboard/routes/DashboardPage.tsx`, `frontend/src/features/transactions/pages/TransactionHistoryPage.tsx`.
- Frontend hooks use `use*.ts`: `frontend/src/features/transactions/hooks/useTransactions.ts`, `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.
- Frontend API modules use camelCase verbs/nouns: `frontend/src/features/transactions/api/createTransaction.ts`, `frontend/src/features/workspaces/api/executeBridgeTransfer.ts`.
- Frontend type indexes use `types/index.ts`: `frontend/src/features/auth/types/index.ts`, `frontend/src/features/workspaces/types/index.ts`.

**Directories:**
- Backend technical layers are plural lower-case directories: `controllers`, `services`, `repositories`, `middlewares`, `providers`, `workers`.
- Frontend domain slices live under `frontend/src/features/<domain>`.
- Frontend shared infrastructure lives under `frontend/src/shared/<kind>`.
- Tests mirror test type or layer: `backend/tests/services`, `backend/tests/integration`, `frontend/tests/features`, `frontend/tests/e2e`.

## Where to Add New Code

**New Backend API Endpoint:**
- Route registration: `backend/src/routes.ts`
- Controller: `backend/src/controllers/<Domain>Controller.ts`
- Service/business logic: `backend/src/services/<Domain>Service.ts`
- Persistence helper: `backend/src/repositories/<Domain>Repository.ts`
- Request schema shared across endpoints: `backend/src/schemas`
- Tests: `backend/tests/controllers`, `backend/tests/services`, and `backend/tests/integration` depending on risk.

**New Workspace-Scoped Backend Feature:**
- Primary route: add `AuthMiddleware, WorkspaceMiddleware` chain in `backend/src/routes.ts`.
- Business logic: `backend/src/services/<Feature>Service.ts`
- Data access: `backend/src/repositories/<Feature>Repository.ts`
- Prisma model/migration: `backend/prisma/schema.prisma` and `backend/prisma/migrations`
- Tenant/RLS tests: `backend/tests/integration` when membership or workspace isolation changes.

**New Admin/Global Backend Feature:**
- Primary route: `backend/src/routes.ts` with `AuthMiddleware, AdminMiddleware`.
- Service: `backend/src/services/<Feature>Service.ts`
- Use `sysPrisma` only when the feature intentionally aggregates global platform data and does not expose tenant records.
- Tests: `backend/tests/routes`, `backend/tests/services`, or `backend/tests/controllers`.

**New Background Worker/Event:**
- Event persistence: `backend/src/services/OutboxService.ts` and `OutboxEvent` model in `backend/prisma/schema.prisma`.
- Worker implementation: `backend/src/workers` or `backend/src/workers/<domain>`.
- Enqueue point: service transaction where the business event occurs.
- Tests: `backend/tests/workers` and relevant service tests.

**New External Integration:**
- Client/service wrapper: `backend/src/infra/external` for external data APIs or `backend/src/providers` for replaceable providers.
- Orchestration: `backend/src/services/<Integration>Service.ts`.
- Endpoint: `backend/src/controllers/<Integration>Controller.ts` and `backend/src/routes.ts` if exposed over HTTP.
- Tests: `backend/tests/services`, `backend/tests/providers`, or `backend/tests/controllers`.

**New Frontend Feature:**
- Primary code: `frontend/src/features/<feature>`
- Route screen: `frontend/src/features/<feature>/routes/<FeaturePage>.tsx` or `frontend/src/features/<feature>/pages/<FeaturePage>.tsx`
- API calls: `frontend/src/features/<feature>/api`
- Hooks: `frontend/src/features/<feature>/hooks`
- Components: `frontend/src/features/<feature>/components`
- Types: `frontend/src/features/<feature>/types`
- Route registration: `frontend/src/App.tsx`
- Tests: `frontend/tests/features/<feature>` and `frontend/tests/hooks` for reusable hooks.

**New Workspace Frontend Route:**
- Add child route under `path="/"` in `frontend/src/App.tsx` using `:workspaceId/<route>`.
- Put route component under `frontend/src/features/<domain>/routes`.
- Use existing `api` from `frontend/src/shared/lib/axios.ts`; do not manually persist workspace headers unless working on accountant cross-workspace route exceptions.

**New Shared Frontend Utility:**
- Generic API/query/config utility: `frontend/src/shared/lib`
- Cross-feature store: `frontend/src/shared/stores`
- Layout/guard/reusable component: `frontend/src/shared/components`
- Global hook: `frontend/src/shared/hooks`

**New Prisma Model or Migration:**
- Schema: `backend/prisma/schema.prisma`
- Migration: `backend/prisma/migrations`
- Seed changes: `backend/prisma/seed.ts` when sample/bootstrap data is required.
- Data access: add repository under `backend/src/repositories` and use it from services.

**New Reversa/GSD Documentation:**
- Reversa outputs: `.reversa/` and `_reversa_sdd/` only.
- GSD codebase maps: `.planning/codebase/`.
- Project process docs: `_reversa_sdd/process`.

## Special Directories

**`.reversa`:**
- Purpose: Reversa runtime state and context.
- Generated: Yes
- Committed: Project-dependent; treat as Reversa-owned.

**`_reversa_sdd`:**
- Purpose: Reversa SDD artifacts, process templates, and analysis outputs.
- Generated: Yes
- Committed: Project-dependent; do not overwrite outside Reversa tasks.

**`.planning/codebase`:**
- Purpose: GSD codebase mapper outputs used by planning/execution commands.
- Generated: Yes
- Committed: Yes when planning artifacts are part of workflow.

**`node_modules`:**
- Purpose: Installed package dependencies.
- Generated: Yes
- Committed: No

**`backend/prisma/migrations`:**
- Purpose: Database schema migration history.
- Generated: Partly by Prisma migration tooling, then reviewed/committed.
- Committed: Yes

**`backend/src/config/exportLayouts`:**
- Purpose: Accounting export layout definitions and loader.
- Generated: No
- Committed: Yes

**`backend/src/swagger-output.json`:**
- Purpose: Swagger document served by `backend/src/server.ts`.
- Generated: Yes
- Committed: Project-dependent; update through swagger generation flow.

**`backend/uploads`:**
- Purpose: Local static upload storage if present at runtime.
- Generated: Yes
- Committed: No

**`backend/archive`:**
- Purpose: Archived SQL/reference material.
- Generated: No
- Committed: Yes if retained as project reference.

**`frontend/src/assets`:**
- Purpose: Static frontend assets imported by the React app.
- Generated: No
- Committed: Yes

**`frontend/tests/e2e`:**
- Purpose: Playwright end-to-end and smoke tests.
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-05-31*
