# Roadmap: WSP Finance

## Current Milestone: Manual Transaction MVP Stabilization

Focus: preserve Phase 1/2 hardening, keep Telegram/OCR baseline intact, and plan Phase 3 for bridge transfers without explicit account selection.

## Phases

- [x] **Phase 1: Core Hardening** - Security hardening verified with score 5/5.
- [x] **Phase 2: Manual Transactions without accountId + Taxes Off** - Manual transaction creation accepts omitted `accountId`, resolves default accounts, and disables automatic tax provisioning.
- [ ] **Phase 3: Bridge / Manual Pro-Labore without Explicit Accounts** - Plan bridge transfer contract simplification so the client sends workspaces only and backend resolves default accounts.

## Phase Details

### Phase 1: Core Hardening

**Goal:** Verify core security hardening and preserve Telegram/OCR baseline.

**Status:** Complete

**Verification:** `.planning/phases/01-core-hardening/01-VERIFICATION.md`

**Success Criteria:**
1. OTP hardening uses CSPRNG.
2. OpenFinance webhook has no unsafe fallback.
3. External data endpoints are protected.
4. Hardening tests exist.
5. Telegram/OCR baseline remains preserved.

Plans:
- Complete via verification report.

### Phase 2: Manual Transactions without accountId + Taxes Off

**Goal:** Simplify manual transaction creation so clients may omit `accountId`; backend resolves a workspace default account, keeps explicit `accountId` workspace-safe, preserves UUID/number ID contracts, and disables automatic tax provisioning for MVP.

**Depends on:** Phase 1

**Status:** Complete

**Success Criteria:**
1. `POST /transactions` accepts manual create payloads without `accountId`.
2. `TransactionService.create` resolves a workspace default account when `accountId` is absent.
3. Explicit `accountId` remains accepted only if it belongs to the current workspace.
4. New transactions persist `taxAmount = null` and `netValue = null`.
5. Marketplace fields remain intact and final amount still excludes fee/shipping as currently intended, without tax provisioning.
6. Paid transactions still update the resolved account balance and audit state correctly.
7. `Transaction.id` remains string UUID; `Account.id` and `Workspace.id` remain numbers.
8. BridgeService, OFX/OpenFinance, Telegram/OCR, and broad frontend changes remain untouched.

Plans:
- [ ] 02-01-PLAN.md — TDD-first backend plan for optional manual `accountId`, workspace default account resolution, taxes-off persistence, marketplace preservation, and ID-contract protection.

### Phase 3: Bridge / Manual Pro-Labore without Explicit Accounts

**Goal:** Simplify manual bridge/pro-labore transfers so clients submit source and target workspaces, while the backend resolves default accounts and preserves RBAC, fiscal-period guards, atomic balance updates, and audit snapshots.

**Depends on:** Phase 2

**Status:** Planning

**Success Criteria:**
1. `POST /bridge/transfer` accepts payloads without `fromAccountId` and `toAccountId`.
2. `BridgeService.executeTransfer` resolves source and target default accounts using `AccountRepository.findDefaultByWorkspace(workspaceId, workspace.type)`.
3. User still needs OWNER or ACCOUNTANT membership in both workspaces.
4. Source and target workspaces must remain different.
5. Closed fiscal period rules stay enforced for both workspaces.
6. Insufficient source balance blocks before transaction creation and balance mutation.
7. Debit/credit transactions and account balance updates stay in one Prisma transaction.
8. Audit rows keep resolved `fromAccount` and `toAccount` IDs and balance snapshots.
9. No recurrence, pending pro-labore, cron, or new manual flow is introduced.

Plans:
- [ ] 03-01-PLAN.md - TDD-first backend plan for bridge contract simplification using existing default-account repository helper.
