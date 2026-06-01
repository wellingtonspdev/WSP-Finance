<!-- refreshed: 2026-05-31 -->
# Architecture

**Analysis Date:** 2026-05-31

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 React SPA / Feature Routes                  │
├──────────────────┬──────────────────┬───────────────────────┤
│ Auth + Session   │ Workspace Shell  │ Finance/Accountant UI │
│ `frontend/src/app` │ `frontend/src/features/workspaces` │ `frontend/src/features` │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Axios API Client + React Query/Zustand          │
│ `frontend/src/shared/lib/axios.ts`                           │
│ `frontend/src/shared/lib/react-query.ts`                     │
│ `frontend/src/shared/stores/useWorkspaceStore.ts`            │
└─────────────────────────────────────────────────────────────┘
         │ HTTP + JWT + `x-workspace-id`
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Routing                       │
│ `backend/src/server.ts` -> `backend/src/routes.ts`           │
├──────────────────┬──────────────────┬───────────────────────┤
│ Controllers      │ Middlewares      │ Workers/Cron           │
│ `backend/src/controllers` │ `backend/src/middlewares` │ `backend/src/workers` |
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Services + Repositories                │
│ `backend/src/services`                                       │
│ `backend/src/repositories`                                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL via Prisma + RLS Context                         │
│  `backend/src/lib/prisma.ts`                                 │
│  `backend/src/lib/tenantContext.ts`                          │
│  `backend/prisma/schema.prisma`                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Express app | Configures CORS, JSON parsing, static files, Swagger, routes, global error handling, startup checks, cron, and Telegram polling bootstrap | `backend/src/server.ts` |
| Route registry | Owns HTTP route declarations and middleware ordering for auth, workspace, RBAC, uploads, accountant, export, admin, AI, and Telegram endpoints | `backend/src/routes.ts` |
| Auth middleware | Validates JWT bearer tokens and attaches `req.user.id` | `backend/src/middlewares/AuthMiddleware.ts` |
| Workspace middleware | Requires `x-workspace-id`, validates membership, blocks accountant access to PERSONAL workspaces, and runs downstream handlers inside tenant context | `backend/src/middlewares/WorkspaceMiddleware.ts` |
| RBAC middleware | Enforces workspace role hierarchy `OWNER > ACCOUNTANT > EDITOR > VIEWER` | `backend/src/middlewares/RbacMiddleware.ts` |
| Prisma client | Provides the only application Prisma client, injects `app.current_workspace_id` for RLS, and exposes `sysPrisma` for explicitly global/admin infrastructure paths | `backend/src/lib/prisma.ts` |
| Tenant context | Holds per-request workspace, role, workspace type, RLS bypass, and transaction state with `AsyncLocalStorage` | `backend/src/lib/tenantContext.ts` |
| Controllers | Parse/validate request data, call services, map expected domain errors to HTTP responses | `backend/src/controllers/TransactionController.ts` |
| Services | Own business rules, atomic transactions, audit/outbox side effects, integrations, and domain orchestration | `backend/src/services/TransactionService.ts` |
| Repositories | Encapsulate Prisma queries and transaction-client compatibility | `backend/src/repositories/TransactionRepository.ts` |
| React route graph | Defines lazy-loaded public, private, admin, accountant, and workspace routes | `frontend/src/App.tsx` |
| React providers | Compose QueryClient, toast, auth, workspace, UI, and theme context providers | `frontend/src/main.tsx` |
| Auth provider | Restores sessions, refreshes JWTs, persists refresh token/user/cache state, and exposes login/logout/cache refresh | `frontend/src/app/AuthProvider.tsx` |
| Workspace provider/store | Derives active workspace from auth memberships and persists active workspace identity | `frontend/src/features/workspaces/context/WorkspaceProvider.tsx`, `frontend/src/shared/stores/useWorkspaceStore.ts` |
| Axios client | Injects bearer token and derives `x-workspace-id` from URL segments before requests; queues refresh-token retries after 401 responses | `frontend/src/shared/lib/axios.ts` |

