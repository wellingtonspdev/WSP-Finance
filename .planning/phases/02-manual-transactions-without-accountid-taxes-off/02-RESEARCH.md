# Phase 02: Manual Transactions without accountId + Taxes Off - Research

**Researched:** 2026-05-31
**Domain:** manual transaction creation, tenant-safe account resolution, tax/marketplace calculation
**Confidence:** HIGH for local code contracts, MEDIUM for planner guidance that depends on implementation choice.

## Project Constraints

- Use Conventional Commits if a commit is later authorized. [VERIFIED: `AGENTS.md`:1]
- This repository requires Reversa issue workflow before implementation: Issue Understanding, Technical Analysis, Matching Report when mandatory, TDD Plan, and Development Agent Prompt. [VERIFIED: `AGENTS.md`:17]
- No issue should be implemented directly before analysis/planning artifacts are produced. [VERIFIED: `_reversa_sdd/process/issue-development-workflow.md`:5]
- Matching is mandatory because Phase 02 touches database/Prisma, tenant isolation, permissions, financial data, and backend/frontend contract risk. [VERIFIED: `_reversa_sdd/process/matching-agent-workflow.md`:11]
- Preserve user work and do not revert unrelated dirty worktree state. [VERIFIED: `_reversa_sdd/process/issue-development-workflow.md`:25]
- Phase 02 research/planning must preserve Telegram/OCR baseline and not stage, commit, push, reset, clean, or overwrite existing work. [VERIFIED: `.planning/STATE.md`:26]

## User Constraints

Copied from `02-CONTEXT.md` and current instruction:

- Planning/research only. Do not implement code. Do not stage, commit, push, reset, clean, or overwrite existing work. [VERIFIED: user instruction]
- Write only `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-RESEARCH.md`. [VERIFIED: user instruction]
- No external dependency installs; prefer local repo/Reversa evidence. [VERIFIED: user instruction]
- Phase 2 covers manual `POST /transactions` creation only. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:7]
- Do not alter `BridgeService`, OFX/OpenFinance import paths, Telegram/OCR files or baseline behavior, broad frontend, or pro-labore recurrence. [VERIFIED: `.planning/ROADMAP.md`:36]
- `TransactionController.create` and `TransactionService.create` should accept payloads without `accountId`; when absent, backend resolves an account from current `workspaceId`; when present, validation must remain workspace-scoped. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:36]
- New manual transactions must persist `taxAmount = null` and `netValue = null`; `Workspace.taxRate` must not trigger Phase 02 tax calculation. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:51]
- Marketplace fields must remain allowed and persisted; `finalAmount` may continue using gross/platform fee/shipping without tax provisioning. [VERIFIED: `.planning/REQUIREMENTS.md`:25]
- Preserve ID contracts: `Transaction.id` string UUID, `Account.id` number, `Workspace.id` number. [VERIFIED: `.planning/REQUIREMENTS.md`:18]

## Architecture Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Accept no-`accountId` manual transaction payload | API / Backend | Browser / Client | The route contract currently rejects missing `accountId`; backend owns compatibility and validation. [VERIFIED: `backend/src/controllers/TransactionController.ts`:13] |
| Resolve default workspace account | API / Backend | Database / Storage | The selected account must be tenant-scoped by `workspaceId`; client choice is not authoritative. [VERIFIED: `backend/src/repositories/AccountRepository.ts`:17] |
| Preserve explicit account validation | API / Backend | Database / Storage | Existing `findByIdAndWorkspace(accountId, workspaceId)` is the tenant-safe validation path and must remain for explicit IDs. [VERIFIED: `backend/src/services/TransactionService.ts`:69] |
| Persist transaction and balance/audit side effects | API / Backend | Database / Storage | `TransactionService.create` wraps create, balance update, audit, and outbox in a Prisma transaction. [VERIFIED: `backend/src/services/TransactionService.ts`:135] |
| Disable tax provisioning | API / Backend | Database / Storage | Current service computes `taxAmount` and `netValue`; Phase 02 must change persistence behavior for new manual transactions. [VERIFIED: `backend/src/services/TransactionService.ts`:116] |
| Preserve marketplace fields and final amount | API / Backend | Browser / Client | Backend calculates amount from gross/fee/shipping and persists marketplace fields; frontend already exposes optional fields. [VERIFIED: `backend/src/services/TransactionService.ts`:106], [VERIFIED: `frontend/src/features/transactions/types/index.ts`:69] |
| Tenant isolation and permissions | API / Backend | Database / Storage | `/transactions` routes use `AuthMiddleware + WorkspaceMiddleware`; service/repository must not bypass workspace filters. [VERIFIED: `backend/src/routes.ts`:418] |

