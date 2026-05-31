# Phase 4 Validation Architecture

## Purpose

Nyquist validation is enabled for this workspace. This artifact maps Phase 4 requirements, planned tests, wave gates, and suite boundaries so execution can prove continuity from RED tests through final validation.

## Wave Gates

| Wave | Plan | Gate | Required Result |
|---|---|---|---|
| 1 | 04-01 | Dependency pre-flight | Phase 3 `BridgeService.executeTransfer` simplified contract and Phase 6 frontend simplification contracts are proven in the current checkout, or execution stops with `## CHECKPOINT REACHED`. |
| 1 | 04-01 | Reversa pre-implementation | Issue Understanding, Technical Analysis, Matching Report, TDD Plan, and Development Agent Prompt exist before product implementation starts. |
| 1 | 04-01 | RED tests | Focused backend/frontend tests exist and fail for missing Phase 4 implementation behavior. |
| 2 | 04-02 | Backend GREEN | Prisma validate, backend typecheck, focused backend tests, and full backend suite run after schema/service/API/cron changes. |
| 3 | 04-03 | Frontend GREEN + final validation | Focused frontend test, frontend build, full frontend suite, full backend boundary, and repository diff checks run before handoff. |

## Requirement Sampling Matrix

| Requirement | Behavior Sample | Test File | Focused Command | Boundary Suite |
|---|---|---|---|---|
| P4-01 | OWNER creates BUSINESS to PERSONAL monthly schedule with amount/day/description and no account/tax fields. | `backend/tests/services/RecurringProLaboreService.test.ts`, `frontend/tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts` and `cd frontend; pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd backend; pnpm test`, `cd frontend; pnpm test` |
| P4-02 | Non-OWNER, same-workspace, one-sided ownership, and invalid direction are blocked for create/deactivate/cancel/confirm. | `backend/tests/services/RecurringProLaboreService.test.ts`, `backend/tests/routes/RecurringProLabore.route.test.ts` | `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/routes/RecurringProLabore.route.test.ts` | `cd backend; pnpm test` |
| P4-03 | Cron generates pending only, processes due schedules up to today, handles month-end fallback, and never calls BridgeService. | `backend/tests/services/CronService.recurring-pro-labore.test.ts` | `cd backend; pnpm test -- tests/services/CronService.recurring-pro-labore.test.ts` | `cd backend; pnpm test` |
| P4-04 | Manual confirmation uses a durable pending bridge id/idempotency key, calls the BridgeService boundary exactly once per key, blocks duplicate concurrent confirms, and crash/retry after bridge success cannot duplicate transfer legs. | `backend/tests/services/RecurringProLaboreService.test.ts` | `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts` | `cd backend; pnpm test` |
| P4-05 | Insufficient balance leaves pending open, records safe last-attempt metadata, and does not mutate balances. | `backend/tests/services/RecurringProLaboreService.test.ts`, `frontend/tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts` and `cd frontend; pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd backend; pnpm test`, `cd frontend; pnpm test` |
| P4-06 | Dedicated frontend page creates/list schedules, lists/confirms pending records, shows inactive/error states, and has no account selector/tax UI. | `frontend/tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd frontend; pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx` | `cd frontend; pnpm test`, `cd frontend; pnpm run build` |

## Required Commands

### Plan 04-01

- `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/services/CronService.recurring-pro-labore.test.ts tests/routes/RecurringProLabore.route.test.ts`
- `cd frontend; pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx`

Expected during RED: commands fail because implementation is absent, while syntax/import/environment problems are fixed before proceeding.

Required RED cases for HIGH-01:

- `confirmPending` concurrent attempts: run two confirmations for the same pending record concurrently, prove only one bridge id/key is persisted, only one debit leg and one credit leg exist, only one balance decrement/increment occurs, and the losing request returns an idempotent completed result or a safe conflict without calling bridge a second time.
- `confirmPending` crash/retry after bridge success: simulate `BridgeService` succeeding and the pending completion update failing or the process dying before completion, retry the same pending, prove the stored bridge id is reused, existing deterministic FITIDs are returned or observed, no second debit/credit pair is created, and the pending becomes `COMPLETED`.

### Plan 04-02

- `cd backend; pnpm exec prisma validate`
- `cd backend; pnpm exec tsc --noEmit`
- `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/services/CronService.recurring-pro-labore.test.ts tests/routes/RecurringProLabore.route.test.ts`
- `cd backend; pnpm test`

### Plan 04-03

- `git branch --show-current`
- `git status --short -uall`
- `git diff --stat`
- `git diff --check`
- `cd backend; pnpm exec prisma validate`
- `cd backend; pnpm exec tsc --noEmit`
- `cd backend; pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/services/CronService.recurring-pro-labore.test.ts tests/routes/RecurringProLabore.route.test.ts`
- `cd backend; pnpm test`
- `cd frontend; pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx`
- `cd frontend; pnpm test`
- `cd frontend; pnpm run build`

## Dependency Validation

Do not rely on missing verification documents for Phase 3 or Phase 6. Plan 04-01 must inspect the current checkout and record direct evidence:

- Phase 3 bridge contract: `backend/src/services/BridgeService.ts` exposes the simplified `executeTransfer` boundary required by Phase 4 and remains responsible for default account resolution, RBAC/fiscal-period checks, balance mutation, transaction creation, and audit.
- Phase 6 frontend simplification contract: the current frontend bridge/manual pro-labore path does not require account selectors or public `accountId` payloads for the simplified flow Phase 4 will align with.

If either proof fails, stop with `## CHECKPOINT REACHED` and list missing contracts.

## Final Acceptance

Phase 4 validation passes only when:

1. Dependency pre-flight either proves contracts or blocks execution.
2. Reversa deliverables exist before implementation starts.
3. Focused tests demonstrate RED before production code and GREEN after implementation.
   - RED/GREEN coverage must include concurrent confirm attempts and crash/retry after bridge success for HIGH-01.
4. Backend full suite runs at the backend boundary after schema/service/API/cron changes.
5. Frontend full suite and build run at the final frontend boundary.
6. `git diff --check` passes.
