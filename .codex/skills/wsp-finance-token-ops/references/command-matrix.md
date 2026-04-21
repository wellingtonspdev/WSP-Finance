# WSP Finance Command Matrix

## 1. Minimal Discovery

Use the narrowest command possible.

### Repo root

```powershell
git status --short
Get-ChildItem -Force | Select-Object Mode,Name
Get-Content -Raw README.md
Get-Content -Raw PRODUCT_SCOPE_MASTER.md
```

### Scoped file discovery on this Windows setup

If `rg` works:

```powershell
rg "AccountantCacheService" backend frontend
rg --files backend/src frontend/src
```

If `rg.exe` is blocked or denied:

```powershell
Get-ChildItem backend\src -Recurse -File | Select-String -Pattern "AccountantCacheService"
Get-ChildItem frontend\src -Recurse -File | Select-String -Pattern "dashboardCache"
```

Always scope the path. Do not recurse from repo root into `node_modules`.

## 2. Backend Validation

Run from `backend/`.

### General

```powershell
pnpm exec tsc --noEmit
pnpm test
```

### Narrow service or integration runs

```powershell
pnpm exec vitest run tests/services/AuthService.test.ts
pnpm exec vitest run tests/services/AccountantCacheService.test.ts
pnpm exec vitest run tests/integration/AccountantCacheAuth.integration.test.ts
pnpm exec vitest run tests/integration/RLS.integration.test.ts
pnpm exec vitest run tests/integration/role-audit.test.ts
pnpm exec vitest run tests/services/FuzzyDeduplicationService.test.ts tests/services/FinancialIngestionEngine.test.ts --pool=threads --maxWorkers=1
```

### Prisma and database

```powershell
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Use migration commands only when the task touches schema or migration state.

## 3. Frontend Validation

Run from `frontend/`.

### General

```powershell
pnpm test
pnpm build
```

### Narrow runs

```powershell
pnpm exec vitest run tests/app/AuthRestore.integration.test.tsx
pnpm exec vitest run tests/hooks/useAttachment.test.tsx
pnpm exec playwright test tests/e2e/cacheLogin.spec.ts --project=chromium
pnpm exec playwright test tests/e2e/approvalInbox.spec.ts --project=chromium
```

Use Playwright only for route/session flows, inbox flows, or regressions that unit tests cannot prove.

## 4. Cross-Layer Task Shortcuts

### Auth restore / accountant cache

Read first:

- `backend/src/services/AuthService.ts`
- `backend/src/services/AccountantCacheService.ts`
- `frontend/src/app/AuthProvider.tsx`
- `frontend/tests/app/AuthRestore.integration.test.tsx`

Validate with:

```powershell
cd backend
pnpm exec vitest run tests/services/AuthService.test.ts tests/services/AccountantCacheService.test.ts tests/integration/AccountantCacheAuth.integration.test.ts

cd ..\frontend
pnpm exec vitest run tests/app/AuthRestore.integration.test.tsx
pnpm exec playwright test tests/e2e/cacheLogin.spec.ts --project=chromium
```

### RLS / workspace isolation

Read first:

- `backend/src/lib/prisma.ts`
- `backend/src/routes.ts`
- workspace middleware and the service under change

Validate with:

```powershell
cd backend
pnpm exec tsc --noEmit
pnpm exec vitest run tests/integration/RLS.integration.test.ts tests/integration/role-audit.test.ts
```

### Transaction modal / bridge / uploads

Read first:

- `frontend/src/features/transactions/components/TransactionModal.tsx`
- `backend/src/services/TransactionService.ts`
- `backend/src/services/BridgeService.ts`

Validate with the smallest matching tests before broader suites.

## 5. CI Truth

When unsure what matters most, trust `.github/workflows/ci.yml`.

Current CI priorities are:

- backend typecheck
- backend tests with coverage
- frontend tests with coverage
- Playwright smoke on `cacheLogin.spec.ts`
- Sonar analysis after all of the above

If a local change affects auth restore, accountant cache, or dashboard summary, treat the smoke spec as part of the expected validation path.