## Pattern Overview

**Overall:** TypeScript monorepo with layered Express backend and feature-sliced React frontend.

**Key Characteristics:**
- Backend requests flow through `backend/src/routes.ts` into controller classes, service classes, repositories, and Prisma.
- Tenant isolation is cross-cutting: frontend route URL determines `x-workspace-id`, backend membership validation creates tenant context, and Prisma extension sets PostgreSQL RLS session config.
- Frontend code is organized by feature domains under `frontend/src/features/*` with shared infrastructure under `frontend/src/shared/*`.
- Financial mutations use service-level transactions, `decimal.js`/Prisma `Decimal`, audit logs, and outbox events where relevant.
- Reversa project skills define mapping and reconstruction constraints in `.agents/skills/reversa*/SKILL.md`; repo-specific engineering invariants are indexed in `.codex/skills/wsp-finance-token-ops/SKILL.md`.

## Layers

**Frontend Routes:**
- Purpose: Define the user-facing navigation graph and lazy-load screens.
- Location: `frontend/src/App.tsx`
- Contains: Public auth routes, invite route, admin route, accountant routes, workspace child routes.
- Depends on: `frontend/src/app/AuthProvider.tsx`, `frontend/src/shared/components/guards/*`, feature route modules.
- Used by: `frontend/src/main.tsx`.

**Frontend Feature Slices:**
- Purpose: Keep domain UI, hooks, API calls, and types grouped by business area.
- Location: `frontend/src/features`
- Contains: `accountant`, `admin`, `ai-insights`, `auth`, `dashboard`, `transactions`, `workspaces`.
- Depends on: `frontend/src/shared/lib/axios.ts`, `frontend/src/shared/lib/react-query.ts`, shared components/stores.
- Used by: `frontend/src/App.tsx` and nested components.

**Frontend Shared Infrastructure:**
- Purpose: Provide reusable API client, layout, guards, stores, formatting, query client, toasts, and UI context.
- Location: `frontend/src/shared`
- Contains: `components`, `context`, `hooks`, `lib`, `stores`, `types`.
- Depends on: React, Axios, Zustand, TanStack Query, local env config.
- Used by: All feature slices.

**Backend HTTP Layer:**
- Purpose: Build the Express app, register middleware/routes, serve Swagger/static files, and centralize error handling.
- Location: `backend/src/server.ts`, `backend/src/routes.ts`
- Contains: CORS, JSON middleware, `/files`, `/docs`, route declarations, global `errorHandler`.
- Depends on: Controllers, middlewares, `backend/src/lib/prisma.ts`, `backend/src/lib/checkEnvironment.ts`.
- Used by: Node runtime via `backend/package.json` scripts.

**Backend Controllers:**
- Purpose: Convert HTTP requests into service calls and shape HTTP responses.
- Location: `backend/src/controllers`
- Contains: Controller classes such as `TransactionController`, `WorkspaceController`, `BankMovementController`, `ExportController`, `TelegramIntegrationController`.
- Depends on: `zod`, service classes, Prisma enums when needed.
- Used by: `backend/src/routes.ts`.

**Backend Middlewares:**
- Purpose: Enforce authentication, workspace membership, workspace route-param consistency, RBAC, and admin access.
- Location: `backend/src/middlewares`
- Contains: `AuthMiddleware.ts`, `WorkspaceMiddleware.ts`, `RbacMiddleware.ts`, `WorkspaceRouteParamGuard.ts`, `AdminMiddleware.ts`.
- Depends on: `backend/src/lib/prisma.ts`, `backend/src/lib/tenantContext.ts`, JWT config.
- Used by: `backend/src/routes.ts`.

**Backend Services:**
- Purpose: Own business logic, side effects, integration orchestration, and transaction boundaries.
- Location: `backend/src/services`
- Contains: financial core, auth, workspace, invite, import, Open Finance, bank movement, accountant cache, export, upload, AI, Telegram, cron, audit, outbox services.
- Depends on: Repositories, Prisma client, providers, external clients, domain helpers.
- Used by: Controllers, workers, and startup bootstrap.

