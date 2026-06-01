-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'OCR_INGESTION';
ALTER TYPE "AuditAction" ADD VALUE 'OCR_CONFIRMATION';
ALTER TYPE "AuditAction" ADD VALUE 'OCR_CANCELLATION';
ALTER TYPE "AuditAction" ADD VALUE 'TELEGRAM_LINK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TELEGRAM_LINK_REVOKED';

-- AlterEnum
ALTER TYPE "MovementSource" ADD VALUE 'TELEGRAM_OCR';

-- CreateTable
CREATE TABLE "TelegramUserLink" (
    "id" TEXT NOT NULL,
    "telegramChatIdHash" TEXT NOT NULL,
    "telegramUserIdHash" TEXT,
    "telegramUsername" TEXT,
    "userId" INTEGER NOT NULL,
    "activeDestinationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramUserLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramDestination" (
    "id" TEXT NOT NULL,
    "telegramUserLinkId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "defaultExpenseCategoryId" INTEGER,
    "defaultIncomeCategoryId" INTEGER,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "userId" INTEGER NOT NULL,
    "defaultWorkspaceId" INTEGER,
    "defaultAccountId" INTEGER,
    "defaultExpenseCategoryId" INTEGER,
    "defaultIncomeCategoryId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramOcrDraft" (
    "id" TEXT NOT NULL,
    "telegramChatIdHash" TEXT NOT NULL,
    "telegramUserIdHash" TEXT,
    "userId" INTEGER NOT NULL,
    "extractedData" JSONB NOT NULL,
    "fileId" TEXT,
    "workspaceId" INTEGER,
    "accountId" INTEGER,
    "categoryId" INTEGER,
    "step" TEXT NOT NULL DEFAULT 'AWAITING_WORKSPACE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramOcrDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramUserLink_telegramChatIdHash_idx" ON "TelegramUserLink"("telegramChatIdHash");

-- CreateIndex
CREATE INDEX "TelegramUserLink_telegramUserIdHash_idx" ON "TelegramUserLink"("telegramUserIdHash");

-- CreateIndex
CREATE INDEX "TelegramUserLink_userId_idx" ON "TelegramUserLink"("userId");

-- CreateIndex
CREATE INDEX "TelegramUserLink_status_idx" ON "TelegramUserLink"("status");

-- CreateIndex
CREATE INDEX "TelegramDestination_telegramUserLinkId_idx" ON "TelegramDestination"("telegramUserLinkId");

-- CreateIndex
CREATE INDEX "TelegramDestination_userId_idx" ON "TelegramDestination"("userId");

-- CreateIndex
CREATE INDEX "TelegramDestination_workspaceId_idx" ON "TelegramDestination"("workspaceId");

-- CreateIndex
CREATE INDEX "TelegramDestination_status_idx" ON "TelegramDestination"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_codeHash_key" ON "TelegramLinkToken"("codeHash");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_userId_idx" ON "TelegramLinkToken"("userId");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramOcrDraft_telegramChatIdHash_idx" ON "TelegramOcrDraft"("telegramChatIdHash");

-- CreateIndex
CREATE INDEX "TelegramOcrDraft_userId_idx" ON "TelegramOcrDraft"("userId");

-- CreateIndex
CREATE INDEX "TelegramOcrDraft_status_idx" ON "TelegramOcrDraft"("status");

-- AddForeignKey
ALTER TABLE "TelegramDestination" ADD CONSTRAINT "TelegramDestination_telegramUserLinkId_fkey" FOREIGN KEY ("telegramUserLinkId") REFERENCES "TelegramUserLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
