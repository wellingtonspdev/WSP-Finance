-- Ativar RLS
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Forçar aplicação
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- Criar Policy INSERT
CREATE POLICY "audit_log_insert_workspace"
ON "AuditLog"
FOR INSERT
WITH CHECK (
  "workspaceId" IS NOT NULL
  AND "workspaceId" = NULLIF(current_setting('app.current_workspace_id', true), '')::int
);