**Backend Repositories:**
- Purpose: Encapsulate Prisma persistence operations and keep services focused on business rules.
- Location: `backend/src/repositories`
- Contains: `TransactionRepository.ts`, `AccountRepository.ts`, `CategoryRepository.ts`, `DashboardRepository.ts`, `BankMovementRepository.ts`, `AccountantCacheRepository.ts`, and related repositories.
- Depends on: `backend/src/lib/prisma.ts`, Prisma model types.
- Used by: Services.

**Backend Providers/Infra:**
- Purpose: Abstract external services and storage/mail/AI implementations.
- Location: `backend/src/providers`, `backend/src/infra`
- Contains: S3/local storage providers, mail provider, fake AI provider, ReceitaWS/BrasilAPI/ViaCEP clients.
- Depends on: AWS SDK, Nodemailer, Axios, local interfaces.
- Used by: Upload, export, external data, auth/verification, and AI services.

**Database/ORM:**
- Purpose: Define domain persistence model and enforce tenant-sensitive access.
- Location: `backend/prisma/schema.prisma`, `backend/prisma/migrations`, `backend/src/lib/prisma.ts`
- Contains: Prisma datasource/generator, enums, models, migrations, seed script.
- Depends on: PostgreSQL and environment variables `DATABASE_URL`/`DIRECT_URL`.
- Used by: Backend services, repositories, tests, workers.

**Background Processing:**
- Purpose: Run scheduled and asynchronous work outside direct request/response paths.
- Location: `backend/src/services/CronService.ts`, `backend/src/workers`
- Contains: `OutboxWorker.ts`, `AiOutboxWorker.ts`, AI insight handlers, cron bootstrap.
- Depends on: `OutboxService`, Prisma, AI providers.
- Used by: `backend/src/server.ts` and worker-oriented tests.

## Data Flow

### Primary Workspace Request Path

1. User navigates to a workspace route such as `/:workspaceId/dashboard` in `frontend/src/App.tsx`.
2. Feature hook/API call uses `api` from `frontend/src/shared/lib/axios.ts`.
3. Axios request interceptor reads the URL and sets `x-workspace-id` in `frontend/src/shared/lib/axios.ts`.
4. Express receives the request through `backend/src/server.ts` and dispatches via `backend/src/routes.ts`.
5. `AuthMiddleware` validates JWT and sets `req.user.id` in `backend/src/middlewares/AuthMiddleware.ts`.
6. `WorkspaceMiddleware` validates membership and wraps downstream execution with `tenantContext.run(...)` in `backend/src/middlewares/WorkspaceMiddleware.ts`.
7. Controller parses request/query/body and calls a service, for example `backend/src/controllers/TransactionController.ts`.
8. Service applies business rules and starts any required `prisma.$transaction`, for example `backend/src/services/TransactionService.ts`.
9. Repository executes Prisma queries through the RLS-aware client in `backend/src/repositories/TransactionRepository.ts`.
10. Prisma extension sets PostgreSQL `app.current_workspace_id` before model operations in `backend/src/lib/prisma.ts`.
11. Controller returns JSON response to the React feature component/hook.

### Session Restore Flow

1. `AuthProvider` loads `wsp_refresh_token` from localStorage in `frontend/src/app/AuthProvider.tsx`.
2. It calls `PATCH /auth/refresh` through `frontend/src/shared/lib/axios.ts`.
3. `backend/src/routes.ts` dispatches to `AuthController.refresh`.
4. Frontend stores the new refresh token, sets the in-memory access token, then calls `GET /auth/me`.
5. `AuthProvider` stores `wsp_user_info` and optional `wsp_dashboard_cache`, then publishes memberships to `useWorkspaceStore`.

### Financial Transaction Create Flow

