---
phase: 4
title: Pro-Labore Recorrente com Pendencia
status: ready-for-planning
created: 2026-05-31
mode: planning-only
decision: pending confirmation only
---

# Phase 4 Context

## Objective

Create recurring monthly pro-labore scheduling with pending manual confirmation.

The cron creates pending records only. It must never execute a transfer, create transactions, or alter balances. The actual transfer happens only when an OWNER confirms a pending record, and confirmation must use the simplified `BridgeService` from Phase 3.

## Locked Decisions

- Cron creates pending confirmations only; it never transfers money.
- Confirmation is manual and uses `BridgeService.executeTransfer`.
- Only OWNER users can create, deactivate, cancel, or confirm recurring pro-labore.
- Schedules are deactivated to preserve history; do not delete historical records.
- Dedicated frontend page for recurring pro-labore.
- Use `PENDING`, `COMPLETED`, and `CANCELLED` as pending statuses.
- Insufficient balance keeps the pending record `PENDING` and records last error/attempt metadata.
- Normalize monthly competence as the first day of the month (`YYYY-MM-01`).
- Enforce one pending record per schedule and competence.
- Cron should process due schedules up to today, not only schedules due exactly today.
- If configured `dayOfMonth` does not exist in a month, use the last day of that month.
- Do not re-enable taxes.
- Do not ask the user for account selection.
- Do not mix this phase with Telegram/OCR.
- Do not change the already validated manual bridge rules beyond what is needed to call `BridgeService` from confirmation.

## Current Code Evidence

- `backend/prisma/schema.prisma` has no recurring pro-labore schedule or pending models.
- `backend/src/services/BridgeService.ts` already performs permission checks, default account resolution, insufficient balance blocking, atomic debit/credit transaction creation, balance updates, and audit logging.
- `backend/src/services/CronService.ts` already owns scheduled jobs and has an anti-double-start guard.
- `backend/src/routes.ts` currently exposes `POST /bridge/transfer` and existing protected workspace routes.
- `frontend/src/App.tsx` defines workspace-scoped routes under `/:workspaceId/...`.
- `frontend/src/shared/components/layout/Sidebar.tsx` and `frontend/src/shared/components/layout/BottomNav.tsx` define primary navigation.
- `frontend/src/features/workspaces/api/executeBridgeTransfer.ts` and `frontend/src/features/workspaces/hooks/useCreateBridge.ts` are the current manual bridge API/hook references.

## In Scope

- Add Prisma persistence for recurring pro-labore schedules.
- Add Prisma persistence for recurring pro-labore pending confirmations.
- Add service logic for schedule creation, listing, deactivation/cancelation, due pending generation, pending listing, and pending confirmation.
- Add endpoints for schedule create/list/deactivate and pending list/confirm.
- Integrate due-pending generation into `CronService`.
- Add dedicated frontend page for recurring pro-labore configuration and pending confirmation.
- Add focused backend tests for schedule validation, OWNER-only authorization, cron idempotency, last-day-of-month behavior, confirmation idempotency, BridgeService delegation, insufficient balance, and deactivation.
- Add focused frontend tests for creating schedules, viewing pending records, confirming pending records, insufficient-balance error display, and inactive schedule state.

## Out of Scope

- No automatic transfer from cron.
- No tax provisioning or automatic tax calculation.
- No account selector or user-facing account requirement.
- No Telegram/OCR changes.
- No OpenFinance/OFX changes.
- No direct Transaction creation outside `BridgeService`.
- No broad dashboard rewrite.
- No deletion of historical schedules or pending records.

## Safety Invariants

- Pending generation must be idempotent by schedule and competence.
- Pending confirmation must be idempotent and cannot create duplicate bridge transfers.
- Insufficient balance must not close the pending record.
- Insufficient balance must not mutate balances or create transactions.
- Confirmation must be atomic, concurrency-safe, and crash-aware around pending status transition and bridge execution.
- Confirmation must persist a durable `bridgeId`/idempotency key on `RecurringProLaborePending` before bridge execution and reuse it on retries.
- Confirmation must claim the pending row with compare-and-set semantics or an equivalent row-level lock before calling `BridgeService`.
- Retrying confirmation after bridge success but before pending completion must not create duplicate transfer legs.
- OWNER-only authorization must be checked for both source and destination workspaces.
- Source workspace must be BUSINESS and destination workspace must be PERSONAL.
- Source and destination workspaces must be different.
- `Transaction.id` remains string UUID.
- `Account.id` and `Workspace.id` remain numbers.
- Audit of actual transfer remains owned by `BridgeService`.

## Required Tests

- Create valid BUSINESS to PERSONAL schedule.
- Block same source and destination workspace.
- Block non-OWNER users.
- Block invalid workspace type direction.
- Generate pending on configured day.
- Generate pending on last day of month when `dayOfMonth` exceeds month length.
- Do not duplicate pending for same schedule and competence.
- Confirm pending record executes bridge and marks it completed.
- Confirm same pending record twice does not duplicate transfer.
- Concurrent confirm attempts for the same pending record result in one bridge transfer only.
- Crash/retry after bridge success but before pending completion reuses the durable bridge id and does not duplicate transfer legs.
- Insufficient balance blocks confirmation and keeps pending open.
- Deactivating schedule prevents future pending generation.
- Frontend creates monthly schedule.
- Frontend lists pending records.
- Frontend confirms pending record.
- Frontend displays insufficient-balance error clearly.
- Frontend shows deactivated schedule as inactive and not active.

## Validation Commands

- `git branch --show-current`
- `git status --short -uall`
- `git diff --stat`
- `git diff --check`
- `cd backend && pnpm exec prisma validate`
- `cd backend && pnpm exec tsc --noEmit`
- `cd backend && pnpm test`
- `cd frontend && pnpm test`
- `cd frontend && pnpm run build`

## Known Risks

- This phase touches schema/migration, cron, RBAC, financial balances, bridge, audit-adjacent behavior, endpoints, and frontend UI; Matching Report is mandatory before TDD plan.
- `BridgeService` performs service-level cross-workspace authorization and is the required transfer boundary. Do not bypass it from recurring pro-labore.
- Cron retry behavior must be carefully bounded by idempotency constraints so missed runs do not generate duplicates.
