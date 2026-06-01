# Phase S5-015A: [FISCAL/MVP][FEATURE] Criar TaxGuide para DAS/DAS-MEI como obrigacao financeira - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers backend `TaxGuide` management for DAS/DAS-MEI obligations in BUSINESS workspaces: model, service, controller, REST routes, PDF uploads, optional link to an existing paid `Transaction`, overdue status behavior, RBAC, and safe AuditLog metadata. It does not calculate taxes, generate DAS, transmit to government systems, or create/alter `Transaction` records.

</domain>

<decisions>
## Implementation Decisions

### Modelo fiscal
- **D-01:** `TaxGuide.workspaceId` must follow the current project contract for `Workspace.id`: number/int. The issue text listing `workspaceId: string` is treated as a typing mistake.
- **D-02:** `TaxGuide` is BUSINESS-workspace only. Any create/list/update/upload/payment action in a PERSONAL workspace must return `403 Forbidden`.
- **D-03:** Competence is stored as required `competenceMonth` and `competenceYear`.
- **D-04:** Enforce uniqueness for `workspaceId + type + competenceMonth + competenceYear`, preventing duplicate DAS/DAS-MEI guides for the same competence and workspace.
- **D-05:** Create always starts as `PENDING`. `PAID`, `OVERDUE`, and `CANCELLED` are reached only through later actions or rules.

### Pagamento e vinculo
- **D-06:** `status = PAID` requires `paidTransactionId`.
- **D-07:** `paidTransactionId` must point to an existing `Transaction` in the same workspace.
- **D-08:** The linked `Transaction` must already represent an effective payment. `TaxGuide` must not create, mutate, or rebalance `Transaction`.
- **D-09:** Only `OWNER` can mark a guide as paid, attach `paidTransactionId`, or cancel a guide.
- **D-10:** `ACCOUNTANT` can create guides and attach PDFs/proofs, but cannot mark as paid, link a transaction, cancel, or create a transaction.
- **D-11:** `VIEWER` cannot mutate `TaxGuide`.

### Uploads e status
- **D-12:** Guide PDF and payment proof uploads must reuse the existing storage provider abstraction. Do not create a parallel local-only upload path.
- **D-13:** Persist only `guideFileObjectKey` and `paymentProofObjectKey` in `TaxGuide`; do not store raw files in the database.
- **D-14:** Uploads accept PDF only, with an explicit size limit and safe MIME/extension/signature validation where supported by existing code.
- **D-15:** `OVERDUE` must be calculated for read/list responses so clients see correct status without relying on cron.
- **D-16:** A service command may persist overdue transitions when needed, but cron is not required for this phase.
- **D-17:** AuditLog must record only safe metadata: action, `taxGuideId`, `workspaceId`, file type, object key or hash when safe, and old/new status. Never log raw PDF, sensitive raw payload, original filename if it may contain PII, or full request body.

### the agent's Discretion
No "you decide" choices were delegated. Planner/researcher should follow decisions above and existing backend patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning and scope
- `.planning/ROADMAP.md` - Phase S5-015A goal, scope, out-of-scope items, likely files, and success criteria.
- `.planning/PROJECT.md` - Core project value, tenant-safety constraints, and current repo workflow notes.
- `.planning/REQUIREMENTS.md` - Existing project ID/tax/transaction constraints that still apply where relevant.
- `AGENTS.md` - Mandatory Reversa/GSD workflow, RBAC/RLS/LGPD constraints, no direct implementation before planning, no `git add .`, and ID rules.

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` - Backend route/controller/service/repository/RLS architecture, storage provider abstraction, AuditLog and tenant context patterns.
- `.planning/codebase/STRUCTURE.md` - Where to add backend model, service, controller, route, repository, migration, and tests.
- `.planning/codebase/TESTING.md` - Test layout and guidance for service, route, integration, RLS, and audit/security tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/routes.ts`: central route registration and middleware ordering for auth, workspace, RBAC, upload, export, and finance endpoints.
- `backend/src/middlewares/AuthMiddleware.ts`, `backend/src/middlewares/WorkspaceMiddleware.ts`, `backend/src/middlewares/RbacMiddleware.ts`: required route chain for workspace-scoped RBAC/RLS behavior.
- `backend/src/lib/prisma.ts` and `backend/src/lib/tenantContext.ts`: RLS-aware Prisma access and per-request tenant context.
- `backend/src/services/AuditLogService.ts`: safe audit side effects should follow existing patterns and avoid sensitive payloads.
- `backend/src/providers/IStorageProvider.ts`, `backend/src/providers/S3StorageProvider.ts`, `backend/src/providers/LocalStorageProvider.ts`: preferred storage abstraction for guide/proof files.
- `backend/src/services/TransactionService.ts` and `backend/src/repositories/TransactionRepository.ts`: reference for validating existing transactions without creating or mutating them.

### Established Patterns
- Workspace-scoped APIs must use `AuthMiddleware` + `WorkspaceMiddleware` and should rely on the RLS-aware `prisma` client, not `sysPrisma`.
- Financial mutations belong in service classes, with repositories for Prisma query wrappers when persistence becomes non-trivial.
- Money values must use Prisma `Decimal`/decimal-safe handling, not plain JavaScript number arithmetic for persisted monetary fields.
- Tenant isolation and cross-workspace denial need real boundary tests where possible, not mock-only coverage.
- Sensitive files and payloads must not be persisted in AuditLog or logs.

### Integration Points
- Prisma schema and migration for `TaxGuide`, enums, indexes, relation to `Workspace`, optional relation to `Transaction`, and creator user reference.
- REST endpoints under existing workspace-scoped route conventions.
- Upload endpoints should connect to existing storage provider/factory patterns and save only object keys on `TaxGuide`.
- Tests should cover service rules, route/RBAC behavior, cross-tenant blocking, PERSONAL workspace blocking, storage metadata persistence, overdue calculation, and safe AuditLog payloads.

</code_context>

<specifics>
## Specific Ideas

- Treat the user-provided `workspaceId: string` field as a phase-spec typo because repository rules preserve `Workspace.id` as number.
- Keep `Transaction` as ledger authority and do not let TaxGuide become a transaction creation shortcut.
- `ACCOUNTANT` has operational permission for guide creation and file attachment, but payment/cancel authority remains OWNER-only.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: S5-015A-[FISCAL/MVP][FEATURE] Criar TaxGuide para DAS/DAS-MEI como obrigacao financeira*
*Context gathered: 2026-06-01*
