# Phase 6 Research - Frontend Simplificado Existente

**Date:** 2026-05-31
**Status:** Complete
**Mode:** Local codebase research

## Summary

Phase 6 is a frontend-only alignment pass after backend Phases 2, 3, and 5 simplified account handling. The backend now resolves default accounts internally for manual transactions, bridge transfers, and Telegram destinations. The frontend still exposes account selection in the primary transaction modal and may still send `accountId` in manual transaction payloads.

## Current Findings

### Transaction Creation

- `frontend/src/features/transactions/components/TransactionModal.tsx` still initializes and renders `accountId` for common transactions.
- The same modal still renders origin and destination account selectors for bridge/pro-labore.
- `frontend/src/features/transactions/hooks/useTransactionMutation.ts` still appends `accountId` to `sanitizedPayload` when present.
- `frontend/src/features/transactions/types/index.ts` still includes `accountId` and `toAccountId` in form and payload schemas.

### Bridge / Pro-Labore

- `frontend/src/features/workspaces/api/executeBridgeTransfer.ts` already matches the simplified backend contract:
  - `fromWorkspaceId`
  - `toWorkspaceId`
  - `amount`
  - `description`
  - `date`
- The DTO does not include `fromAccountId` or `toAccountId`.
- Remaining bridge risk is UI/form state, not API layer.

### Telegram Config

- `frontend/src/features/workspaces/api/telegramIntegration.ts` no longer includes `defaultAccountId` in `GenerateLinkDTO`.
- `TelegramDestination.accountId` remains in the response type, which is correct because backend still returns internal destination account information.
- `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx` has no account selector, but copy still says the bot asks for "workspace, conta e categoria".

### Transaction Display

- `frontend/src/features/transactions/components/TransactionAccordionItem.tsx` still displays `Conta: ...` in the primary row.
- Marketplace display already hides tax line unless `Number(transaction.taxAmount) > 0`.
- It still shows "Total Liquido" for marketplace transactions regardless of `netValue`, because display amount falls back to `amount` when `netValue` is null.

## Recommended Implementation Direction

1. Remove account selectors from primary transaction and bridge UI, not only from submit payloads.
2. Remove `accountId` and `toAccountId` from frontend request/form schemas where they represent public payloads.
3. Keep `Transaction.accountId`, `TelegramDestination.accountId`, and account filters/read models where they represent backend response or non-primary flows.
4. Keep bridge API unchanged because it is already correct.
5. Adjust Telegram copy to remove account language.
6. Move account display out of the primary transaction row; category remains primary.
7. Hide tax/net language when tax/net values are null, especially marketplace "Total Liquido" wording.

## Risks

- **P1:** Removing `accountId` from response types instead of request-only types can break transaction list rendering.
- **P1:** Leaving hidden `accountId: 0` in form defaults can keep leaking invalid payload fields via generic sanitization.
- **P2:** Removing account selectors can leave unused imports/hooks and break frontend build.
- **P2:** Existing no-test frontend setup may require adding focused tests around a pure payload sanitizer to avoid brittle modal tests.
- **P3:** Copy still using "conta" in Telegram success/disconnect labels may be acceptable as user account wording, but "workspace, conta e categoria" should be changed.

## Validation Targets

- `cd frontend && pnpm test`
- `cd frontend && pnpm run build`
- `git diff --check`

## Convergence Note

External `$gsd-plan-review-convergence` did not run because `workflow.plan_review_convergence` is disabled in config. Inline convergence found no HIGH blockers after narrowing implementation to frontend-only primary flows and preserving internal response account fields.
