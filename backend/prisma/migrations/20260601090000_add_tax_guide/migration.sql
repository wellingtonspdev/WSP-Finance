-- CreateEnum
CREATE TYPE "TaxGuideType" AS ENUM ('DAS', 'DAS_MEI');

-- CreateEnum
CREATE TYPE "TaxGuideStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "TaxGuide" (
    "id" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "type" "TaxGuideType" NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "competenceYear" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "status" "TaxGuideStatus" NOT NULL DEFAULT 'PENDING',
    "guideFileObjectKey" TEXT,
    "paymentProofObjectKey" TEXT,
    "paidTransactionId" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxGuide_workspaceId_type_competenceMonth_competenceYear_key" ON "TaxGuide"("workspaceId", "type", "competenceMonth", "competenceYear");
CREATE INDEX "TaxGuide_workspaceId_status_idx" ON "TaxGuide"("workspaceId", "status");
CREATE INDEX "TaxGuide_workspaceId_competenceYear_competenceMonth_idx" ON "TaxGuide"("workspaceId", "competenceYear", "competenceMonth");
CREATE INDEX "TaxGuide_dueDate_idx" ON "TaxGuide"("dueDate");
CREATE INDEX "TaxGuide_paidTransactionId_idx" ON "TaxGuide"("paidTransactionId");
CREATE INDEX "TaxGuide_createdByUserId_idx" ON "TaxGuide"("createdByUserId");

-- AddForeignKey
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_paidTransactionId_fkey" FOREIGN KEY ("paidTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "TaxGuide" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxGuide" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "TaxGuide"
FOR ALL
USING ("workspaceId" = NULLIF(current_setting('app.current_workspace_id', true), '')::int)
WITH CHECK ("workspaceId" = NULLIF(current_setting('app.current_workspace_id', true), '')::int);
