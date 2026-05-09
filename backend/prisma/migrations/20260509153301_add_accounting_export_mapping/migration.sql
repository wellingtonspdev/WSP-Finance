-- CreateTable
CREATE TABLE "AccountingExportMapping" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "macroCategoryId" INTEGER NOT NULL,
    "layoutId" TEXT NOT NULL,
    "targetSystem" TEXT NOT NULL,
    "debitAccountCode" TEXT NOT NULL,
    "creditAccountCode" TEXT NOT NULL,
    "historyCode" TEXT,
    "costCenterCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingExportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingExportMapping_workspaceId_idx" ON "AccountingExportMapping"("workspaceId");

-- CreateIndex
CREATE INDEX "AccountingExportMapping_macroCategoryId_idx" ON "AccountingExportMapping"("macroCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingExportMapping_workspaceId_macroCategoryId_layoutI_key" ON "AccountingExportMapping"("workspaceId", "macroCategoryId", "layoutId");

-- AddForeignKey
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_macroCategoryId_fkey" FOREIGN KEY ("macroCategoryId") REFERENCES "MacroCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_debitAccountCode_not_blank" CHECK (length(btrim("debitAccountCode")) > 0);
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_creditAccountCode_not_blank" CHECK (length(btrim("creditAccountCode")) > 0);
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_debitAccountCode_numeric" CHECK (btrim("debitAccountCode") ~ '^[0-9]+$');
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_creditAccountCode_numeric" CHECK (btrim("creditAccountCode") ~ '^[0-9]+$');
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_historyCode_numeric" CHECK ("historyCode" IS NULL OR btrim("historyCode") ~ '^[0-9]+$');
ALTER TABLE "AccountingExportMapping" ADD CONSTRAINT "AccountingExportMapping_costCenterCode_numeric" CHECK ("costCenterCode" IS NULL OR btrim("costCenterCode") ~ '^[0-9]+$');

-- EnableRLS
ALTER TABLE "AccountingExportMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountingExportMapping" FORCE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "tenant_isolation_policy" ON "AccountingExportMapping"
FOR ALL
USING ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int))
WITH CHECK ("workspaceId" = (SELECT current_setting('app.current_workspace_id', true)::int));
