# Coding Conventions

**Analysis Date:** 2026-05-31

## Naming Patterns

**Files:**
- Use PascalCase for backend class-based modules: `backend/src/services/TransactionService.ts`, `backend/src/controllers/TelegramIntegrationController.ts`, `backend/src/repositories/TransactionRepository.ts`.
- Use PascalCase for React route/component files: `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`, `frontend/src/features/accountant/routes/AccountantHubPage.tsx`.
- Use camelCase for hooks, API helpers, stores, and pure utility modules: `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`, `frontend/src/features/workspaces/api/telegramIntegration.ts`, `frontend/src/shared/stores/useWorkspaceStore.ts`, `backend/src/lib/piiMasking.ts`.
- Use `.test.ts` / `.test.tsx` for Vitest tests and `.spec.ts` for Playwright E2E: `backend/tests/services/TransactionService.test.ts`, `frontend/tests/app/AuthRestore.integration.test.tsx`, `frontend/tests/e2e/export-dominio.spec.ts`.
- Use domain suffixes in tests when they clarify risk or behavior: `backend/tests/services/BridgeService.balance-audit.test.ts`, `backend/tests/services/ExportArchiveService.download.test.ts`, `frontend/tests/app/AccountantHubPage.cacheRefresh.test.tsx`.

**Functions:**
- Use camelCase for methods and local functions: `create`, `delete`, `list`, `getById` in `backend/src/services/TransactionService.ts`; `loadStatus`, `createLink`, `revokeLink`, `clearMessages` in `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.
- Use `handle*` for UI event handlers: `handleGenerate`, `handleRevoke`, `handleCopy` in `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`.
- Use `use*` for React hooks: `useTelegramConfig` in `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.
- Use `with*` for scoped test/context helpers: `withTestWorkspace` in `backend/src/test/prisma-test-clients.ts`.

**Variables:**
- Use camelCase for runtime values and DTO fields: `workspaceId`, `userId`, `activeMembership`, `generatedLink`, `isLoading`.
- Use boolean names with `is`, `has`, `can`, or similarly explicit prefixes: `isPaid`, `isLoading`, `isAccountantBypass`, `hasMore`, `canEdit` in `backend/src/services/TransactionService.ts` and `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`.
- Use uppercase constants for fixed test IDs or process constants: `WORKSPACE_A_ID`, `CATEGORY_ID`, `ACCOUNT_ID` in `backend/tests/integration/RLS.integration.test.ts`.
- Use `mock*` names for Vitest mock functions: `mockAuditLogSync`, `mockEnqueueInTransaction` in `backend/tests/services/TransactionService.test.ts`.

**Types:**
- Use PascalCase for classes, interfaces, DTOs, and type aliases: `AppError` in `backend/src/errors/AppError.ts`, `CreateTransactionDTO` in `backend/src/services/TransactionService.ts`, `TelegramUserLink` and `GenerateLinkResponse` in `frontend/src/features/workspaces/api/telegramIntegration.ts`.
- Use Prisma/generated enum names directly when available: `TransactionType` in `backend/src/services/TransactionService.ts`.
- Use interface/type declarations near their owning module when the shape is local to that module: `CreateTransactionDTO` in `backend/src/services/TransactionService.ts`.

## Code Style

**Formatting:**
- No Prettier or Biome config was detected in repo roots; preserve existing TypeScript formatting in the touched file.
- Backend code uses semicolons and single quotes in representative files: `backend/src/services/TransactionService.ts`, `backend/src/errors/AppError.ts`.
- Frontend config uses semicolon-light style in `frontend/eslint.config.js`, while app source commonly uses semicolons in `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`; match the local file.
- Use strict TypeScript. Backend `backend/tsconfig.json` has `"strict": true`; frontend builds through `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, and `frontend/tsconfig.node.json`.

**Linting:**
- Frontend uses ESLint flat config in `frontend/eslint.config.js`.
- Frontend lint extends `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks` flat recommended, and `eslint-plugin-react-refresh` Vite rules.
- Backend has no ESLint config detected; rely on TypeScript strictness, tests, and local patterns.
- Do not introduce lint-disabled blocks unless a local file already establishes the exception and the reason is explicit.

## Import Organization

**Order:**
1. External packages first: `vitest`, `@prisma/client`, `react`, `lucide-react`, `zod`.
2. Internal relative imports next: services, repositories, hooks, stores, components.
3. Type-only imports use `import type` where the file already follows that style, as in `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.

