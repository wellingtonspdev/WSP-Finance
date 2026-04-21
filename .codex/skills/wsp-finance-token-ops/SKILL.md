---
name: wsp-finance-token-ops
description: "Operate on the WSP Finance monorepo with token discipline and targeted workflows when tasks involve auth, workspaces, accountant hub, transactions, Prisma, or project test suites."
category: development
risk: safe
source: local
date_added: "2026-04-20"
tags: [wsp-finance, token-economy, monorepo, express, react, prisma]
---

# wsp-finance-token-ops

## Purpose

Operate inside `WSP-Finance` without wasting context. This skill routes work by area, loads only the minimum anchor files, and keeps validation proportional to the change.

## Use This Skill When

- The task is inside `WSP-Finance`
- The user mentions `Accountant Hub`, `RLS`, `workspace`, `auth`, `dashboardCache`, `bank movements`, `bridge`, `transactions`, `uploads`, `Open Finance`, or `Prisma`
- The user wants repo-specific coding, debugging, review, testing, or architecture guidance

## Do Not Use This Skill When

- The request is generic and not tied to this repo
- The task is purely editorial and does not need project context
- The user only wants a broad product discussion with no code or repo impact

## Default Posture

- Reply in PT-BR unless the user asks otherwise
- Start from the smallest relevant slice of the monorepo
- Prefer diff-driven reading on dirty branches
- Never read `node_modules`, `dist`, `coverage`, generated reports, or large logs unless the task explicitly needs them
- Prefer `rg` for targeted search, but if `rg.exe` fails on this Windows setup, switch to scoped `Get-ChildItem` and `Select-String`
- Summarize what is already known before opening more files

## Prerequisites

- The current workspace is the `WSP-Finance` repo root or one of its subfolders
- The task actually depends on this repo's code, tests, or architecture
- `backend/` and `frontend/` are the primary code roots unless the task is clearly about SQL scripts or docs

## Step 1: Establish The Smallest Slice

1. Run `git status --short` and identify touched areas before reading code.
2. If high-level context is missing, read only one or two of these anchors:
   - `README.md`
   - `PRODUCT_SCOPE_MASTER.md`
   - `BACKEND_GUIDELINES.md`
   - `FRONTEND_GUIDELINES.md`
3. Decide whether the task is:
   - backend
   - frontend
   - cross-layer auth/session
   - database/RLS
   - tests/CI
4. Open only the anchor files for that lane first.
5. Load `references/project-map.md` only if the task spans multiple bounded contexts.

## Step 2: Route By Area

### Auth / Session Restore

Open these first:

- `backend/src/services/AuthService.ts`
- `frontend/src/app/AuthProvider.tsx`
- `frontend/src/features/auth/types/index.ts`

Then load tests only if needed:

- `frontend/tests/app/AuthRestore.integration.test.tsx`
- `frontend/tests/e2e/cacheLogin.spec.ts`
- `backend/tests/services/AuthService.test.ts`

### Accountant Hub / Inbox / Dashboard Cache

Open these first:

- `frontend/src/features/accountant/routes/AccountantHubPage.tsx`
- `frontend/src/shared/components/layout/AppLayout.tsx`
- `backend/src/services/AccountantCacheService.ts`
- `backend/src/repositories/AccountantCacheRepository.ts`

Then validate with:

- `backend/tests/services/AccountantCacheService.test.ts`
- `backend/tests/integration/AccountantCacheAuth.integration.test.ts`
- `frontend/tests/e2e/cacheLogin.spec.ts`

### Workspace / Membership / Tenant Isolation

Open these first:

- `backend/src/lib/prisma.ts`
- `backend/src/routes.ts`
- `frontend/src/shared/stores/useWorkspaceStore.ts`

Then expand only if needed to middleware or controllers for the failing path.

High-value tests:

- `backend/tests/integration/RLS.integration.test.ts`
- `backend/tests/integration/role-audit.test.ts`
- `backend/tests/integration/prisma-runtime-role.test.ts`

### Transactions / Attachments / Bridge

Open these first:

- `frontend/src/features/transactions/components/TransactionModal.tsx`
- `frontend/src/features/transactions/hooks/`
- `backend/src/controllers/TransactionController.ts`
- `backend/src/services/TransactionService.ts`
- `backend/src/services/BridgeService.ts`

