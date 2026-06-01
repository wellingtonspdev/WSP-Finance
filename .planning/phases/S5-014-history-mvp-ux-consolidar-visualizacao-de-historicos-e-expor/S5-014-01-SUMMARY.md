---
phase: S5-014
plan: 01
title: Backend Export History API
status: complete
type: execution-summary
---

# S5-014-01 Summary - Backend Export History API

## Result

Implemented.

## Changes

- Added `ExportArchiveService.listByWorkspace()` returning safe export-history metadata scoped by workspace.
- Added `ExportHistoryController` for `GET /workspaces/:workspaceId/exports`.
- Registered the history route with auth, workspace guard, workspace middleware, and `RbacMiddleware('ACCOUNTANT')`.
- Added service tests for workspace filtering, ordering, safe DTO shape, and RLS proof.
- Added controller tests for OWNER, ACCOUNTANT, denied roles, invalid workspace id, non-member, divergent header, missing token, and storage-internal leakage.

## Files

- `backend/src/services/ExportArchiveService.ts`
- `backend/src/controllers/ExportHistoryController.ts`
- `backend/src/routes.ts`
- `backend/tests/services/ExportArchiveService.history.test.ts`
- `backend/tests/controllers/ExportHistoryController.test.ts`

## Verification

- `cd backend; .\node_modules\.bin\prisma.CMD validate` - passed
- `cd backend; pnpm exec tsc --noEmit` - passed
- `cd backend; pnpm test -- tests/services/ExportArchiveService.history.test.ts tests/controllers/ExportHistoryController.test.ts tests/controllers/ExportDownloadController.test.ts` - passed, 28 tests

## Deviations

- Used `.\node_modules\.bin\prisma.CMD validate` because direct `pnpm exec prisma validate` was unreliable in this Windows shell.
- No backend schema migration was needed.
