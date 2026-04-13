-- RLS Optimization: Replace volatile `current_setting` with stable subquery `(SELECT current_setting(...))`
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "Transaction";
CREATE POLICY "tenant_isolation_policy" ON "Transaction"
FOR ALL
USING ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int))
WITH CHECK ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int));

DROP POLICY IF EXISTS "tenant_isolation_policy" ON "Account";
CREATE POLICY "tenant_isolation_policy" ON "Account"
FOR ALL
USING ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int))
WITH CHECK ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int));

DROP POLICY IF EXISTS "tenant_isolation_policy_categories" ON "Category";
CREATE POLICY "tenant_isolation_policy_categories" ON "Category"
FOR ALL
USING (
  "workspaceId" IS NULL OR 
  "workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int)
)
WITH CHECK (
  "workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int)
);

DROP POLICY IF EXISTS "tenant_isolation_policy" ON "BankMovement";
CREATE POLICY "tenant_isolation_policy" ON "BankMovement"
FOR ALL
USING ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int))
WITH CHECK ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int));