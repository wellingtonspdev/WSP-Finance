-- CreateTable
CREATE TABLE "ExportArchive" (
    "id" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "layoutId" TEXT NOT NULL,
    "targetSystem" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "encoding" TEXT NOT NULL,
    "warningsCount" INTEGER NOT NULL,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportArchive_workspaceId_sha256_idx" ON "ExportArchive"("workspaceId", "sha256");

-- CreateIndex
CREATE INDEX "ExportArchive_workspaceId_createdAt_idx" ON "ExportArchive"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportArchive_workspaceId_periodStart_periodEnd_idx" ON "ExportArchive"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ExportArchive_workspaceId_targetSystem_layoutId_idx" ON "ExportArchive"("workspaceId", "targetSystem", "layoutId");

-- CreateIndex
CREATE INDEX "ExportArchive_retentionUntil_idx" ON "ExportArchive"("retentionUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ExportArchive_workspaceId_objectKey_key" ON "ExportArchive"("workspaceId", "objectKey");

-- AddForeignKey
ALTER TABLE "ExportArchive" ADD CONSTRAINT "ExportArchive_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportArchive" ADD CONSTRAINT "ExportArchive_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ativar RLS
ALTER TABLE "ExportArchive" ENABLE ROW LEVEL SECURITY;

-- Forçar aplicação
ALTER TABLE "ExportArchive" FORCE ROW LEVEL SECURITY;

-- Criar Policies
CREATE POLICY "tenant_isolation_policy" ON "ExportArchive"
FOR ALL
USING ("workspaceId" = current_setting('app.current_workspace_id', true)::int)
WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true)::int);
