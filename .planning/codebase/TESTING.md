# Testing Patterns

**Analysis Date:** 2026-05-31

## Test Framework

**Runner:**
- Backend: Vitest `4.0.18`, configured in `backend/vitest.config.mjs`.
- Frontend unit/integration: Vitest `4.0.18` with React plugin and jsdom, configured in `frontend/vitest.config.mjs`.
- Frontend E2E: Playwright `1.58.2`, configured in `frontend/playwright.config.ts`.

**Assertion Library:**
- Backend: Vitest `expect`.
- Frontend unit/integration: Vitest `expect` plus `@testing-library/jest-dom` loaded from `frontend/tests/setup/vitest.setup.ts`.
- Frontend E2E: Playwright `expect`, sometimes re-exported through fixtures such as `frontend/tests/e2e/fixtures/exportDominio.ts`.

**Run Commands:**
```bash
cd backend && pnpm test              # Run backend Vitest suite
cd backend && pnpm test:watch        # Run backend Vitest watch mode
cd frontend && pnpm test             # Run frontend Vitest tests under tests/**/*.test.{ts,tsx}
cd frontend && pnpm test:watch       # Run frontend Vitest watch mode
cd frontend && pnpm test:e2e         # Run Playwright specs in frontend/tests/e2e
cd frontend && pnpm exec vitest run --coverage --config vitest.config.mjs --configLoader runner  # View frontend coverage
```

## Test File Organization

**Location:**
- Backend Vitest tests live primarily under `backend/tests/`, grouped by layer: `backend/tests/services/`, `backend/tests/controllers/`, `backend/tests/routes/`, `backend/tests/integration/`, `backend/tests/middlewares/`, `backend/tests/lib/`, `backend/tests/workers/`.
- Backend test helpers and a smaller legacy/alternate test tree live under `backend/src/test/`, including `backend/src/test/prisma-test-clients.ts`, `backend/src/test/setup-test-role.ts`, and `backend/src/test/routes/adminMetrics.test.ts`.
- Frontend Vitest tests live under `frontend/tests/`, grouped by app, feature, hook, and lib: `frontend/tests/app/`, `frontend/tests/features/`, `frontend/tests/hooks/`, `frontend/tests/lib/`.
- Frontend Playwright specs live under `frontend/tests/e2e/`.

**Naming:**
- Use `.test.ts` for backend unit/integration tests: `backend/tests/services/TelegramLinkService.test.ts`.
- Use `.test.tsx` for React component/provider tests: `frontend/tests/features/workspaces/routes/TelegramConfigPage.test.tsx`.
- Use `.integration.test.ts` / `.integration.test.tsx` when a test spans boundaries: `backend/tests/integration/RLS.integration.test.ts`, `frontend/tests/app/AuthRestore.integration.test.tsx`.
- Use `.spec.ts` only for Playwright E2E: `frontend/tests/e2e/export-dominio.spec.ts`.

**Structure:**
```text
backend/tests/
├── controllers/       # Express controller behavior
├── integration/       # DB/RLS/runtime role checks
├── middlewares/       # Auth, RBAC, workspace, error handling
├── routes/            # HTTP route behavior
├── services/          # Business rules and side effects
└── workers/           # Background worker behavior

frontend/tests/
├── app/               # Provider, routing, layout, page integration tests
├── e2e/               # Playwright browser/API smoke tests
├── features/          # Feature component and route tests
├── hooks/             # Hook behavior tests
└── setup/             # Vitest setup
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TransactionService - Guardiao de Periodo Fiscal (closedUntil)', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionService = new TransactionService();
  });

  describe('Cenarios de Bloqueio e Bypass', () => {
    it('deve retornar AppError 403 se a data for < closedUntil para CLIENTE', async () => {
      await expect(transactionService.create(dto)).rejects.toThrow(AppError);
    });
  });
});
```

