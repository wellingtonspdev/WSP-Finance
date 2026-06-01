---
phase: S5-014
plan: 02
title: Frontend Inline Export History
status: complete
type: execution-summary
---

# S5-014-02 Summary - Frontend Inline Export History

## Result

Implemented.

## Changes

- Added export-history DTOs and frontend API helpers for list and re-download URL.
- Added `useExportHistory` with lazy loading, 403 mapping, and download URL navigation.
- Added compact inline `ExportHistoryList` with loading, error, empty, card, details, truncated hash, copy hash, and download states.
- Wired `TransactionHistoryPage` to show `Historico` beside `Exportar Dominio` for BUSINESS OWNER/ACCOUNTANT only.
- Extended frontend tests for visibility gates, collapsed default state, empty state, populated card rendering, 403 message, and download helper call.

## Files

- `frontend/src/features/transactions/types/export.ts`
- `frontend/src/features/transactions/api/exportDominio.ts`
- `frontend/src/features/transactions/hooks/useExportHistory.ts`
- `frontend/src/features/transactions/components/ExportHistoryList.tsx`
- `frontend/src/features/transactions/pages/TransactionHistoryPage.tsx`
- `frontend/tests/features/transactions/ExportDominioModal.test.tsx`

## Verification

- `cd frontend; pnpm test -- tests/features/transactions/ExportDominioModal.test.tsx` - passed, 25 tests
- `cd frontend; pnpm run build` - passed

## Deviations

- The first frontend test/build attempts hit Windows sandbox `spawn EPERM`; reruns outside the sandbox passed.
- The focused frontend test logs a jsdom navigation warning when simulating re-download URL navigation, but the suite passes and the helper call is asserted.