1. `frontend/src/features/transactions/components/TransactionModal.tsx` collects transaction input.
2. Transaction hooks/API modules under `frontend/src/features/transactions/hooks` and `frontend/src/features/transactions/api` call `POST /transactions`.
3. `backend/src/routes.ts` applies `AuthMiddleware` and `WorkspaceMiddleware`.
4. `TransactionController.create` validates body with Zod in `backend/src/controllers/TransactionController.ts`.
5. `TransactionService.create` checks account/category ownership, fiscal close rules, tax/platform calculations, audit logging, balance updates, and outbox enqueueing in `backend/src/services/TransactionService.ts`.
6. `TransactionRepository`, `AccountRepository`, `CategoryRepository`, `AuditLogService`, and `OutboxService` operate inside a Prisma transaction.

### Ingestion and Accountant Approval Flow

1. OFX imports enter through `/transactions/import` in `backend/src/routes.ts`; Open Finance batches enter through `/api/webhooks/open-finance`.
2. `ImportService`, `OpenFinanceWebhookService`, and `FinancialIngestionEngine` persist staging records as `BankMovement`.
3. Accountant UI under `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx` calls bank movement APIs.
4. `BankMovementController` and `BankMovementService` list, merge, approve, or reject movements in `backend/src/controllers/BankMovementController.ts` and `backend/src/services/BankMovementService.ts`.
5. Approval converts a pending `BankMovement` into a real `Transaction` and updates financial state.

### Export Download Flow

1. Transaction UI calls export APIs under `frontend/src/features/transactions/api/exportDominio.ts`.
2. `backend/src/routes.ts` applies `AuthMiddleware`, `WorkspaceMiddleware`, and `RbacMiddleware('ACCOUNTANT')` for `/export/validate` and `/export/generate`.
3. `ExportController` coordinates validation, layout, archive, formatter, and storage services.
4. Download uses route-param guard plus workspace/RBAC checks at `/workspaces/:workspaceId/exports/:archiveId/download`.
5. `ExportDownloadController` returns a short-lived download URL generated by storage provider abstractions.

**State Management:**
- Server state: PostgreSQL via Prisma models in `backend/prisma/schema.prisma`.
- Tenant request state: `AsyncLocalStorage` in `backend/src/lib/tenantContext.ts`.
- Frontend server cache: TanStack Query client in `frontend/src/shared/lib/react-query.ts`.
- Frontend auth/workspace state: React context in `frontend/src/app/AuthProvider.tsx` and `frontend/src/features/workspaces/context/WorkspaceProvider.tsx`, plus persisted Zustand state in `frontend/src/shared/stores/useWorkspaceStore.ts`.
- Browser persistence: `wsp_refresh_token`, `wsp_user_info`, `wsp_dashboard_cache`, `wsp_active_workspace`, and `wsp-workspace-storage`.

## Key Abstractions

**Tenant Context:**
- Purpose: Carry workspace and role metadata from middleware to Prisma extension and service rules.
- Examples: `backend/src/lib/tenantContext.ts`, `backend/src/middlewares/WorkspaceMiddleware.ts`, `backend/src/lib/prisma.ts`
- Pattern: AsyncLocalStorage request scope.

**RLS-Aware Prisma Client:**
- Purpose: Ensure workspace-scoped Prisma operations set PostgreSQL session configuration automatically.
- Examples: `backend/src/lib/prisma.ts`
- Pattern: Prisma `$extends` query/client extension around `basePrisma`.

**Controller-Service-Repository:**
- Purpose: Split HTTP concerns, business rules, and persistence.
- Examples: `backend/src/controllers/TransactionController.ts`, `backend/src/services/TransactionService.ts`, `backend/src/repositories/TransactionRepository.ts`
- Pattern: Class-based controller/service/repository instances.

**Provider Interfaces:**
- Purpose: Hide storage, mail, and AI implementation details from business services.
- Examples: `backend/src/providers/IStorageProvider.ts`, `backend/src/providers/S3StorageProvider.ts`, `backend/src/providers/LocalStorageProvider.ts`, `backend/src/providers/AiProvider.ts`, `backend/src/providers/FakeAiProvider.ts`
- Pattern: Interface plus concrete provider/factory.

