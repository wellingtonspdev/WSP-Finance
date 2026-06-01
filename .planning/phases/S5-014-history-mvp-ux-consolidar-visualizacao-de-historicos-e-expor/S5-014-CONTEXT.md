# Phase S5-014: [HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes - Context

**Gathered:** 2026-06-01T02:30:27.2957517-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a consolidated export-history view for existing `ExportArchive` records, surfaced inside the current transaction extract experience. It must reuse the existing archive/download infrastructure, add a tenant-safe history listing path, and avoid reopening `ExportService`, Domínio layout generation, encoding, validation, multi-ERP, NFS-e, TaxGuide, or PGDAS scope.

</domain>

<decisions>
## Implementation Decisions

### Tela e fluxo
- **D-01:** Keep export history inside `TransactionHistoryPage`, not a new dedicated route for this MVP.
- **D-02:** Add a `Historico` button next to the existing `Exportar Dominio` button.
- **D-03:** Clicking `Historico` shows an inline list below the filters and above the transaction list.
- **D-04:** The export-history list is collapsed by default and the `Historico` button toggles show/hide.

### Dados exibidos
- **D-05:** Render each export as a compact card, not a table.
- **D-06:** Always show period, layout, generation date, status, `recordCount`, `warningsCount`, and download action.
- **D-07:** Put responsible user and hash in expandable details.
- **D-08:** Display the hash truncated, with an action to copy the full hash.

### Acesso e workspace
- **D-09:** Show the `Historico` button using the same UI gate as `Exportar Dominio`: `BUSINESS` workspace plus `OWNER` or `ACCOUNTANT`.
- **D-10:** If the history API returns `403`, show a short in-panel permission message: `Voce nao tem permissao para ver exportacoes deste workspace.`
- **D-11:** Empty state shows a simple message plus CTA to `Exportar Dominio`.
- **D-12:** Add the backend listing endpoint as a workspace route: `GET /workspaces/:workspaceId/exports`, using `WorkspaceRouteParamGuard`, `WorkspaceMiddleware`, and `RbacMiddleware('ACCOUNTANT')`.

### the agent's Discretion
- Exact card copy, icon choice, date formatting, query key naming, and loading skeleton may follow existing frontend patterns.
- Backend DTO field names may follow Prisma names where safe, but must not expose `objectKey`, bucket names, storage internals, raw file content, or raw provider errors.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` - Registered S5-014 phase boundary, dependency, scope, out-of-scope items, likely files, and success criteria.
- `AGENTS.md` - Repository workflow, Reversa/GSD rules, RBAC/RLS/LGPD invariants, selective Git rules, and validation expectations.

### Backend export archive and download
- `backend/src/services/ExportArchiveService.ts` - Existing archive persistence, audit-safe metadata, tenant-scoped `getDownloadUrl`, and storage safety invariants.
- `backend/src/controllers/ExportDownloadController.ts` - Existing safe download response shape and route-param workspace checks.
- `backend/src/controllers/ExportController.ts` - Existing export generation flow that creates archives; do not rebuild generation logic.
- `backend/src/routes.ts` - Existing `/export/validate`, `/export/generate`, and `/workspaces/:workspaceId/exports/:archiveId/download` route/middleware patterns.
- `backend/prisma/schema.prisma` - `ExportArchive` model, relations, and available fields.
- `backend/prisma/migrations/20260521003759_add_export_archive/migration.sql` - Existing `ExportArchive` indexes and RLS policy.

### Frontend transaction/export UI
- `frontend/src/features/transactions/pages/TransactionHistoryPage.tsx` - Target page for inline history UI and existing `Exportar Dominio` button gate.
- `frontend/src/features/transactions/components/ExportDominioModal.tsx` - Existing export modal pattern and CTA target.
- `frontend/src/features/transactions/hooks/useExportDominio.ts` - Existing export flow state/error handling patterns.
- `frontend/src/features/transactions/api/exportDominio.ts` - Existing export API helper location to mirror or extend for history/download.

### Tests
- `backend/tests/services/ExportArchiveService.test.ts` - Existing archive/RLS service tests.
- `backend/tests/services/ExportArchiveService.download.test.ts` - Existing download service tests and secure response expectations.
- `backend/tests/controllers/ExportDownloadController.test.ts` - Existing guarded download route/controller behavior.
- `frontend/tests/features/transactions/ExportDominioModal.test.tsx` - Existing frontend export tests and modal assertions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TransactionHistoryPage` already owns the extract UI, filter strip, transaction list, and `Exportar Dominio` button.
- `ExportDominioModal` and `useExportDominio` provide existing export CTA and error language patterns.
- `ExportArchiveService.getDownloadUrl` already returns safe download metadata without exposing storage internals.

### Established Patterns
- Workspace-scoped frontend API calls rely on the URL-derived workspace id and Axios `x-workspace-id` injection.
- Backend workspace routes should chain `AuthMiddleware`, `WorkspaceRouteParamGuard`, `WorkspaceMiddleware`, and role middleware when a route param carries workspace identity.
- Tenant-sensitive backend paths must use the RLS-aware `prisma` client from `backend/src/lib/prisma.ts`, not `sysPrisma`.
- Export download RBAC currently uses `RbacMiddleware('ACCOUNTANT')`; listing should align with this permission level.

### Integration Points
- Add list behavior in `ExportArchiveService` or a narrowly scoped service method that queries `ExportArchive` by `workspaceId`.
- Add a controller method and route for `GET /workspaces/:workspaceId/exports`.
- Add a frontend API/hook for export history and re-download.
- Add inline collapsed cards to `TransactionHistoryPage` near the existing export controls.

</code_context>

<specifics>
## Specific Ideas

- Keep the history experience visible in the MVP/demo by placing it in the existing extract screen rather than a new route.
- Use compact cards to stay mobile-first and avoid cramped tables.
- Keep hash available for audit but visually secondary through truncation and copy action.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: S5-014-[HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes*
*Context gathered: 2026-06-01T02:30:27.2957517-03:00*
