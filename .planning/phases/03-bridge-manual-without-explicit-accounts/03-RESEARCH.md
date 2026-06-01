---
phase: 3
title: Bridge / Manual Pro-Labore without Explicit Accounts
status: complete
researched: 2026-05-31
---

# Phase 3 Research

## Summary

Bridge transfer is currently account-explicit. The service is already structured around source workspace, target workspace, account validation, category lookup, atomic transaction, balance updates, and two audit rows.

Phase 3 should remove account IDs from the public contract and replace explicit account lookup with default account resolution after both workspace memberships are loaded.

## Relevant Files

| File | Current Role | Phase 3 Impact |
| --- | --- | --- |
| `backend/src/controllers/BridgeController.ts` | Validates bridge request payload | Remove `fromAccountId` and `toAccountId` from schema |
| `backend/src/services/BridgeService.ts` | Executes cross-workspace transfer | Resolve default accounts and use resolved IDs everywhere |
| `backend/src/repositories/AccountRepository.ts` | Account lookup helper | Reuse `findDefaultByWorkspace` |
| `backend/tests/services/BridgeService.balance-audit.test.ts` | Current focused bridge audit test | Expand to cover default accounts, balance, failure guards |
| `frontend/src/features/workspaces/api/executeBridgeTransfer.ts` | Frontend bridge DTO | Remove account IDs if frontend API type is kept current |
| `backend/src/swagger-output.json` | Generated docs | Update if Swagger is regenerated |

## Current Service Flow

1. Load memberships for `fromWorkspaceId` and `toWorkspaceId`.
2. Require OWNER or ACCOUNTANT on both.
3. Validate closed fiscal period for both workspaces.
4. Validate explicit source and target accounts.
5. Validate source balance.
6. Find categories.
7. Run one Prisma transaction for debit, credit, balances, and audit.

## Required New Flow

1. Load memberships for both workspaces.
2. Require OWNER or ACCOUNTANT on both.
3. Validate closed fiscal period for both workspaces.
4. Resolve default source account with `findDefaultByWorkspace(dto.fromWorkspaceId, fromMembership.workspace.type)`.
5. Resolve default target account with `findDefaultByWorkspace(dto.toWorkspaceId, toMembership.workspace.type)`.
6. Validate both accounts exist.
7. Validate source balance.
8. Keep category lookup.
9. Run the same single Prisma transaction, replacing all DTO account ID uses with resolved account IDs.

## Default Account Rule

Use existing Phase 2 helper:

```ts
findDefaultByWorkspace(workspaceId, workspaceType)
```

Current fallback:

1. Named default: personal `Conta PF Principal`, business `Conta PJ Principal`.
2. First `CHECKING` account by name.
3. First workspace account by name.

## Test Surface

Minimum test coverage should stay focused on `BridgeService.balance-audit.test.ts`, because service-level tests can directly assert account resolution, no transaction on failure, transaction payload IDs, balance updates, and audit snapshots.

Optional controller test can be added if schema regression risk is high.

## Stop Conditions

Stop execution if default account resolution requires auto-creating accounts, account names conflict with product expectations, route needs a new cross-workspace middleware, changes require Prisma schema/migration, existing bridge atomicity cannot be preserved, or any Telegram/OCR or recurrence file becomes necessary.
