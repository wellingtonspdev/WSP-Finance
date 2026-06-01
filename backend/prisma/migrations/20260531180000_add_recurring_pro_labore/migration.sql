CREATE TYPE "RecurringProLaborePendingStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE "RecurringProLaboreSchedule" (
    "id" TEXT NOT NULL,
    "sourceWorkspaceId" INTEGER NOT NULL,
    "destinationWorkspaceId" INTEGER NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" INTEGER NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringProLaboreSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringProLaborePending" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "competence" TIMESTAMP(3) NOT NULL,
    "status" "RecurringProLaborePendingStatus" NOT NULL DEFAULT 'PENDING',
    "bridgeId" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingByUserId" INTEGER,
    "confirmedByUserId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "cancelledByUserId" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringProLaborePending_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringProLaboreSchedule_sourceWorkspaceId_idx" ON "RecurringProLaboreSchedule"("sourceWorkspaceId");
CREATE INDEX "RecurringProLaboreSchedule_destinationWorkspaceId_idx" ON "RecurringProLaboreSchedule"("destinationWorkspaceId");
CREATE INDEX "RecurringProLaboreSchedule_isActive_dayOfMonth_idx" ON "RecurringProLaboreSchedule"("isActive", "dayOfMonth");
CREATE INDEX "RecurringProLaboreSchedule_createdByUserId_idx" ON "RecurringProLaboreSchedule"("createdByUserId");

CREATE UNIQUE INDEX "RecurringProLaborePending_bridgeId_key" ON "RecurringProLaborePending"("bridgeId");
CREATE UNIQUE INDEX "RecurringProLaborePending_scheduleId_competence_key" ON "RecurringProLaborePending"("scheduleId", "competence");
CREATE INDEX "RecurringProLaborePending_status_competence_idx" ON "RecurringProLaborePending"("status", "competence");
CREATE INDEX "RecurringProLaborePending_processingByUserId_idx" ON "RecurringProLaborePending"("processingByUserId");
CREATE INDEX "RecurringProLaborePending_confirmedByUserId_idx" ON "RecurringProLaborePending"("confirmedByUserId");
CREATE INDEX "RecurringProLaborePending_cancelledByUserId_idx" ON "RecurringProLaborePending"("cancelledByUserId");

ALTER TABLE "RecurringProLaboreSchedule"
  ADD CONSTRAINT "RecurringProLaboreSchedule_sourceWorkspaceId_fkey"
  FOREIGN KEY ("sourceWorkspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaboreSchedule"
  ADD CONSTRAINT "RecurringProLaboreSchedule_destinationWorkspaceId_fkey"
  FOREIGN KEY ("destinationWorkspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaboreSchedule"
  ADD CONSTRAINT "RecurringProLaboreSchedule_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaborePending"
  ADD CONSTRAINT "RecurringProLaborePending_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "RecurringProLaboreSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaborePending"
  ADD CONSTRAINT "RecurringProLaborePending_processingByUserId_fkey"
  FOREIGN KEY ("processingByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaborePending"
  ADD CONSTRAINT "RecurringProLaborePending_confirmedByUserId_fkey"
  FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringProLaborePending"
  ADD CONSTRAINT "RecurringProLaborePending_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