Then validate with the smallest relevant test file:

- `backend/tests/services/TransactionService.test.ts`
- `backend/tests/services/BridgeService.balance-audit.test.ts`
- `frontend/tests/hooks/useAttachment.test.tsx`

### Imports / Open Finance / Reconciliation

Open these first:

- `backend/src/controllers/OpenFinanceWebhookController.ts`
- `backend/src/services/FinancialIngestionEngine.ts`
- `backend/src/services/FuzzyDeduplicationService.ts`
- `scripts/benchmark_pg_trgm.sql`
- `documentacao/benchmark_pg_trgm_staging.md`

High-value tests:

- `backend/tests/services/FinancialIngestionEngine.test.ts`
- `backend/tests/services/FuzzyDeduplicationService.test.ts`

### Workspaces / Invites / Team Flows

Open these first:

- `backend/src/controllers/WorkspaceController.ts`
- `backend/src/controllers/InviteController.ts`
- `frontend/src/features/workspaces/routes/`

### Dashboard / Summary / Navigation

Open these first:

- `frontend/src/App.tsx`
- `frontend/src/features/dashboard/routes/DashboardPage.tsx`
- `backend/src/controllers/DashboardController.ts`
- `backend/src/services/DashboardService.ts`

## Step 3: Respect Project Invariants

- Money is `Decimal(19,4)` in Prisma and `decimal.js` in business logic. Do not introduce arithmetic with plain `number`.
- Prisma must come from `backend/src/lib/prisma.ts`. Do not instantiate `new PrismaClient()` elsewhere.
- External financial ingestion lands in `BankMovement` as `PENDING` before becoming `Transaction`.
- Multi-tenant isolation is mandatory. Treat `workspaceId`, membership, and RLS behavior as first-class constraints.
- The accountant path is performance-sensitive. Prefer the `accountant_dashboard_cache` flow over live fan-out queries.
- Do not break session restore contracts involving:
  - `wsp_refresh_token`
  - `wsp_user_info`
  - `wsp_dashboard_cache`
- Keep billing out of scope. Do not invent subscription models or billing tables.

## Step 4: Keep Token Usage Low

- Prefer file lists over full file dumps.
- Read one route file before opening multiple controllers.
- Read one service before opening repositories and tests.
- On frontend work, start from the route component and only then open hooks and shared layout pieces.
- On backend work, start from `routes.ts` or the service under change before reading broad infrastructure.
- If the task is driven by recent changes, inspect the dirty files first and postpone untouched modules.
- If you already know the answer from anchors, stop exploring and implement.

## Step 5: Validate Proportionally

- For a single backend service change: run only the relevant Vitest file first, then `pnpm exec tsc --noEmit`.
- For frontend route or provider work: run the narrow test or smoke spec before broad suites.
- For auth/accountant cache changes: prefer the restore-path tests before full frontend runs.
- For Prisma or tenant changes: run the RLS and role audit tests before unrelated suites.
- Use `references/command-matrix.md` when you need exact project commands.

## If The First Slice Was Wrong

- Stop broadening randomly.
- Re-anchor from the nearest contract boundary:
  - route file for request/response bugs
  - service file for business rules
  - store/provider for frontend state bugs
  - test file for regression-only failures
- If backend and frontend disagree, compare the shared contract before opening more UI files.
- If the issue is still unclear, load one reference file and re-scope.

## Examples

- "Fix accountant cache restore after refresh token" -> start with `AuthService.ts`, `AuthProvider.tsx`, and the restore tests.
- "Investigate RLS failure after Prisma change" -> start with `backend/src/lib/prisma.ts`, the relevant service, and the RLS integration tests.
- "Adjust transaction modal flow for bridge transfers" -> start with `TransactionModal.tsx`, `TransactionService.ts`, and the smallest matching test files.

## Output Expectations

- Keep progress updates short and state which slice you are exploring
- In the final answer, summarize:
  - what changed
  - what was validated
  - any remaining risk or untested edge

## Reference Files

- Load `references/project-map.md` for the architecture and operation map.
- Load `references/command-matrix.md` for targeted commands and validation shortcuts.
- Do not load both references unless the task spans multiple layers or you are blocked.