**Patterns:**
- Use `describe` for the unit under test and nested `describe` blocks for behavior groups, as in `backend/tests/services/TransactionService.test.ts`.
- Use `beforeEach` for mock resets and fresh service/component setup.
- Use `beforeAll` / `afterAll` for database fixture setup and cleanup in integration tests, as in `backend/tests/integration/RLS.integration.test.ts`.
- Use Testing Library `render`, `screen`, and `waitFor` for React tests, as in `frontend/tests/app/AuthRestore.integration.test.tsx`.
- Prefer user-visible assertions (`getByRole`, `getByText`, `getByLabel`) in frontend tests and Playwright specs.

## Mocking

**Framework:** Vitest `vi.mock`, `vi.fn`, `vi.hoisted`, plus Playwright route interception.

**Patterns:**
```typescript
const mocks = vi.hoisted(() => ({
  mockAuditLogSync: vi.fn(),
  mockEnqueueInTransaction: vi.fn(),
}));

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    $transaction: vi.fn().mockImplementation(async (callback) => callback({})),
  },
}));
```

```typescript
vi.mock('../../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mocked(useWorkspaceStore).mockReturnValue({
  activeMembership: { role: 'OWNER' },
} as any);
```

```typescript
await context.route('**/auth/me', async (route) => {
  await route.fulfill({
    status: 200,
    json: { id: result.userId, memberships: [...] },
  });
});
```

**What to Mock:**
- Mock repositories, Prisma, outbox, audit logging, and external side effects in narrow backend service tests: `backend/tests/services/TransactionService.test.ts`.
- Mock layout shells, heavy child components, animation libraries, API clients, and Zustand stores in frontend route/component tests: `frontend/tests/app/AuthRestore.integration.test.tsx`, `frontend/tests/features/workspaces/routes/TelegramConfigPage.test.tsx`.
- Mock auth restore endpoints in Playwright fixtures when the E2E target is a feature flow rather than auth itself: `frontend/tests/e2e/fixtures/exportDominio.ts`.

**What NOT to Mock:**
- Do not mock RLS when the acceptance risk is tenant isolation. Use restricted real Prisma clients from `backend/src/test/prisma-test-clients.ts` and tests like `backend/tests/integration/RLS.integration.test.ts`.
- Do not mock browser download behavior in Playwright export smoke tests; `frontend/tests/e2e/export-dominio.spec.ts` waits for a real `download` event.
- Do not mock UI text/state that is the assertion target; render the route/component and assert visible DOM.

## Fixtures and Factories

**Test Data:**
```typescript
function buildAccountantMePayload() {
  return {
    id: 1,
    email: 'auditoria@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [...],
    dashboardCache: [...],
  };
}
```

```typescript
export const test = base.extend<ExportDominioFixture>({
  setupDominio: [async ({ context }, use) => {
    const out = execSync('pnpm exec ts-node src/scripts/setup-e2e-dominio.ts', { cwd: backendPath });
    const result = JSON.parse(out.match(/\{.*\}/s)![0]);
    await use({ workspaceId: result.workspaceId, token: result.token, ...result });
    execSync(`pnpm exec ts-node src/scripts/setup-e2e-dominio.ts cleanup ...`, { cwd: backendPath });
  }, { auto: false }],
});
```

**Location:**
- Inline builders are common for frontend integration payloads: `frontend/tests/app/AuthRestore.integration.test.tsx`.
- Playwright fixtures live under `frontend/tests/e2e/fixtures/`, especially `frontend/tests/e2e/fixtures/exportDominio.ts`.
- Backend DB/RLS fixtures use helper clients in `backend/src/test/prisma-test-clients.ts`.
- Backend E2E seed/setup scripts live in application script folders when shared with runtime smoke tests: `backend/src/scripts/setup-e2e-dominio.ts`.

## Coverage

**Requirements:** No enforced global threshold was detected.

**View Coverage:**
```bash
cd frontend && pnpm exec vitest run --coverage --config vitest.config.mjs --configLoader runner
cd backend && pnpm exec vitest run --coverage --config vitest.config.mjs --configLoader runner
```

