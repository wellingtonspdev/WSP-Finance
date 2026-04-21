-- CreateTable
CREATE TABLE "AccountantDashboardCache" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "pendingMovements" INTEGER NOT NULL DEFAULT 0,
    "missingAttachments" INTEGER NOT NULL DEFAULT 0,
    "cashRiskAlert" BOOLEAN NOT NULL DEFAULT false,
    "certificateExpiresAt" TIMESTAMP(3),
    "totalBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountantDashboardCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountantDashboardCache_userId_idx" ON "AccountantDashboardCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountantDashboardCache_userId_workspaceId_key" ON "AccountantDashboardCache"("userId", "workspaceId");
