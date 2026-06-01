# ADR - Phase 4 Recurring Pro-labore Idempotency

## Status

Accepted

## Context

Recurring pro-labore must create monthly pending confirmations. Cron must not transfer money. Manual confirmation can be retried or invoked concurrently and must not duplicate ledger mutations.

## Decision

Persist a durable `bridgeId` on `RecurringProLaborePending` before calling `BridgeService`. Extend `BridgeService.executeTransfer` with an optional internal `bridgeId`; when provided, it uses deterministic FITIDs:

- `BRIDGE_OUT_${bridgeId}`
- `BRIDGE_IN_${bridgeId}`

`Transaction` already has `@@unique([workspaceId, fitid])`, so the bridge boundary remains the single ledger mutation path and retries can return the existing transfer.

## Consequences

- Cron only creates pendings.
- Pending confirmation remains manual.
- Retry after bridge success does not double-debit.
- The public manual bridge contract remains unchanged.
- Partial bridge leg detection returns conflict because it indicates data inconsistency.