## Current Contract Diagnosis UUID/Number

- `Workspace.id` is `Int @id @default(autoincrement())`; `Workspace.taxRate` is Decimal. [VERIFIED: `backend/prisma/schema.prisma`:174]
- `Account.id` is `Int @id @default(autoincrement())`; `Account.workspaceId` is `Int`; `Account.type` defaults to `CHECKING`. [VERIFIED: `backend/prisma/schema.prisma`:251]
- `Transaction.id` is `String @id @default(uuid())`; `Transaction.accountId`, `categoryId`, and `workspaceId` are `Int`. [VERIFIED: `backend/prisma/schema.prisma`:271]
- `AiInsight.transaction` uses a composite relation to `Transaction` by `[workspaceId, transactionId] -> [workspaceId, id]`, so `Transaction.id` must stay string and workspace-scoped. [VERIFIED: `backend/prisma/schema.prisma`:566]
- Backend route params for `getById` and `delete` pass `id` as string to `TransactionService`. [VERIFIED: `backend/src/controllers/TransactionController.ts`:76]
- `TransactionRepository.findByIdAndWorkspace` and `findDetailByIdAndWorkspace` accept `id: string, workspaceId: number`. [VERIFIED: `backend/src/repositories/TransactionRepository.ts`:66]
- Frontend transaction response type already declares `Transaction.id: string`, `accountId: number`, `categoryId: number`, and `workspaceId: number`. [VERIFIED: `frontend/src/features/transactions/types/index.ts`:81]
- Local Reversa confirms the prior gap: `Transaction.id` must be string UUID in all layers and frontend `number` usage was the historical divergence. [VERIFIED: `_reversa_sdd/questions.md`:111]

## Default Account Resolution Findings

- Current `TransactionController.create` requires `accountId: z.number().int().positive()`, so payloads without `accountId` fail before service execution. [VERIFIED: `backend/src/controllers/TransactionController.ts`:14]
- Current `CreateTransactionDTO` requires `accountId: number`, so service typing also blocks no-account calls. [VERIFIED: `backend/src/services/TransactionService.ts`:17]
- Current service validates explicit account ownership via `accountRepository.findByIdAndWorkspace(accountId, workspaceId)` and throws `Account not found or access denied` if not found. [VERIFIED: `backend/src/services/TransactionService.ts`:69]
- `AccountRepository` has `findManyByWorkspace(workspaceId)` ordered by account name and `findByIdAndWorkspace(id, workspaceId)`; it does not currently expose a default-account resolver. [VERIFIED: `backend/src/repositories/AccountRepository.ts`:10]
- Seeds indicate canonical default-name candidates exist: `Conta PF Principal` for PERSONAL and `Conta PJ Principal` for BUSINESS. [VERIFIED: `backend/prisma/seed/modules/02_Structure.ts`:53], [VERIFIED: `backend/prisma/seed/modules/02_Structure.ts`:130]
- The phase context records a naming mismatch: product wording mentions `Conta Pessoal` / `Conta Empresa`, but local seed names are `Conta PF Principal` / `Conta PJ Principal`. Planner should use local seed names for deterministic tests unless product explicitly changes them. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:103]
- Recommended backend rule for planner: resolve account inside `TransactionService.create` after workspace fetch, using workspace type and account lookup. Prefer deterministic query order: exact seed name for workspace type, then first `CHECKING` account in that workspace, then first account in that workspace. If none exists, fail with a clear 400/404-style application error rather than auto-creating accounts. [ASSUMED: implementation guidance based on local context]
- Do not reuse Telegram default-account models for this phase. Telegram/OCR tables now include destination/default account fields, but user scope explicitly forbids touching Telegram/OCR baseline. [VERIFIED: `backend/prisma/schema.prisma`:613]

