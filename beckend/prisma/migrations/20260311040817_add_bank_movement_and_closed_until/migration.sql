-- CreateEnum
CREATE TYPE "MovementSource" AS ENUM ('OFX', 'OPEN_FINANCE', 'OCR', 'MANUAL');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PASSPORT';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "closedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BankMovement" (
    "id" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "source" "MovementSource" NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'PENDING',
    "fitid" TEXT,
    "hashDeduplication" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankMovement_workspaceId_status_idx" ON "BankMovement"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankMovement_workspaceId_fitid_key" ON "BankMovement"("workspaceId", "fitid");

-- CreateIndex
CREATE UNIQUE INDEX "BankMovement_workspaceId_hashDeduplication_key" ON "BankMovement"("workspaceId", "hashDeduplication");

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ativar RLS
ALTER TABLE "BankMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankMovement" FORCE ROW LEVEL SECURITY;

-- Política de RLS
CREATE POLICY "tenant_isolation_policy" ON "BankMovement"
FOR ALL
USING ("workspaceId" = current_setting('app.current_workspace_id', true)::int)
WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true)::int);
