# Roadmap: WSP Finance

## Current Milestone: Manual Transaction MVP Stabilization

Focus: preserve Phase 1 hardening, keep Telegram/OCR baseline untouched, and plan Phase 2 for manual transaction contract simplification.

## Phases

- [x] **Phase 1: Core Hardening** - Security hardening verified with score 5/5.
- [ ] **Phase 2: Manual Transactions without accountId + Taxes Off** - Plan and implement manual transaction creation without client-provided `accountId`, while preserving ID contracts and disabling automatic tax provisioning.

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

**Status:** Planned

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