**Path Aliases:**
- No active TypeScript alias was confirmed in the inspected source; use relative imports in backend and frontend feature code.
- Avoid adding new alias style unless `tsconfig` and build tooling are updated consistently.

## Error Handling

**Patterns:**
- Backend business and authorization errors should use `AppError` with semantic HTTP status codes from `backend/src/errors/AppError.ts`.
- Services throw `AppError` for known domain failures, especially `403` fiscal-lock/RLS-style denial and `404` not-found/access-denied cases: `backend/src/services/TransactionService.ts`.
- Controllers validate input with Zod and convert known `AppError` instances to JSON responses: `backend/src/controllers/TelegramIntegrationController.ts`.
- Unknown controller errors are rethrown for centralized Express error handling: `backend/src/controllers/TelegramIntegrationController.ts`.
- Frontend hooks catch API errors and expose user-facing `error`/`successMsg` state instead of throwing through render: `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.
- Preserve security-oriented error responses by avoiding leaked storage/object details; E2E checks assert no `objectKey`, `bucket`, or `presigned` text in `frontend/tests/e2e/export-dominio.spec.ts`.

## Logging

**Framework:** console

**Patterns:**
- Use `console.error` sparingly for non-blocking backend cleanup failures where the main transaction must not fail, as in remote attachment deletion in `backend/src/services/TransactionService.ts`.
- Test fixtures may use `console.log` for route interception diagnostics, as in `frontend/tests/e2e/fixtures/exportDominio.ts`; avoid adding noisy logs to production frontend components.
- Backend test global setup logs role validation once in `backend/src/test/setup-test-role.ts`.

## Comments

**When to Comment:**
- Comment complex domain/business invariants, security boundaries, RLS behavior, and non-obvious async choices.
- Keep comments close to the rule they explain, as in fiscal-lock comments in `backend/src/services/TransactionService.ts` and RLS client comments in `backend/src/test/prisma-test-clients.ts`.
- Do not add comments that merely restate a method or variable name.

**JSDoc/TSDoc:**
- Use short JSDoc blocks for controller/service behaviors that define API or security contracts, as in `backend/src/controllers/TelegramIntegrationController.ts`.
- JSDoc is not required for simple React components or self-contained helper functions.

## Function Design

**Size:** Keep controller methods thin and push business rules into services. `backend/src/controllers/TelegramIntegrationController.ts` validates request data and delegates to `TelegramLinkService`; `backend/src/services/TransactionService.ts` owns fiscal lock, money calculations, audit, and outbox orchestration.

**Parameters:** Use DTO objects for multi-field service operations, especially backend mutations: `CreateTransactionDTO` in `backend/src/services/TransactionService.ts`. Use primitive parameters only for simple identifiers or scoped actions such as `getById(id, workspaceId)`.

**Return Values:** Services return domain records or command results; hooks return state plus action callbacks as an object, as in `frontend/src/features/workspaces/hooks/useTelegramConfig.ts`.

## Module Design

**Exports:** Use named exports for services, controllers, hooks, classes, and providers: `export class TransactionService`, `export class AppError`, `export function useTelegramConfig`.

**Barrel Files:** Use barrel files only for stable config/module indexes already present, such as `backend/src/config/exportLayouts/index.ts`. Do not add broad barrel files for feature folders unless the surrounding feature already uses them.

## Project-Specific Constraints

- Import Prisma only from `backend/src/lib/prisma.ts`; do not instantiate `new PrismaClient()` in application modules. Test infrastructure may create dedicated clients in `backend/src/test/prisma-test-clients.ts` and `backend/src/test/setup-test-role.ts`.
- Treat tenant isolation as a first-class invariant. Preserve `workspaceId`, membership checks, `tenantContext`, and RLS behavior in backend services, repositories, middleware, and tests.
- Use `Decimal` / `decimal.js` style arithmetic for money. `backend/src/services/TransactionService.ts` converts transaction amounts into `Decimal` before calculations.
- Keep external financial ingestion buffered through domain services/repositories; do not bypass the pending movement or audit/outbox patterns.
- Preserve session restore keys and cache contracts in frontend auth flows: `wsp_refresh_token`, `wsp_user_info`, `wsp_dashboard_cache` are covered in `frontend/tests/app/AuthRestore.integration.test.tsx`.
- Use conventional commits when committing changes, per `AGENTS.md`.

---

*Convention analysis: 2026-05-31*
