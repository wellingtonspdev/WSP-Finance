-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'CATEGORY_UPDATE';

-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'ACCOUNTANT';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "workspaceId" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "attachmentSize" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_attachmentSize_idx" ON "Transaction"("workspaceId", "attachmentSize");