**Feature Slice:**
- Purpose: Keep UI route, API, hooks, components, and types close to the business feature.
- Examples: `frontend/src/features/transactions`, `frontend/src/features/workspaces`, `frontend/src/features/accountant`
- Pattern: Feature directory with `api`, `hooks`, `components`, `routes`/`pages`, and `types` as needed.

**Workspace URL Contract:**
- Purpose: Make frontend route path the source of truth for workspace-scoped API headers.
- Examples: `frontend/src/App.tsx`, `frontend/src/shared/lib/axios.ts`, `frontend/src/shared/components/guards/WorkspaceGuard.tsx`
- Pattern: URL segment `/:workspaceId/*` -> request header `x-workspace-id`.

**Outbox/Worker Contract:**
- Purpose: Decouple asynchronous events such as AI insight generation from transaction write paths.
- Examples: `backend/src/services/OutboxService.ts`, `backend/src/workers/OutboxWorker.ts`, `backend/src/workers/AiOutboxWorker.ts`
- Pattern: Database outbox table `OutboxEvent` plus worker claim/process lifecycle.

## Entry Points

**Backend Development Server:**
- Location: `backend/src/server.ts`
- Triggers: `pnpm dev` from `backend/package.json`
- Responsibilities: Start Express API, run DB privilege check, start cron, optionally start Telegram polling.

**Backend Routes:**
- Location: `backend/src/routes.ts`
- Triggers: Express `app.use(router)` in `backend/src/server.ts`
- Responsibilities: Register all HTTP route/middleware chains.

**Frontend Application:**
- Location: `frontend/src/main.tsx`
- Triggers: Vite entrypoint.
- Responsibilities: Mount React app and compose global providers.

**Frontend Route Graph:**
- Location: `frontend/src/App.tsx`
- Triggers: Browser navigation through React Router.
- Responsibilities: Lazy-load route screens and apply private/admin/workspace guards.

**Prisma Schema:**
- Location: `backend/prisma/schema.prisma`
- Triggers: `prisma generate`, migrations, backend runtime model access.
- Responsibilities: Define domain models, enums, relations, indexes, and datasource configuration.

**CI Workflow:**
- Location: `.github/workflows/ci.yml`
- Triggers: GitHub Actions.
- Responsibilities: Repository validation pipeline.

## Architectural Constraints

- **Threading:** Backend request handling uses the Node.js event loop. Background work is modeled through cron/workers in `backend/src/services/CronService.ts` and `backend/src/workers`, not through separate in-process thread pools.
- **Global state:** `backend/src/lib/prisma.ts` exports module-level Prisma clients; `frontend/src/shared/lib/axios.ts` stores an in-memory access token and refresh queue; `frontend/src/shared/lib/react-query.ts` exports a shared query client.
- **Tenant isolation:** Workspace-scoped backend routes must use `AuthMiddleware` and `WorkspaceMiddleware`; services and repositories should use `prisma` from `backend/src/lib/prisma.ts`.
- **RLS bypass:** Use `sysPrisma` only for explicit global/admin/infrastructure flows such as admin metrics, accountant cache refresh user lookup, and outbox operations. Do not use it in normal workspace business paths.
- **Money arithmetic:** Use Prisma `Decimal` and `decimal.js`/Prisma runtime `Decimal` for monetary calculations; do not introduce plain JavaScript number arithmetic for ledger balances.
- **Workspace source of truth:** Frontend normal workspace routes should derive workspace identity from URL and allow `frontend/src/shared/lib/axios.ts` to set `x-workspace-id`.
- **Generated/runtime artifacts:** Do not treat `backend/src/swagger-output.json`, `backend/dist`, `frontend/dist`, `coverage`, or `node_modules` as source placement targets.
- **Reversa constraint:** Reversa skills write only to `.reversa/` and `_reversa_sdd/`; GSD codebase mapping writes to `.planning/codebase/`.

## Anti-Patterns

### Raw Prisma Client Instances

