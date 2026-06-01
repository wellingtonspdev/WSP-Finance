---
phase: 3
title: Bridge / Manual Pro-Labore without Explicit Accounts
status: planned
created: 2026-05-31
mode: planning-only
decision: use AccountRepository.findDefaultByWorkspace directly
---

# Phase 3 Context

## Objective

Simplify manual bridge/pro-labore transfer creation so the client sends only `fromWorkspaceId`, `toWorkspaceId`, `amount`, `description`, and `date`.

The client must no longer send `fromAccountId` or `toAccountId`.

The backend resolves default accounts for both workspaces and preserves all existing financial safety guarantees.

## Locked Decision

Use option A: reuse `AccountRepository.findDefaultByWorkspace(workspaceId, workspaceType)` directly in `BridgeService`.

Do not create `DefaultAccountService` in this phase. Creating or moving to a shared service is out of scope unless execution finds a hard blocker.

## Current Code Evidence

- `backend/src/controllers/BridgeController.ts` currently requires `fromAccountId` and `toAccountId` in the Zod schema.
- `backend/src/services/BridgeService.ts` currently accepts `fromAccountId` and `toAccountId` in `BridgeTransferDTO`.
- `BridgeService` currently validates explicit accounts through `AccountRepository.findByIdAndWorkspace`.
- `backend/src/repositories/AccountRepository.ts` already provides `findDefaultByWorkspace(workspaceId, workspaceType)`.
- `backend/tests/services/BridgeService.balance-audit.test.ts` currently tests audit behavior using explicit account IDs.

## In Scope

- Update bridge request contract for `POST /bridge/transfer`.
- Resolve source and target accounts from workspace defaults.
- Keep RBAC membership validation for both workspaces.
- Keep source and target workspace difference validation.
- Keep closed fiscal-period validation for both workspaces.
- Keep insufficient balance guard.
- Keep one Prisma transaction for debit, credit, balance updates, and audit rows.
- Keep audit `fromAccount` and `toAccount` populated with resolved account IDs.
- Update focused bridge service tests.
- Update controller schema and frontend API type only if needed for contract consistency.
- Update Swagger output/config if generated docs would otherwise be stale.

## Out of Scope

- No recurrence.
- No pending pro-labore.
- No cron.
- No new recurring UI.
- No account auto-creation.
- No schema or migration unless a blocker is found.
- No broad route architecture or middleware refactor.
- No change to Telegram/OCR behavior.
- No change to OpenFinance/OFX import flows.

## Safety Invariants

- No partial financial write: debit, credit, balances, and audit must remain atomic.
- No transaction creation if permissions fail.
- No transaction creation if fiscal period is closed.
- No transaction creation if default account cannot be resolved.
- No transaction creation if source balance is insufficient.
- Audit rows must remain symmetrical and include resolved account IDs.

## Known Risk

`POST /bridge/transfer` uses `AuthMiddleware` only and relies on service-level checks for both workspaces. This is existing behavior. Phase 3 must not weaken it.
