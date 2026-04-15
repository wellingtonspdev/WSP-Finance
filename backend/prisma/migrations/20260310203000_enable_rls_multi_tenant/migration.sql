-- Ativar RLS
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

-- Forçar aplicação
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;

-- Bypass para Migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'prisma_migration') THEN
    ALTER ROLE "prisma_migration" BYPASSRLS;
  END IF;
END
$$;

-- Criar Policies
CREATE POLICY "tenant_isolation_policy" ON "Transaction"
FOR ALL
USING ("workspaceId" = current_setting('app.current_workspace_id', true)::int)
WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true)::int);

CREATE POLICY "tenant_isolation_policy" ON "Account"
FOR ALL
USING ("workspaceId" = current_setting('app.current_workspace_id', true)::int)
WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true)::int);

CREATE POLICY "tenant_isolation_policy_categories" ON "Category"
FOR ALL
USING (
  "workspaceId" IS NULL OR 
  "workspaceId" = current_setting('app.current_workspace_id', true)::int
)
WITH CHECK (
  "workspaceId" = current_setting('app.current_workspace_id', true)::int
);
