# Phase 02 Validation Architecture

**Phase:** Manual Transactions without accountId + Taxes Off
**Created:** 2026-05-31
**Mode:** Planning-only revision artifact
**Nyquist:** Required because `.planning/config.json` has `workflow.nyquist_validation: true`

This artifact defines required validation for the execution phase. The commands below are mandatory for the executor, but they are not run during this planning-only revision.

## Task-to-Validation Mapping

| Plan Task | Scope | Required Validation |
|---|---|---|
| Task 1: Add failing service tests for account resolution and taxes-off behavior | `backend/tests/services/TransactionService.test.ts` | RED proof first with `cd backend; pnpm test -- tests/services/TransactionService.test.ts`; after implementation, the same command must pass and assert default account resolution, explicit account rejection, resolved-account balance/audit side effects, tax-null persistence, marketplace preservation, and ID contracts. |
| Task 2: Add controller or route acceptance for missing accountId | `backend/tests/routes/Transaction.route.test.ts`, `backend/src/controllers/TransactionController.ts` | Route/controller test must prove `POST /transactions` payload without `accountId` reaches the create path instead of failing schema validation. If route harness cannot support a stable POST test, executor must stop and record the gap before replacing it with a weaker controller-unit proof. |
| Task 3: Implement workspace-scoped resolver and taxes-off persistence | `backend/src/services/TransactionService.ts`, `backend/src/repositories/AccountRepository.ts`, related tests | Full validation must pass: `cd backend; pnpm exec prisma validate`; `cd backend; pnpm exec tsc --noEmit`; `cd backend; pnpm test -- tests/services/TransactionService.test.ts`. Executor should also run the route/controller test from Task 2 if it exists. |

## Requirement-to-Test / Validation Mapping

| Requirement | Validation Target | Required Evidence |
|---|---|---|
| TX-01 | Missing `accountId` manual create accepted | Route/controller test in `backend/tests/routes/Transaction.route.test.ts` or explicit controller-unit equivalent if route harness blocks stable POST testing. |
| TX-02 | Backend resolves default workspace account when `accountId` is absent | Service tests in `backend/tests/services/TransactionService.test.ts` for exact seed-name lookup, `CHECKING` fallback, first-account fallback, and clear failure when no account exists. |
| TX-03 | Explicit `accountId` accepted only when it belongs to current workspace | Service negative test asserting `findByIdAndWorkspace(accountId, workspaceId)` remains the explicit-account path and foreign/missing account fails. |
| TX-04 | Paid no-account transactions update resolved account balance | Service test asserting balance update receives `resolvedAccount.id`, not undefined input. Audit state must also use `resolvedAccount.id`. |
| ID-01 | `Transaction.id` remains string UUID | Typecheck via `cd backend; pnpm exec tsc --noEmit` plus test assertions that transaction IDs are not cast to number in service/repository-facing contracts. |
| ID-02 | `Account.id` remains numeric | Typecheck plus service tests using numeric account IDs for explicit and resolved-account paths. |
| ID-03 | `Workspace.id` remains numeric | Typecheck plus service/controller tests using numeric workspace IDs from middleware/service context. |
| TAX-01 | New transactions save `taxAmount = null` when `Workspace.taxRate > 0` | Service test with positive tax rate asserting create payload persists `taxAmount: null`. |
| TAX-02 | New transactions save `netValue = null` when `Workspace.taxRate > 0` | Service test with positive tax rate asserting create payload persists `netValue: null`. |
| MKT-01 | Marketplace fields are preserved and allowed fields are not removed | Service marketplace test asserting gross amount, marketplace fee/platform fee, shipping, product cost, and related nullable marketplace fields remain mapped into persistence. |
| MKT-02 | Marketplace finalAmount remains gross minus platform fee and shipping without tax provisioning | Service marketplace test asserting final amount calculation excludes tax and tax/net fields remain null. |

## Mandatory Automated Commands

The execution phase must run these commands and record exact results:

```powershell
cd backend; pnpm exec prisma validate
cd backend; pnpm exec tsc --noEmit
cd backend; pnpm test -- tests/services/TransactionService.test.ts
```

Additional planned command from `02-01-PLAN.md`:

```powershell
cd backend; pnpm test -- tests/routes/Transaction.route.test.ts
```

Planning-only note: this revision only creates and updates planning artifacts. The commands above are required during execution, not run now.

## Latency and Sampling Checks

Latency checks: N/A. Phase 02 does not introduce async workers, queues, scheduled jobs, AI calls, OCR processing, network integrations, or user-facing polling paths. The relevant feedback loop is synchronous request -> service -> database transaction, validated by unit/route tests and typecheck.

Sampling continuity checks: N/A. Phase 02 does not change sampled analytics, AI evaluation, OCR confidence sampling, marketplace sampling, or telemetry sampling. Marketplace behavior is deterministic and must be asserted with fixed service test fixtures.

## Wave 0 Gap Handling

Before implementing production changes, the executor must perform Wave 0 validation setup:

1. Confirm the dirty worktree with `git status --short` and preserve Telegram/OCR baseline.
2. Read `02-01-PLAN.md`, `02-RESEARCH.md`, this `02-VALIDATION.md`, `AGENTS.md`, and the Reversa process docs referenced by the plan.
3. Add RED tests for Task 1 and Task 2 before editing production code.
4. If the route POST harness cannot be made stable without broad unrelated setup, stop and record a validation gap. Do not silently replace route proof with service-only tests.
5. If tests require touching no-go modules, stop and return a handoff rather than widening scope.

## Stop Criteria

Execution must stop and report the blocker if any of these occur:

- Implementing validation requires editing Telegram/OCR, BridgeService, OFX/OpenFinance import paths, broad frontend redesign files, or pro-labore recurrence modules.
- Default account resolution cannot be kept workspace-scoped.
- The solution requires auto-creating accounts.
- A Prisma schema migration becomes necessary.
- The executor cannot produce RED tests before production changes.
- The mandatory commands fail for reasons that appear related to Phase 02 changes and cannot be fixed within the allowed files.
- The mandatory commands fail due to unrelated dirty baseline; record exact output and do not reset, clean, stage, commit, push, or overwrite existing work.

## Completion Standard

Phase 02 execution is validation-complete only when the requirement mapping above has concrete test evidence, mandatory commands have recorded outputs, route/controller acceptance is either passing or explicitly stopped as a Wave 0 gap, and final diff remains inside the files authorized by `02-01-PLAN.md`.
