-- Remove any orphan rows before the new constraints are enforced.
DELETE FROM "AccountantDashboardCache" AS cache
WHERE NOT EXISTS (
    SELECT 1
    FROM "User" AS u
    WHERE u."id" = cache."userId"
);

DELETE FROM "AccountantDashboardCache" AS cache
WHERE NOT EXISTS (
    SELECT 1
    FROM "Workspace" AS w
    WHERE w."id" = cache."workspaceId"
);

-- Add the missing workspace lookup index for maintenance and joins.
CREATE INDEX "AccountantDashboardCache_workspaceId_idx"
ON "AccountantDashboardCache"("workspaceId");

-- Keep the cache structurally tied to its owners.
ALTER TABLE "AccountantDashboardCache"
ADD CONSTRAINT "AccountantDashboardCache_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "AccountantDashboardCache"
ADD CONSTRAINT "AccountantDashboardCache_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
