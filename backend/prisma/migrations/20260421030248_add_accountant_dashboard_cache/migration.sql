-- CreateTable
CREATE TABLE "AccountantDashboardCache" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "totalBalance" DECIMAL(19,4) NOT NULL,
    "pendingMovements" INTEGER NOT NULL DEFAULT 0,
    "missingAttachments" INTEGER NOT NULL DEFAULT 0,
    "cashRiskAlert" BOOLEAN NOT NULL DEFAULT false,
    "certificateExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountantDashboardCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountantDashboardCache_userId_idx" ON "AccountantDashboardCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountantDashboardCache_userId_workspaceId_key" ON "AccountantDashboardCache"("userId", "workspaceId");
