-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "balanceBefore" DECIMAL(19,4),
ADD COLUMN "balanceAfter" DECIMAL(19,4),
ADD COLUMN "delta" DECIMAL(19,4),
ADD COLUMN "fromAccount" INTEGER,
ADD COLUMN "toAccount" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_fromAccount_idx" ON "AuditLog"("fromAccount");

-- CreateIndex
CREATE INDEX "AuditLog_toAccount_idx" ON "AuditLog"("toAccount");

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_fromAccount_fkey"
FOREIGN KEY ("fromAccount") REFERENCES "Account"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_toAccount_fkey"
FOREIGN KEY ("toAccount") REFERENCES "Account"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
