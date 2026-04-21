# WSP Finance Project Map

## 1. Product Frame

`WSP-Finance` is a financial SaaS for hybrid personal/business management with a strong accountant-facing workflow. The current strategic center is the `Accountant Hub`, where the accountant reviews many client workspaces, approves pending movements, and avoids heavy real-time dashboard fan-out through cache materialization.

Core docs already in the repo:

- `README.md`: stack and local setup
- `PRODUCT_SCOPE_MASTER.md`: product pivot and functional scope
- `BACKEND_GUIDELINES.md`: defensive engineering invariants
- `FRONTEND_GUIDELINES.md`: UI rules and route expectations

## 2. Monorepo Layout

- `backend/`: API, Prisma schema, migrations, Vitest, integration tests
- `frontend/`: React app, route pages, hooks, Zustand, Vitest, Playwright
- `scripts/`: SQL utilities for benchmarking and account reconciliation
- `documentacao/`: ADRs and pg_trgm staging benchmark notes
- `.github/workflows/ci.yml`: the authoritative CI validation order

## 3. Backend Operation Map

### Auth and identity

- Routes: `backend/src/routes.ts`
- Controllers: `AuthController.ts`, `PasswordResetController.ts`, `VerificationController.ts`
- Services: `AuthService.ts`, `PasswordResetService.ts`, `VerificationService.ts`
- Key contract: login and `GET /auth/me` may return `dashboardCache` for accountant users

### Workspace and invites

- Controllers: `WorkspaceController.ts`, `InviteController.ts`, `UserController.ts`
- Prisma entities: `Workspace`, `WorkspaceMember`, `WorkspaceInvite`
- Cross-cutting concern: membership and role changes must respect tenant isolation

### Financial core

- Controllers: `AccountController.ts`, `CategoryController.ts`, `TransactionController.ts`, `DashboardController.ts`
- Services: `AccountService.ts`, `CategoryService.ts`, `TransactionService.ts`, `DashboardService.ts`
- Prisma entities: `Account`, `Category`, `Transaction`

### Bridge / legalized transfers

- Controller: `BridgeController.ts`
- Service: `BridgeService.ts`
- Domain rule: cross-workspace transfer with accounting traceability

### Ingestion, staging, and accountant approval

- Controllers: `ImportController.ts`, `OpenFinanceWebhookController.ts`, `BankMovementController.ts`
- Services: `ImportService.ts`, `FinancialIngestionEngine.ts`, `FuzzyDeduplicationService.ts`, `BankMovementService.ts`
- Prisma entity: `BankMovement`
- Critical flow: imported data enters staging as `PENDING`, then accountant actions approve/reject/merge

### Accountant cache

- Service: `AccountantCacheService.ts`
- Repository: `AccountantCacheRepository.ts`
- Prisma entity: `AccountantDashboardCache`
- Reason it exists: avoid `Promise.all` dashboard storms across many client workspaces

### Uploads and attachments

- Controller: `UploadController.ts`
- Service: `UploadService.ts`
- Frontend dependencies: attachment preview and upload flow in transaction UI

### Cross-cutting backend infrastructure

- `backend/src/lib/prisma.ts`: Prisma singleton plus RLS-aware `$extends`
- `backend/src/server.ts`: startup checks, CORS, Swagger, global error handling, cron bootstrap
- `backend/prisma/schema.prisma`: source of truth for models and enums

## 4. Frontend Operation Map

### Route shell and session wiring

- `frontend/src/App.tsx`: lazy routes and protected navigation
- `frontend/src/app/AuthProvider.tsx`: refresh flow, `/auth/me`, persisted cache, logout
- `frontend/src/shared/stores/useWorkspaceStore.ts`: persisted active workspace and memberships

### Accountant experience

- Routes:
  - `features/accountant/routes/AccountantHubPage.tsx`
  - `features/accountant/routes/ApprovalInboxPage.tsx`
  - `features/accountant/routes/InviteInboxPage.tsx`
- Shared layout hotspot:
  - `shared/components/layout/AppLayout.tsx`
- Persona rule:
  - accountant mode swaps navigation, colors, and summary behavior

### Transactions

- Main UI:
  - `features/transactions/components/TransactionModal.tsx`
  - `features/transactions/pages/TransactionHistoryPage.tsx`
- Supporting hooks:
  - `useTransactionMutation`
  - `useAccounts`
  - `useCategories`
  - `useAttachment`
- Notable cases:
  - simple income
  - marketplace income
  - expense
  - bridge transfer
  - upload flow

### Workspaces and team management

- `features/workspaces/routes/InviteLandingPage.tsx`
- `features/workspaces/routes/TeamSettingsPage.tsx`
- Guard/store interplay matters for root navigation and role-sensitive pages

## 5. Validation Surface

### Backend tests

- Service tests: `backend/tests/services/`
- Integration tests: `backend/tests/integration/`
- Middleware tests: `backend/tests/middlewares/`
- Vitest config: `backend/vitest.config.ts`
- CI always runs:
  - `pnpm exec tsc --noEmit`
  - migrations + seed
  - backend coverage

### Frontend tests

- App integration: `frontend/tests/app/AuthRestore.integration.test.tsx`
- Hooks tests: `frontend/tests/hooks/`
- E2E: `frontend/tests/e2e/`
- Playwright config: `frontend/playwright.config.ts`
- CI smoke focus:
  - `frontend/tests/e2e/cacheLogin.spec.ts`

## 6. Current Hotspots Observed On 2026-04-20

Dirty and newly added files point to a current concentration around:

- accountant dashboard cache and foreign keys
- auth restore and cache-backed login
- workspace/accountant role audit
- frontend accountant hub and app layout
- transaction modal
- CI and Playwright smoke coverage for restore flow

This means repo-specific tasks about accountant UX, session restore, RLS, or cache behavior should usually start from those files before broader exploration.

## 7. Non-Negotiable Invariants

- Money uses Prisma `Decimal` plus `decimal.js`
- Never add raw `PrismaClient` instances outside `backend/src/lib/prisma.ts`
- Respect `workspaceId` and RLS assumptions in every data path
- Do not convert imported bank data directly into live balances without staging
- Preserve accountant cache semantics for login and hub rendering
- Avoid generic repo-wide scans when the affected slice is already known
