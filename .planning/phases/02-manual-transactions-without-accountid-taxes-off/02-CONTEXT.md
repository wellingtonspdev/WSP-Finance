# Phase 2: Manual Transactions without accountId + Taxes Off - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning
**Source:** Local Reversa/GSD bootstrap from user-provided Phase 2 scope

<domain>
## Phase Boundary

Phase 2 covers manual `POST /transactions` creation only:

- Make `accountId` optional at the manual transaction contract boundary.
- Resolve a workspace default account in the backend when `accountId` is absent.
- Keep explicit `accountId` temporarily compatible, but only if it belongs to the current workspace.
- Disable automatic tax provisioning for MVP by saving `taxAmount = null` and `netValue = null`.
- Preserve marketplace fields and the existing gross/fee/shipping final amount behavior without tax calculation.
- Preserve ID contracts:
  - `Transaction.id` = string UUID.
  - `Account.id` = number.
  - `Workspace.id` = number.

</domain>

<decisions>
## Implementation Decisions

### Scope

- Phase 2 must not alter `BridgeService`.
- Phase 2 must not alter OFX/OpenFinance import paths.
- Phase 2 must not alter Telegram/OCR files or baseline behavior.
- Phase 2 must not introduce broad frontend refactors; only minimal type/contract adjustments are allowed if needed.
- Phase 2 must not create pro-labore recurrence.

### Backend Contract

- `TransactionController.create` should accept payloads without `accountId`.
- `TransactionService.create` should accept optional `accountId`.
- When `accountId` is absent, backend must resolve the account from the current `workspaceId`.
- When `accountId` is present, backend must still call a workspace-scoped validation path before using it.

### ID Contracts

- `Transaction.id` is a string UUID and must stay string in transaction-facing contracts.
- `Account.id` is numeric and must stay number.
- `Workspace.id` is numeric and must stay number.
- Do not fix unrelated ID types globally.

### Tax and Marketplace

- New manual transactions must save `taxAmount = null`.
- New manual transactions must save `netValue = null`.
- `Workspace.taxRate` must not trigger automatic tax calculation in Phase 2.
- Marketplace fields must remain in schema and allowed payloads.
- Marketplace final amount may continue to be based on gross amount, platform fee, and shipping cost, but must not subtract tax.

### Testing

- Tests must prove no-`accountId` creation for PERSONAL and BUSINESS workspaces.
- Tests must prove paid no-`accountId` creation updates the resolved account balance.
- Tests must prove invalid explicit `accountId` remains blocked.
- Tests must prove taxes remain null even when `Workspace.taxRate > 0`.
- Tests must prove marketplace fields are preserved while tax remains disabled.

</decisions>

<canonical_refs>
## Canonical References

### Repo Workflow

- `AGENTS.md` - Reversa workflow and issue planning gates.
- `_reversa_sdd/process/issue-development-workflow.md` - required issue workflow.
- `_reversa_sdd/process/matching-agent-workflow.md` - matching before TDD for finance/security work.
- `_reversa_sdd/process/tdd-plan-template.md` - TDD plan shape.
- `_reversa_sdd/process/development-agent-prompt-template.md` - executor prompt shape.

### Domain and Contracts

- `_reversa_sdd/sdd/finance-core.md` - finance-core rules and current transaction flow.
- `_reversa_sdd/domain.md` - workspace, ledger, balance, and audit domain rules.
- `_reversa_sdd/permissions.md` - workspace middleware and permission notes.
- `_reversa_sdd/questions.md` - confirmed `Transaction.id` UUID string decision.
- `_reversa_sdd/gaps.md` - existing ID-contract gap and finance-core concerns.

### Code

- `backend/prisma/schema.prisma` - source of truth for `Transaction`, `Account`, `Workspace`, tax, and marketplace fields.
- `backend/src/controllers/TransactionController.ts` - manual transaction API contract.
- `backend/src/services/TransactionService.ts` - manual transaction creation, balance update, audit, tax, and marketplace logic.
- `backend/src/repositories/AccountRepository.ts` - workspace-scoped account lookup.
- `backend/src/repositories/TransactionRepository.ts` - transaction persistence.
- `backend/tests/services/TransactionService.test.ts` - primary Phase 2 test target.
- `frontend/src/features/transactions/types/index.ts` - frontend transaction DTO/type contract if minimal type adjustment is needed.

</canonical_refs>

<specifics>
## Specific Ideas

- Prefer a small backend helper/service for default account resolution if the existing repository methods are insufficient.
- Current code does not contain `DefaultAccountService`; planner must choose whether to create it or add a small account repository method.
- Existing seed names are `Conta PF Principal` and `Conta PJ Principal`; user-facing wording mentioned `Conta Pessoal` and `Conta Empresa`, so research/planning must resolve this mismatch before execution.
- Strong default-account rule candidate:
  - PERSONAL: prefer `Conta PF Principal`, otherwise first active/checking account in workspace.
  - BUSINESS: prefer `Conta PJ Principal`, otherwise first active/checking account in workspace.
- If no suitable account exists, service should fail clearly instead of creating data implicitly unless plan justifies auto-create.

</specifics>

<deferred>
## Deferred Ideas

- Persisted default-account configuration.
- Full frontend UX simplification for manual transactions.
- Tax provisioning model.
- Bridge, OFX/OpenFinance, Telegram/OCR, and pro-labore recurrence.

</deferred>

<scope_fence>
## Scope Fence

Do not mutate unrelated files. Do not stage, commit, push, reset, clean, or overwrite Telegram/OCR baseline. Phase 2 planning may research and produce plans only; implementation waits for explicit user command.
</scope_fence>

---

*Phase: 02-manual-transactions-without-accountid-taxes-off*
*Context gathered: 2026-05-31 via local GSD bootstrap*
