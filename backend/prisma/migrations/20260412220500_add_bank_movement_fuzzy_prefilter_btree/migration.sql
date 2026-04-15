-- B-Tree prefilter index for fuzzy dedup queries.
-- date DESC aligns with Inbox query: orderBy { date: 'desc' }
DROP INDEX IF EXISTS "idx_bank_movements_workspace_status_amount_date";

CREATE INDEX "idx_bank_movements_workspace_status_amount_date"
ON "BankMovement" ("workspaceId", "status", "amount", "date" DESC);