## Tax/Marketplace Calculation Findings

- Current service reads `workspace.taxRate` and uses it to calculate taxes. [VERIFIED: `backend/src/services/TransactionService.ts`:89]
- Current marketplace path computes `computedTaxAmount = calculatedGross * taxRate / 100`, `computedNetValue = gross - fee - tax`, and `finalAmount = gross - fee - shipping`. [VERIFIED: `backend/src/services/TransactionService.ts`:116]
- Current simple income path computes `taxAmount` and `netValue` from `finalAmount` when no `grossAmount` exists. [VERIFIED: `backend/src/services/TransactionService.ts`:127]
- Current persistence writes `taxAmount: computedTaxAmount`, `netValue: computedNetValue`, and keeps marketplace fields (`grossAmount`, `marketplaceFee`, `shippingCost`, `productCost`, `platformFeeRate`, `feeAmount`). [VERIFIED: `backend/src/services/TransactionService.ts`:135]
- Schema allows `taxAmount` and `netValue` to be null, so Phase 02 does not require a Prisma schema change for taxes-off behavior. [VERIFIED: `backend/prisma/schema.prisma`:285]
- Schema keeps marketplace analytics fields nullable, so marketplace field preservation can be implemented as service logic only. [VERIFIED: `backend/prisma/schema.prisma`:280]
- Planner should preserve `finalAmount = gross - fee - shipping` for marketplace input, but set `taxAmount` and `netValue` to null for all new manual transactions in Phase 02. [VERIFIED: `.planning/REQUIREMENTS.md`:25]
- Planner should be careful that frontend UI may use `netValue ?? amount` and only renders tax line when `Number(transaction.taxAmount) > 0`; null taxes should not break display but should be validated. [VERIFIED: `frontend/src/features/transactions/components/TransactionAccordionItem.tsx`:64]

## Test Surface and Validation Architecture

### Existing Tests

- `backend/tests/services/TransactionService.test.ts` exists and mocks Prisma, repositories, `AuditLogService`, `OutboxService`, and `tenantContext`. It currently covers fiscal lock, accountant bypass, delete guard, audit on paid create, and outbox payload hygiene. [VERIFIED: `backend/tests/services/TransactionService.test.ts`:1]
- Existing service tests always pass `accountId: 1`; they do not cover absent account resolution, invalid explicit account, taxes-off, or marketplace preservation. [VERIFIED: `backend/tests/services/TransactionService.test.ts`:123]
- `backend/tests/routes/Transaction.route.test.ts` is DB-backed route integration for GET paths and proves auth/workspace isolation for reads. It does not cover `POST /transactions`. [VERIFIED: `backend/tests/routes/Transaction.route.test.ts`:65]
- Route stack for `POST /transactions` is `AuthMiddleware + WorkspaceMiddleware + TransactionController.create`, so route-level no-`accountId` proof should include both missing workspace and valid workspace cases if planner adds integration coverage. [VERIFIED: `backend/src/routes.ts`:418]
- Frontend type schema allows `accountId` optional in the payload schema, but `transactionFormSchema.superRefine` still requires it for non-bridge UI submissions. [VERIFIED: `frontend/src/features/transactions/types/index.ts`:30]
- `useTransactionMutation` currently serializes `accountId: Number(data.accountId)` for ordinary transactions. If broad frontend is out of scope, planner may leave UI requiring account selection while backend becomes compatible with no-account callers. [VERIFIED: `frontend/src/features/transactions/hooks/useTransactionMutation.ts`:117]

### Required Phase 02 Test Map

