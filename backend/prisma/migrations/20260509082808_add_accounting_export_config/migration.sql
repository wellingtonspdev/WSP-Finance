-- CreateTable
CREATE TABLE "AccountingExportConfig" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "targetSystem" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "branchCode" TEXT,
    "sourceLabel" TEXT NOT NULL DEFAULT 'WSP',
    "historyCodeRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingExportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingExportConfig_workspaceId_idx" ON "AccountingExportConfig"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingExportConfig_workspaceId_layoutId_key" ON "AccountingExportConfig"("workspaceId", "layoutId");

-- AddForeignKey
ALTER TABLE "AccountingExportConfig" ADD CONSTRAINT "AccountingExportConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "AccountingExportConfig" ADD CONSTRAINT "AccountingExportConfig_companyCode_not_blank" CHECK (length(btrim("companyCode")) > 0);

-- EnableRLS
ALTER TABLE "AccountingExportConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountingExportConfig" FORCE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "tenant_isolation_policy" ON "AccountingExportConfig"
FOR ALL
USING ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int))
WITH CHECK ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int));