**What happens:** Code creates `new PrismaClient()` outside the approved Prisma module.
**Why it's wrong:** It bypasses the RLS-aware Prisma extension and can break tenant isolation.
**Do this instead:** Import `prisma` or `sysPrisma` from `backend/src/lib/prisma.ts`; use `prisma` for workspace business paths and reserve `sysPrisma` for documented global infrastructure paths.

### Workspace APIs Without Workspace Context

**What happens:** A workspace-scoped route omits `WorkspaceMiddleware` or frontend code manually carries stale workspace headers.
**Why it's wrong:** It weakens membership checks and can mix tenant context across requests.
**Do this instead:** Put workspace routes under URL patterns handled by `frontend/src/shared/lib/axios.ts` and register backend route chains with `AuthMiddleware, WorkspaceMiddleware` in `backend/src/routes.ts`.

### Business Rules in React Components

**What happens:** UI components duplicate financial/tax/ledger decisions.
**Why it's wrong:** The backend is the authoritative domain layer and performs audit/outbox/transaction work.
**Do this instead:** Keep UI orchestration in `frontend/src/features/*` and put financial rules in backend services such as `backend/src/services/TransactionService.ts`, `backend/src/services/BankMovementService.ts`, and `backend/src/services/ExportService.ts`.

### Direct Live Transaction Creation From Imports

**What happens:** External financial ingestion writes directly to `Transaction`.
**Why it's wrong:** The architecture requires staging through `BankMovement` so accountant approval can merge/reject/approve.
**Do this instead:** Use `backend/src/services/FinancialIngestionEngine.ts`, `backend/src/services/BankMovementService.ts`, and `backend/src/controllers/BankMovementController.ts` for staging and approval.

## Error Handling

**Strategy:** Expected validation/domain errors are converted to specific HTTP responses near controllers or in the global error handler; unexpected errors fall through to `500`.

**Patterns:**
- Zod parsing in controllers, for example `backend/src/controllers/TransactionController.ts`.
- `AppError` status-aware handling in `backend/src/server.ts`.
- Prisma RLS/constraint errors mapped in the global `errorHandler` in `backend/src/server.ts`.
- Controller catch blocks translate known service messages to `400` or `404`, for example `backend/src/controllers/TransactionController.ts`.
- Axios response interceptor handles `401` refresh and global `403` forbidden state in `frontend/src/shared/lib/axios.ts`.

## Cross-Cutting Concerns

**Logging:** Backend uses `console.error`, `console.warn`, and audit-log services. Security-relevant ledger/RLS events use `backend/src/services/AuditLogService.ts`.

**Validation:** Backend uses Zod in controllers and schema modules; frontend uses React Hook Form/Zod patterns in feature forms such as `frontend/src/features/auth/hooks` and `frontend/src/features/auth/components`.

**Authentication:** JWT bearer access tokens are validated by `backend/src/middlewares/AuthMiddleware.ts`; refresh token restore is handled by `frontend/src/app/AuthProvider.tsx` and auth routes in `backend/src/routes.ts`.

**Authorization:** Workspace membership is enforced in `backend/src/middlewares/WorkspaceMiddleware.ts`; role hierarchy is enforced in `backend/src/middlewares/RbacMiddleware.ts`; admin-only routes use `backend/src/middlewares/AdminMiddleware.ts`.

**Tenant Isolation:** `frontend/src/shared/lib/axios.ts` sets `x-workspace-id`; `WorkspaceMiddleware` verifies membership and sets tenant context; `backend/src/lib/prisma.ts` sets PostgreSQL RLS context.

**Persistence:** `backend/prisma/schema.prisma` is the source of truth for models including `User`, `Workspace`, `WorkspaceMember`, `Account`, `Category`, `Transaction`, `BankMovement`, `AccountantDashboardCache`, `ExportArchive`, `OutboxEvent`, `AiInsight`, and Telegram models.

**External Integrations:** External API clients live under `backend/src/infra/external`; storage/mail/AI providers live under `backend/src/providers`; Telegram logic lives under `backend/src/services/Telegram*`.

---

*Architecture analysis: 2026-05-31*