| Req ID | Behavior | Recommended Test Type | Suggested File |
|---|---|---|---|
| TX-01 | Controller accepts manual create payload without `accountId` | unit/controller or route integration | `backend/tests/routes/Transaction.route.test.ts` or new controller test |
| TX-02 | Service resolves default workspace account when missing | unit service with repository mock plus DB-backed service/integration if feasible | `backend/tests/services/TransactionService.test.ts` |
| TX-03 | Explicit foreign/invalid account remains blocked | unit service negative | `backend/tests/services/TransactionService.test.ts` |
| TX-04 | Paid no-account transaction updates resolved account balance and audit | unit service with updateBalance argument assertions | `backend/tests/services/TransactionService.test.ts` |
| ID-01/02/03 | ID contracts remain string/number | type/schema assertions or route response assertions | backend + frontend type checks |
| TAX-01/TAX-02 | `taxAmount` and `netValue` remain null even with positive `taxRate` | unit service create payload assertion | `backend/tests/services/TransactionService.test.ts` |
| MKT-01/MKT-02 | Marketplace fields preserved and final amount excludes fee/shipping without tax provisioning | unit service create payload assertion | `backend/tests/services/TransactionService.test.ts` |

### Validation Commands

- `pnpm exec prisma validate` from `backend` or existing root script equivalent should validate schema if planner touches schema. Phase 02 should not need schema change. [VERIFIED: `_reversa_sdd/process/issue-development-workflow.md`:227]
- `pnpm exec tsc --noEmit` should catch DTO/controller/service optional `accountId` typing regressions. [VERIFIED: `_reversa_sdd/process/issue-development-workflow.md`:222]
- Targeted test command should include `backend/tests/services/TransactionService.test.ts` after adding Phase 02 cases. [VERIFIED: local test file present]
- Because `workflow.nyquist_validation` is true, planner must include a validation architecture and Wave 0 gaps before implementation. [VERIFIED: `.planning/config.json`:12]

## Security/Tenant Isolation Risks

- The main tenant risk is resolving a default account without `workspaceId`. Any new resolver must query by `workspaceId` and must not select a global/user-level account. [VERIFIED: `backend/src/repositories/AccountRepository.ts`:10]
- The explicit `accountId` path must keep `findByIdAndWorkspace`, because it blocks cross-workspace account IDs. [VERIFIED: `backend/src/services/TransactionService.ts`:69]
- `/transactions` route has `AuthMiddleware + WorkspaceMiddleware`, but Reversa flags finance write routes as lacking explicit `RbacMiddleware`; Phase 02 should not worsen this, and planner should include a negative tenant/workspace test rather than relying on mocks only. [VERIFIED: `_reversa_sdd/permissions.md`:42]
- Balance updates and audit logs must use the resolved account ID, not the original possibly undefined input. Current audit `newState.accountId` and `fromAccount` come from `accountId`; implementation must replace those with `resolvedAccount.id`. [VERIFIED: `backend/src/services/TransactionService.ts`:160]
- Outbox enqueue for expenses should remain payload-minimal and must not include raw transaction details. Existing test already guards this. [VERIFIED: `backend/tests/services/TransactionService.test.ts`:270]
- RLS is documented as applying to `Transaction`, `Account`, `Category`, and `BankMovement`, but current Phase 02 research did not execute runtime RLS validation. Planner should avoid claiming RLS proof from unit mocks. [VERIFIED: `_reversa_sdd/domain.md`:38]

## Open Questions (RESOLVED)

1. **Which default-account fallback is product-approved if exact seed names are absent?**
   - What we know: local seeds create `Conta PF Principal` and `Conta PJ Principal`; `Account.type` defaults to `CHECKING`. [VERIFIED: `backend/prisma/seed/modules/02_Structure.ts`:53]
   - RESOLVED: use exact seed name first, then `CHECKING` account fallback, then clear failure if none found. [ASSUMED: planner guidance]

2. **Should backend auto-create a default account when none exists?**
   - What we know: Phase context suggests failing clearly unless a plan justifies auto-create. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:109]
   - RESOLVED: do not auto-create in Phase 02.

