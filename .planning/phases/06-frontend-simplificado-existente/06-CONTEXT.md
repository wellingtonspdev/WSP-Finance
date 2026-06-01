# Phase 6: Frontend Simplificado Existente - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning
**Source:** User-provided phase scope and decisions

<domain>
## Phase Boundary

Simplify existing frontend flows so users do not choose accounts in primary manual flows, while keeping backend Phase 2, 3, and 5 contracts intact.
</domain>

<decisions>
## Implementation Decisions

### Transaction Creation
- Hide/remove the account selector from the main transaction modal.
- Do not send `accountId` in manual transaction payloads.
- Keep category, amount, date, paid status, marketplace fields, and attachment support.

### Manual Pro-Labore / Bridge
- Hide/remove origin and destination account selectors.
- Send only source workspace, destination workspace, amount, description, and date.
- Keep the existing manual bridge flow; do not create a new screen.

### Telegram Config
- User chooses workspace destination only.
- Do not expose account selection in Telegram config.
- Do not reintroduce public `accountId` or `defaultAccountId`.

### Transaction Display
- Do not emphasize account as a primary display element.
- Hide tax/net summary when `taxAmount` and `netValue` are `null`.
- Keep internal response fields such as `Transaction.accountId` usable when returned by backend.

### Required Tests
- Transaction modal renders without account fields.
- Transaction submit does not send `accountId`.
- Manual bridge submit does not send `fromAccountId` or `toAccountId`.
- Telegram config does not show an account selector.
- Transaction item/list does not show tax/net values when backend returns `taxAmount = null` and `netValue = null`.

### Validation Commands
- `cd frontend && pnpm test`
- `cd frontend && pnpm run build`
- `git diff --check`

### Scope Fence
- Do not alter backend.
- Do not create recurrence, pending pro-labore, cron, migrations, or a broad dashboard rewrite.
- Do not remove administrative account APIs/screens outside the primary flows.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` - Phase 6 scope, success criteria, and boundaries.
- `frontend/src/features/transactions/components/TransactionModal.tsx` - Main transaction and bridge modal.
- `frontend/src/features/transactions/hooks/useTransactionMutation.ts` - Transaction and bridge payload assembly.
- `frontend/src/features/transactions/types/index.ts` - Frontend form/request/response types.
- `frontend/src/features/workspaces/api/telegramIntegration.ts` - Telegram public DTOs and internal destination response shape.
- `frontend/src/features/transactions/components/TransactionAccordionItem.tsx` - Transaction row display for account/category/tax visibility.
- `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx` - Telegram configuration page visible contract.
</canonical_refs>

<specifics>
## Specific Ideas

- Preferred execution option: remove account fields from visible primary flows and payloads, not merely hide during submit.
- Bridge DTO already follows the simplified backend shape and should not be expanded.
- BankMovement/import/accountant account fields are outside this phase unless a shared type causes a direct frontend break.
</specifics>

<deferred>
## Deferred Ideas

- Recurring monthly pro-labore UI.
- Pending pro-labore screen.
- Broad dashboard redesign.
</deferred>

---

*Phase: 06-frontend-simplificado-existente*
*Context gathered: 2026-05-31*
