-- AlterTable
ALTER TABLE "AccountantDashboardCache" ADD COLUMN     "certificateExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "certificateExpiresAt" TIMESTAMP(3),
ADD COLUMN     "certificateObjectKey" TEXT;
