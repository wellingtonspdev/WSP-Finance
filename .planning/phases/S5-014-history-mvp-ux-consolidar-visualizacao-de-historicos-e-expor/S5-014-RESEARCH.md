# S5-014 Research - Export History MVP

## RESEARCH COMPLETE

**Phase:** S5-014 - [HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes
**Date:** 2026-06-01

## Scope Read

S5-014 should expose a consolidated view of previous accounting exports from existing `ExportArchive` rows, reuse the current download route, and avoid touching `ExportService` generation, Domínio formatting, encoding, validation, multi-ERP, NFS-e, TaxGuide, or PGDAS.

## Current Backend Surface

- `ExportArchive` exists in `backend/prisma/schema.prisma` with fields needed for the UI: period, layout, target system, file name, hash, record count, warnings count, creator relation, and creation date.
- Migration `20260521003759_add_export_archive` already added RLS, `FORCE ROW LEVEL SECURITY`, workspace indexes, and useful ordering/filter indexes.
- `ExportArchiveService.archiveAndLog()` already writes archive metadata and safe audit state. It must not be reworked for this phase.
- `ExportArchiveService.getDownloadUrl()` already does tenant-scoped lookup by `archiveId + workspaceId`, validates canonical object keys, caps TTL, and returns safe response metadata without `objectKey`, bucket, or raw storage details.
- `ExportDownloadController` and route `GET /workspaces/:workspaceId/exports/:archiveId/download` already use the workspace route-param pattern and `RbacMiddleware('ACCOUNTANT')`.

## Current Frontend Surface

- `TransactionHistoryPage` already owns the Extract screen, filter strip, transaction list, and `Exportar Dominio` button.
- The existing export UI gate is `activeMembership?.type === 'BUSINESS' && (role === 'OWNER' || role === 'ACCOUNTANT')`.
- `ExportDominioModal` and `useExportDominio` already define friendly export errors and the CTA flow.
- `frontend/src/features/transactions/api/exportDominio.ts` is the natural API helper location for history list and re-download helpers.
- Existing frontend tests for export live in `frontend/tests/features/transactions/ExportDominioModal.test.tsx` and already render `TransactionHistoryPage` with mocked workspace store and mocked export API.

## Recommended Plan Shape

Use two plans:

1. Backend API and service list method.
2. Frontend inline history cards and re-download behavior.

This keeps tenant/RBAC proof separate from UI rendering, while preserving the phase's end-to-end UX outcome.

## Backend Implementation Notes

- Add a list method to `ExportArchiveService`, for example `listByWorkspace(workspaceId: number)`.
- Use the RLS-aware `prisma` client, not `sysPrisma`.
- Query only `workspaceId` scoped archives and include only safe creator fields, preferably `createdByUser: { select: { id, name, email } }`.
- Return a DTO that excludes `objectKey`, bucket, raw file contents, raw storage details, and provider errors.
- Order by `createdAt desc`.
- Route should be `GET /workspaces/:workspaceId/exports` and reuse `AuthMiddleware`, `WorkspaceRouteParamGuard`, `WorkspaceMiddleware`, and `RbacMiddleware('ACCOUNTANT')`.
- Cross-tenant behavior should be proven through the same route-param/header guard pattern and service RLS tests.

## Frontend Implementation Notes

- Keep the UI inside `TransactionHistoryPage`.
- Add a `Historico` button next to `Exportar Dominio` using the same gate.
- Keep history collapsed by default and render inline below filters when opened.
- Render compact cards, not tables.
- Always show period, layout, generated date, status, `recordCount`, `warningsCount`, and download action.
- Put responsible user and hash in expandable details.
- Show hash truncated with copy-full-hash action.
- Empty state should show a simple message and CTA to open `Exportar Dominio`.
- `403` should render an in-panel permission message: `Voce nao tem permissao para ver exportacoes deste workspace.`

## Test Strategy

Backend:
- Service list returns only records for the requested workspace.
- Service/RLS proof keeps tenant B from reading tenant A archives through `applicationClient`/tenant context.
- Route permits OWNER and ACCOUNTANT, denies EDITOR/VIEWER/non-member, and blocks divergent `x-workspace-id`.
- Response never includes `objectKey`, bucket, buffer, base64, path, or raw storage data.

Frontend:
- `TransactionHistoryPage` renders `Historico` for BUSINESS OWNER/ACCOUNTANT only.
- Clicking `Historico` shows inline cards below filters.
- Cards show required fields and expandable user/hash details.
- Empty state shows CTA to `Exportar Dominio`.
- `403` renders the permission message.
- Re-download calls the existing workspace download route through a frontend helper and triggers browser navigation/download using the returned URL.

## Risks

- Do not expose `objectKey` while adding list DTOs.
- Do not accidentally use `sysPrisma` for workspace list paths.
- Do not add a second download route.
- Do not hide OWNER from history when the existing UI gate allows OWNER to export.
- Do not let frontend tests pass with mock-only proof for tenant isolation; backend needs service/route coverage too.