3. **Should frontend stop requiring account selection immediately?**
   - What we know: backend contract must accept missing `accountId`; broad frontend is out of scope; current UI validation still requires account for non-bridge. [VERIFIED: `frontend/src/features/transactions/types/index.ts`:40]
   - RESOLVED: only minimal type/contract changes if needed; do not redesign transaction modal.

4. **Should existing imported flows also disable tax?**
   - What we know: Phase 02 covers manual `POST /transactions` only and excludes OFX/OpenFinance. [VERIFIED: `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`:7]
   - RESOLVED: do not alter import/approval flows unless the manual service is shared and tests prove no unintended regression.

## Implementation Guidance for planner

1. Keep Phase 02 backend-focused and start with failing tests in `backend/tests/services/TransactionService.test.ts`.
2. Change `TransactionController.create` Zod schema to make `accountId` optional, while leaving `categoryId` required unless a separate product decision changes category behavior.
3. Change `CreateTransactionDTO.accountId` to optional and immediately resolve `const resolvedAccount = ...` in `TransactionService.create`.
4. Preserve explicit account validation by keeping `findByIdAndWorkspace(accountId, workspaceId)` when `accountId` is provided.
5. Add a small workspace-scoped resolver. Prefer adding a repository method over broad service abstraction unless implementation complexity grows.
6. Use `resolvedAccount.id` for transaction connect, balance update, audit `newState.accountId`, and `fromAccount`.
7. Leave `Transaction.id` string handling untouched; do not cast transaction IDs to number.
8. Remove/disable only the tax provisioning writes for manual creation: persist `taxAmount: null` and `netValue: null`; do not remove schema fields.
9. Preserve marketplace amount calculation from gross/fee/shipping; do not subtract tax from `finalAmount`.
10. Do not touch `BridgeService`, `ImportController`, `ImportService`, `BankMovementService`, OpenFinance webhook/service, Telegram/OCR files, or pro-labore recurrence.
11. Include Matching before TDD in the final plan because this touches finance data, Prisma, tenant isolation, and backend/frontend contracts.

## Sources

- `AGENTS.md`: workflow and Conventional Commits constraints.
- `.planning/ROADMAP.md`: Phase 02 scope and success criteria.
- `.planning/REQUIREMENTS.md`: TX/ID/TAX/MKT requirements.
- `.planning/STATE.md`: planning-only state and Telegram/OCR preservation.
- `.planning/config.json`: Nyquist validation enabled and commit docs disabled.
- `.planning/phases/02-manual-transactions-without-accountid-taxes-off/02-CONTEXT.md`: locked Phase 02 decisions and scope fence.
- `_reversa_sdd/process/issue-development-workflow.md`: required issue workflow and validation commands.
- `_reversa_sdd/process/matching-agent-workflow.md`: Matching criteria for finance/security/database work.
- `_reversa_sdd/sdd/finance-core.md`: finance-core responsibilities and current transaction flow.
- `_reversa_sdd/domain.md`: workspace, tenant, RLS, and financial rules.
- `_reversa_sdd/permissions.md`: route permission matrix and RBAC gaps.
- `_reversa_sdd/questions.md`: resolved UUID string contract for `Transaction.id`.
- `_reversa_sdd/gaps.md`: known finance-core and ID-contract gaps.
- `backend/prisma/schema.prisma`: source of truth for `Workspace`, `Account`, `Transaction`, tax, marketplace, Telegram/OCR models.
- `backend/src/controllers/TransactionController.ts`: current manual transaction API validation.
- `backend/src/services/TransactionService.ts`: create flow, tax/marketplace calculation, balance update, audit, outbox.
- `backend/src/repositories/AccountRepository.ts`: workspace-scoped account lookup.
- `backend/src/repositories/TransactionRepository.ts`: string transaction ID lookup and persistence.
- `backend/src/routes.ts`: transaction route middleware stack.
- `backend/tests/services/TransactionService.test.ts`: current service test baseline.
- `backend/tests/routes/Transaction.route.test.ts`: current route integration baseline.
- `frontend/src/features/transactions/types/index.ts`: frontend transaction payload/response type state.
- `frontend/src/features/transactions/hooks/useTransactionMutation.ts`: frontend payload serialization behavior.