- Frontend coverage is configured in `frontend/vitest.config.mjs` with V8, text and lcov reporters, output to `frontend/coverage`, and source inclusion under `frontend/src/**/*.{ts,tsx}`.
- Backend has `@vitest/coverage-v8` installed in `backend/package.json`, but no coverage block in `backend/vitest.config.mjs`.

## Test Types

**Unit Tests:**
- Backend service tests mock persistence and side effects to exercise business rules: `backend/tests/services/TransactionService.test.ts`, `backend/tests/services/TelegramLinkTokenService.test.ts`.
- Backend pure library tests cover format/sanitization/masking behavior: `backend/tests/lib/piiMasking.test.ts`, `backend/tests/lib/sanitizer.test.ts`, `backend/tests/lib/encoding.test.ts`.
- Frontend component/hook tests render focused UI or hook consumers and mock network/store dependencies: `frontend/tests/features/workspaces/routes/TelegramConfigPage.test.tsx`, `frontend/tests/hooks/useAttachment.test.tsx`.

**Integration Tests:**
- Backend integration tests use real Prisma clients and real DB behavior for RLS, runtime roles, and tenant isolation: `backend/tests/integration/RLS.integration.test.ts`, `backend/tests/integration/prisma-runtime-role.test.ts`, `backend/tests/integration/role-audit.test.ts`.
- Frontend provider/page integration tests combine `AuthProvider`, router, stores, and page components with mocked HTTP: `frontend/tests/app/AuthRestore.integration.test.tsx`.
- Route tests exercise Express HTTP behavior with auth/workspace contracts: `backend/tests/routes/Transaction.route.test.ts`, `backend/tests/routes/AiInsight.route.test.ts`.

**E2E Tests:**
- Playwright is used for browser and request-level smoke tests under `frontend/tests/e2e/`.
- `frontend/playwright.config.ts` starts Vite preview on `http://127.0.0.1:4173`, uses Desktop Chrome, enables HTML reports, and records traces on first retry.
- `frontend/tests/e2e/export-dominio.spec.ts` covers authorized export, unauthorized export blocking, cross-tenant blocking, blockers, warnings, and download behavior.

## Common Patterns

**Async Testing:**
```typescript
await waitFor(() => {
  expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/auth/refresh', {
    refreshToken: 'seed-refresh-token',
  });
});
```

```typescript
await withTestWorkspace(WORKSPACE_B_ID.toString(), async () => {
  const leakedTransactions = await applicationClient.transaction.findMany({
    where: { id: transactionIdA, workspaceId: WORKSPACE_A_ID },
  });

  expect(leakedTransactions).toHaveLength(0);
});
```

**Error Testing:**
```typescript
await expect(
  transactionService.create({ ...dto, date: closedDate })
).rejects.toThrow(AppError);
```

```typescript
const res = await request.post('http://127.0.0.1:3333/export/generate', {
  headers: { Authorization: `Bearer ${setupDominio.unauthUserToken}` },
  data: { layoutId: 'dominio-separated-v1' },
});

expect(res.status()).toBe(403);
```

## Project-Specific Testing Guidance

- For tenant isolation, RLS, roles, auth, financial data, storage, and AI/outbox behavior, prefer tests that exercise real boundaries over mock-only tests. `backend/tests/integration/RLS.integration.test.ts` is the reference for DB-enforced isolation.
- For backend service changes, start with the nearest `backend/tests/services/*.test.ts`; then run route or integration tests when auth/workspace/RLS behavior is affected.
- For frontend state/session changes, run `frontend/tests/app/AuthRestore.integration.test.tsx` or the nearest page/provider test before broader suites.
- For export/download/security behavior, run both backend export service/route tests and `frontend/tests/e2e/export-dominio.spec.ts` when the workflow crosses UI and API.
- Keep test data cleanup explicit for DB-backed tests. `backend/tests/integration/RLS.integration.test.ts` deletes transaction/account/workspace rows in `afterAll`.

---

*Testing analysis: 2026-05-31*
