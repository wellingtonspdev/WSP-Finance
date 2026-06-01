# WSP Finance

## What This Is

WSP Finance is a multi-tenant finance system for personal and business workspaces, with accountant-oriented workflows, ledger transactions, imports, audit logs, and workspace isolation.

## Core Value

Manual and imported financial records must stay tenant-safe, auditable, and consistent with account balances.

## Requirements

### Validated

- Phase 1 Core Hardening verified with score 5/5 in `.planning/phases/01-core-hardening/01-VERIFICATION.md`.

### Active

- [ ] Phase 2: simplify manual transaction creation by making `accountId` optional and resolving a workspace default account in the backend.
- [ ] Phase 2: preserve ID contracts: `Transaction.id` is string UUID; `Account.id` and `Workspace.id` are numbers.
- [ ] Phase 2: disable automatic tax provisioning for MVP while preserving marketplace fields and balance behavior.

### Out of Scope

- BridgeService changes -- explicitly excluded from Phase 2.
- OFX/OpenFinance import changes -- excluded unless separately approved.
- Telegram/OCR changes -- current baseline must remain untouched.
- Broad frontend refactors -- only minimal type/contract fixes if required.

## Context

- Repo workflow starts from `AGENTS.md` and Reversa issue workflow.
- Phase 1 Core Hardening passed verification on 2026-05-31.
- Working tree contains ongoing Telegram/OCR baseline work that must not be overwritten.

## Constraints

- **Scope**: Phase 2 is limited to manual transaction contracts and backend behavior.
- **IDs**: `Transaction.id` remains string UUID; `Account.id` and `Workspace.id` remain number.
- **Safety**: Tenant/workspace validation must remain anchored to `WorkspaceMiddleware` and workspace-scoped repository checks.
- **Git**: Do not stage, commit, push, reset, or clean without explicit approval.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve `Transaction.id` as string UUID | Prisma schema and Reversa question 8 define this as the official contract | Pending implementation |
| Keep `Account.id` and `Workspace.id` as number | Prisma schema uses integer IDs for these entities | Pending implementation |
| Do not touch Telegram/OCR in Phase 2 | Existing baseline is active work and out of scope | Pending implementation |

---
*Last updated: 2026-05-31 after GSD Phase 2 bootstrap*
