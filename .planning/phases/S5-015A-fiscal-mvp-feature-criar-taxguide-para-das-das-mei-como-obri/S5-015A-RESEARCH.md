# Phase S5-015A: TaxGuide DAS/DAS-MEI - Research

**Researched:** 2026-06-01  
**Researcher:** Vini Jr  
**Domain:** Backend fiscal obligation management, workspace tenancy, RBAC, storage uploads, audit safety  
**Confidence:** HIGH for existing code patterns; MEDIUM for exact migration/RLS SQL until migration is generated and validated

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Modelo fiscal
- **D-01:** `TaxGuide.workspaceId` must follow the current project contract for `Workspace.id`: number/int. The issue text listing `workspaceId: string` is treated as a typing mistake.
- **D-02:** `TaxGuide` is BUSINESS-workspace only. Any create/list/update/upload/payment action in a PERSONAL workspace must return `403 Forbidden`.
- **D-03:** Competence is stored as required `competenceMonth` and `competenceYear`.
- **D-04:** Enforce uniqueness for `workspaceId + type + competenceMonth + competenceYear`, preventing duplicate DAS/DAS-MEI guides for the same competence and workspace.
- **D-05:** Create always starts as `PENDING`. `PAID`, `OVERDUE`, and `CANCELLED` are reached only through later actions or rules.
- **D-06:** `status = PAID` requires `paidTransactionId`.
- **D-07:** `paidTransactionId` must point to an existing `Transaction` in the same workspace.
- **D-08:** The linked `Transaction` must already represent an effective payment. `TaxGuide` must not create, mutate, or rebalance `Transaction`.
- **D-09:** Only `OWNER` can mark a guide as paid, attach `paidTransactionId`, or cancel a guide.
- **D-10:** `ACCOUNTANT` can create guides and attach PDFs/proofs, but cannot mark as paid, link a transaction, cancel, or create a transaction.
- **D-11:** `VIEWER` cannot mutate `TaxGuide`.
- **D-12:** Guide PDF and payment proof uploads must reuse the existing storage provider abstraction. Do not create a parallel local-only upload path.
- **D-13:** Persist only `guideFileObjectKey` and `paymentProofObjectKey` in `TaxGuide`; do not store raw files in the database.
- **D-14:** Uploads accept PDF only, with an explicit size limit and safe MIME/extension/signature validation where supported by existing code.
- **D-15:** `OVERDUE` must be calculated for read/list responses so clients see correct status without relying on cron.
- **D-16:** A service command may persist overdue transitions when needed, but cron is not required for this phase.
- **D-17:** AuditLog must record only safe metadata: action, `taxGuideId`, `workspaceId`, file type, object key or hash when safe, and old/new status. Never log raw PDF, sensitive raw payload, original filename if it may contain PII, or full request body.

### the agent's Discretion

No "you decide" choices were delegated. Planner/researcher should follow decisions above and existing backend patterns.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.

## Summary

S5-015A should be implemented as a backend-only workspace-scoped financial obligation feature. The existing architecture already has the needed primitives: Express route chains in `backend/src/routes.ts`, `WorkspaceMiddleware` for membership and tenant context, `RbacMiddleware` for route-level role gates, Prisma models with integer `Workspace.id` and UUID `Transaction.id`, storage provider abstractions, and `AuditLogService` with synchronous transaction-aware inserts. [VERIFIED: codebase grep]

The safest design is a new `TaxGuide` Prisma model plus `TaxGuideService`, `TaxGuideRepository`, `TaxGuideController`, and focused tests. Do not add a frontend route in this phase. Do not create or mutate `Transaction`; payment marking only validates and links an existing same-workspace paid/effective transaction. [VERIFIED: S5-015A-CONTEXT.md]

**Primary recommendation:** implement in small backend TDD slices: schema/RLS, service domain rules, HTTP/RBAC routes, upload provider integration, audit safety, then DB-backed tenant/RLS proof. [VERIFIED: codebase TESTING.md]

## Project Constraints (from AGENTS.md)

- Use conventional commits if commits are later authorized. [VERIFIED: AGENTS.md]
- Do not implement directly before correct planning/TDD workflow. This research must stay read/write-docs-only. [VERIFIED: AGENTS.md]
- Never use `git add .`, `git reset --hard`, `git clean -fd`, or stage/commit/push without explicit authorization. [VERIFIED: AGENTS.md]
- Preserve RLS/RBAC/LGPD and tenant isolation. [VERIFIED: AGENTS.md]
- Never use `sysPrisma` by convenience and never use `managementClient` in production code. [VERIFIED: AGENTS.md]
- Never create `Transaction` directly from OCR/Telegram, and for this phase never create `Transaction` from `TaxGuide`. [VERIFIED: AGENTS.md/S5-015A-CONTEXT.md]
- Never save PII, raw OCR, raw PDF, TXT bruto, full request bodies, or sensitive payloads in logs/AuditLog. [VERIFIED: AGENTS.md]
- Keep ID contracts: `Transaction.id` is string UUID; `Account.id` and `Workspace.id` are numbers. [VERIFIED: AGENTS.md/backend/prisma/schema.prisma]
- Before finishing backend implementation later, run at minimum: `git branch --show-current`, `git status --short -uall`, `git diff --stat`, `git diff --check`, `cd backend && pnpm exec prisma validate`, `cd backend && pnpm exec tsc --noEmit`, and focused `pnpm test -- ...`. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| TaxGuide persistence and uniqueness | Database / Storage | API / Backend | Prisma schema owns IDs, relations, enum values, unique constraints, indexes, and RLS migration behavior. [VERIFIED: backend/prisma/schema.prisma] |
| Business-only and status rules | API / Backend | Database / Storage | Service layer should enforce workspace type, payment linkage, cancellation, and overdue projection. [VERIFIED: TransactionService pattern] |
| RBAC mutation policy | API / Backend | Database / Storage | Routes/middlewares block role classes before controller/service, with service checks as defense in depth. [VERIFIED: RbacMiddleware.ts] |
| Guide/proof PDF upload | API / Backend | CDN / Static Storage | Backend validates file and uses `IStorageProvider`; storage keeps object bytes, DB keeps object keys only. [VERIFIED: IStorageProvider.ts/ExportArchiveService.ts] |
| Audit trail | API / Backend | Database / Storage | `AuditLogService.logSync` inserts safe metadata within service transactions. [VERIFIED: AuditLogService.ts] |
| Optional payment transaction link | API / Backend | Database / Storage | Service validates existing same-workspace `Transaction` but must not write to `Transaction`. [VERIFIED: S5-015A-CONTEXT.md] |

## Existing Patterns to Reuse

### Schema

- `Workspace.id` is `Int @id @default(autoincrement())`; `TaxGuide.workspaceId` must be `Int`. [VERIFIED: backend/prisma/schema.prisma]
- `Transaction.id` is `String @id @default(uuid())`; `TaxGuide.paidTransactionId` must be nullable `String?`. [VERIFIED: backend/prisma/schema.prisma]
- Workspace-owned models use `workspaceId Int`, relation to `Workspace`, `@@index([workspaceId, ...])`, and tenant-scoped unique constraints where appropriate. `ExportArchive` is the closest metadata/file-owned precedent. [VERIFIED: backend/prisma/schema.prisma]
- Add enums `TaxGuideType { DAS DAS_MEI }` and `TaxGuideStatus { PENDING PAID OVERDUE CANCELLED }`; do not reuse `TransactionStatus` because semantics differ. [ASSUMED]
- Add `Workspace.taxGuides TaxGuide[]`, optional `Transaction.taxGuidesPaid TaxGuide[]`, and `User.taxGuidesCreated TaxGuide[]` relations with explicit relation names where needed. [ASSUMED]

### Routes and Controllers

- Workspace-scoped routes should use `AuthMiddleware, WorkspaceMiddleware` first, then role-specific gate when a whole endpoint has a single minimum role. [VERIFIED: backend/src/routes.ts]
- Existing route examples:
  - `/transactions` uses `AuthMiddleware, WorkspaceMiddleware, FinancialMutationRbacMiddleware()` before create/delete. [VERIFIED: backend/src/routes.ts]
  - `/workspaces/:workspaceId/exports` uses `AuthMiddleware, WorkspaceMiddleware, RbacMiddleware('ACCOUNTANT')` and validates route param against `req.workspaceId`. [VERIFIED: ExportHistoryController.ts]
- `TaxGuideController` should parse body/query/params with `zod`, take `workspaceId` from `req.workspaceId`, and map known `AppError`/domain errors to `400/403/404/409`. [VERIFIED: TransactionController.ts + AppError.ts]

### Services and Repositories

- Follow class-based services and repositories. `TransactionService` owns business rules and uses repositories for persistence. [VERIFIED: TransactionService.ts]
- Use `prisma` from `backend/src/lib/prisma.ts` for application paths; do not instantiate Prisma and do not use `sysPrisma` in `TaxGuideService`. [VERIFIED: ARCHITECTURE.md]
- Use Prisma `Decimal` for `amount`/`value`; avoid JS number arithmetic for money. [VERIFIED: TransactionService.ts/backend/prisma/schema.prisma]
- For payment link, validate with `transaction.findFirst({ where: { id: paidTransactionId, workspaceId, isPaid: true, status: COMPLETED, type: EXPENSE } })` or repository equivalent. This is resolved for S5-015A because the current schema has `Transaction.type`, `TransactionType.EXPENSE`, `Transaction.isPaid`, and `Transaction.status`. [VERIFIED: backend/prisma/schema.prisma]
- Overdue projection should be computed in list/get response mapping: if stored status is `PENDING` and `dueDate < today`, return `OVERDUE`; do not flip `PAID`/`CANCELLED`. Public DTO/list responses return this projected value as the single `status` field for MVP and do not expose dual stored/projected status fields. [VERIFIED: S5-015A-CONTEXT.md]

### Uploads

- Reuse `IStorageProvider.uploadBuffer(buffer, key, contentType)` for server-side upload and `getPresignedDownloadUrl` if a download endpoint is later added. [VERIFIED: IStorageProvider.ts]
- `ExportArchiveService.archiveAndLog` is the best precedent: generate a non-PII UUID object key, upload first, create DB record and audit inside a transaction, and best-effort delete the object if DB write fails. [VERIFIED: ExportArchiveService.ts]
- Object keys should be canonical and workspace-scoped, e.g. `workspaces/{workspaceId}/tax-guides/{taxGuideId}/{uuid}.pdf` or `workspaces/{workspaceId}/tax-guides/{uuid}.pdf`; do not include original filenames, CNPJ, competence labels, or user names. [ASSUMED]
- Existing generic `UploadService.requestUpload` allows images for `RECEIPT`/`INVOICE`; TaxGuide uploads require PDF-only, so do not use generic folder validation without a TaxGuide-specific stricter validator. [VERIFIED: UploadService.ts]

### Audit

- `AuditLogService.logSync(dto, tx)` supports transaction-client usage and rejects workspace mismatch. [VERIFIED: AuditLogService.ts]
- Build a TaxGuide audit metadata allowlist similar to `buildExportAuditNewState`; include only `taxGuideId`, `workspaceId`, `type`, `competenceMonth`, `competenceYear`, `status`, `fileKind`, safe hash if computed, and old/new status. [VERIFIED: AuditLogService.test.ts pattern]
- Do not log `objectKey`. Store object keys in `TaxGuide` only; AuditLog uses `hasGuideFile`, `hasPaymentProof`, file kind, old/new status, and optional SHA-256/hash/flags. [VERIFIED: AuditLogService.test.ts]

### Tests

- Unit/service tests belong under `backend/tests/services/TaxGuideService.test.ts`. [VERIFIED: TESTING.md]
- Route/RBAC tests belong under `backend/tests/routes/TaxGuide.route.test.ts` and can mock service/middleware dependencies similar to `RbacFinancialMutations.route.test.ts`. [VERIFIED: backend/tests/routes/RbacFinancialMutations.route.test.ts]
- DB/RLS proof belongs under `backend/tests/integration/TaxGuideRLS.integration.test.ts` or service test with `managementClient`, `applicationClient`, and `withTestWorkspace`. [VERIFIED: backend/src/test/prisma-test-clients.ts]
- Upload rollback/security tests should mirror `ExportArchiveService.test.ts`: provider upload failure creates no DB row; DB failure triggers best-effort deletion; cross-tenant lookup never calls storage provider. [VERIFIED: ExportArchiveService.test.ts]

## Recommended Phase Breakdown Into Small Backend TDD Plans

### S5-015A-01 - Schema, Migration, and RLS Surface

**Goal:** add `TaxGuide` schema/enums/relations/indexes/unique constraint and migration without routes yet.

**RED tests first:**
- Prisma validate fails until `TaxGuide` model/enums exist.
- DB-backed RLS/integration test proves tenant B cannot read tenant A `TaxGuide` via `applicationClient`.
- Unique constraint rejects duplicate `workspaceId + type + competenceMonth + competenceYear`.

**Likely touched files:**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/<timestamp>_add_tax_guide/`
- `backend/tests/integration/TaxGuideRLS.integration.test.ts`

### S5-015A-02 - Service Domain Rules

**Goal:** implement `TaxGuideService` and repository for create/list/get/status/payment/cancel rules without upload bytes yet.

**RED tests first:**
- Create `DAS` and `DAS_MEI` in BUSINESS returns `PENDING`.
- Create in PERSONAL returns `403`.
- Duplicate competence returns `409` or mapped domain error.
- List supports `status`, `competenceMonth`, and `competenceYear` filters.
- `PENDING` with past `dueDate` projects as `OVERDUE`.
- `PAID` requires same-workspace effective transaction with `isPaid = true`, `status = COMPLETED`, and `type = EXPENSE`, and never calls transaction create/update/balance methods.
- `ACCOUNTANT` can create but cannot mark paid/cancel; `VIEWER` cannot mutate.

**Likely touched files:**
- `backend/src/services/TaxGuideService.ts`
- `backend/src/repositories/TaxGuideRepository.ts`
- `backend/tests/services/TaxGuideService.test.ts`

### S5-015A-03 - REST Controller and RBAC Routes

**Goal:** expose workspace-scoped REST routes with zod parsing and role gates.

**Recommended endpoints:**
- `GET /tax-guides`
- `POST /tax-guides`
- `GET /tax-guides/:id`
- `PATCH /tax-guides/:id/paid`
- `PATCH /tax-guides/:id/cancel`

**RED tests first:**
- Missing/invalid workspace header follows existing `WorkspaceMiddleware` behavior.
- Cross-tenant route returns `403`.
- `ACCOUNTANT` create returns `201`.
- `ACCOUNTANT` paid/cancel returns `403` and service is not called.
- `VIEWER` create/upload/mutate returns `403`.

**Likely touched files:**
- `backend/src/controllers/TaxGuideController.ts`
- `backend/src/routes.ts`
- `backend/tests/routes/TaxGuide.route.test.ts`

### S5-015A-04 - PDF Uploads and Storage Rollback

**Goal:** add PDF-only guide/proof upload endpoints through storage provider abstraction and object-key persistence.

**Recommended endpoints:**
- `POST /tax-guides/:id/guide-pdf`
- `POST /tax-guides/:id/payment-proof`

**RED tests first:**
- Reject non-PDF MIME/extension/signature where supported.
- Enforce explicit size limit.
- Store only `guideFileObjectKey` or `paymentProofObjectKey` in DB.
- Do not store raw buffer, original filename, or PDF text in DB/AuditLog.
- Storage upload failure creates no DB update.
- DB update/audit failure triggers best-effort storage delete.

**Likely touched files:**
- `backend/src/services/TaxGuideService.ts`
- `backend/src/controllers/TaxGuideController.ts`
- `backend/src/routes.ts`
- `backend/tests/services/TaxGuideUpload.test.ts`

### S5-015A-05 - Audit Safety and Focused Acceptance Sweep

**Goal:** lock LGPD/audit invariants and run focused validation.

**RED tests first:**
- Audit newState/oldState exact allowlist for create/upload/paid/cancel.
- Serialized AuditLog contains no PDF sentinel, raw payload, `workspaces/`, `bucket`, `r2://`, `s3://`, CNPJ/CPF/email/name/original filename.
- Paid linkage audit contains old/new status and `paidTransactionId`, not full transaction.

**Likely touched files:**
- `backend/src/services/AuditLogService.ts` only if helper builders are added
- `backend/tests/services/AuditLogService.test.ts` or `backend/tests/services/TaxGuideAudit.test.ts`

## Standard Stack

### Core

| Library / Component | Version | Purpose | Why Standard |
|---------------------|---------|---------|--------------|
| Node.js + Express | existing backend | HTTP API and middleware chain | Current route registry is Express-based. [VERIFIED: routes.ts] |
| TypeScript | existing backend | Static typing | Existing backend services/controllers are TypeScript. [VERIFIED: STRUCTURE.md] |
| Prisma ORM | existing backend | Schema, relations, migrations, DB access | Current persistence and RLS context depend on Prisma. [VERIFIED: schema.prisma/prisma.ts] |
| PostgreSQL/Supabase RLS | existing DB | Tenant isolation | Architecture requires workspace RLS context for application reads/writes. [VERIFIED: ARCHITECTURE.md] |
| Zod | existing backend | Request validation | Controllers parse request bodies/queries with Zod. [VERIFIED: TransactionController.ts] |
| Vitest + Supertest | existing backend tests | Unit, route, integration tests | Existing backend test suite uses Vitest and route tests use Supertest. [VERIFIED: TESTING.md] |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `IStorageProvider` | Upload/download abstraction | TaxGuide guide/proof PDF bytes. [VERIFIED: IStorageProvider.ts] |
| `LocalStorageProvider` | Local/E2E storage implementation | Tests and local storage fallback. [VERIFIED: ExportArchiveService.test.ts] |
| `S3StorageProvider` | R2/S3 storage implementation | Runtime storage provider. [VERIFIED: UploadService.ts] |
| `AuditLogService` | Safe audit side effects | Create/upload/paid/cancel state changes. [VERIFIED: AuditLogService.ts] |
| `AppError` | Status-aware service errors | Domain errors that controllers/global handler can map. [VERIFIED: AppError.ts] |

**Installation:** no external packages should be added for S5-015A. [VERIFIED: requested scope/codebase]

## Package Legitimacy Audit

No new external packages are recommended for this phase. Package legitimacy gate is not applicable. [VERIFIED: Standard Stack]

## Architecture Patterns

### System Architecture Diagram

```text
HTTP request + JWT + x-workspace-id
        |
        v
AuthMiddleware -> WorkspaceMiddleware -> optional RbacMiddleware
        |
        v
TaxGuideController (zod parse, params/query/body)
        |
        v
TaxGuideService (BUSINESS-only, role/status rules, overdue projection)
        |
        +--> TaxGuideRepository -> prisma TaxGuide model -> PostgreSQL/RLS
        |
        +--> TransactionRepository/prisma read-only validation
        |
        +--> IStorageProvider uploadBuffer/deleteFile for PDFs
        |
        v
AuditLogService.logSync safe metadata inside transaction
```

### Recommended Project Structure

```text
backend/
├── prisma/schema.prisma
├── prisma/migrations/<timestamp>_add_tax_guide/
├── src/controllers/TaxGuideController.ts
├── src/repositories/TaxGuideRepository.ts
├── src/services/TaxGuideService.ts
├── src/routes.ts
└── tests/
    ├── services/TaxGuideService.test.ts
    ├── services/TaxGuideUpload.test.ts
    ├── routes/TaxGuide.route.test.ts
    └── integration/TaxGuideRLS.integration.test.ts
```

### Pattern 1: Workspace-Scoped Route Chain

**What:** all workspace-owned TaxGuide endpoints run through auth and workspace membership before controller logic.  
**When to use:** every TaxGuide route.  
**Example:**

```typescript
router.post('/tax-guides', AuthMiddleware, WorkspaceMiddleware, RbacMiddleware('ACCOUNTANT'), (req, res) => {
  return taxGuideController.create(req, res);
});
```

Source: `backend/src/routes.ts` route patterns. [VERIFIED: codebase grep]

### Pattern 2: Route Param Workspace Guard

**What:** if route includes `:workspaceId`, controller must compare route param to `req.workspaceId`.  
**When to use:** only if TaxGuide routes are nested under `/workspaces/:workspaceId`; otherwise prefer header-scoped `/tax-guides`.  
**Example:** `ExportHistoryController.list` rejects route/header mismatch with `403`. [VERIFIED: ExportHistoryController.ts]

### Pattern 3: Upload First, DB Transaction Second, Cleanup on DB Failure

**What:** upload object bytes, then persist DB metadata and AuditLog; on DB failure, delete uploaded object best-effort and rethrow original DB error.  
**When to use:** guide PDF/proof upload.  
**Example:** `ExportArchiveService.archiveAndLog` implements this flow. [VERIFIED: ExportArchiveService.ts]

### Anti-Patterns to Avoid

- **Generic upload path for TaxGuide PDFs:** `UploadService.requestUpload` accepts image or PDF for receipt/invoice, which is too broad for this phase. Use TaxGuide-specific PDF validation. [VERIFIED: UploadService.ts]
- **`sysPrisma` in service code:** violates tenant isolation; use application `prisma` in TaxGuide production code. [VERIFIED: AGENTS.md]
- **Logging full request bodies or filenames:** filenames and PDFs may contain CNPJ/client data; audit only allowlisted metadata. [VERIFIED: AGENTS.md/AuditLogService.test.ts]
- **Creating a `Transaction` during payment marking:** out of scope and violates ledger authority. [VERIFIED: S5-015A-CONTEXT.md]
- **Cron dependency for overdue:** context requires read/list projection without cron reliance. [VERIFIED: S5-015A-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant context/RLS | Manual workspace filters only | `WorkspaceMiddleware` + `tenantContext` + RLS-aware `prisma` | Existing architecture depends on context plus RLS. [VERIFIED: ARCHITECTURE.md] |
| RBAC hierarchy | Custom role comparisons in every controller | `RbacMiddleware`, plus service defense for action-specific role rules | Existing middleware centralizes role hierarchy. [VERIFIED: RbacMiddleware.ts] |
| Storage backend | Local filesystem-only TaxGuide uploads | `IStorageProvider` with S3/Local implementations | Context explicitly requires provider reuse. [VERIFIED: S5-015A-CONTEXT.md] |
| Audit insertion | Direct `auditLog.create` with raw payload | `AuditLogService.logSync` with allowlisted metadata | Service sets RLS config and prevents workspace mismatch. [VERIFIED: AuditLogService.ts] |
| Money handling | JS float arithmetic for `amount` | Prisma `Decimal` / Decimal strings | Existing financial services use Decimal. [VERIFIED: TransactionService.ts] |

**Key insight:** TaxGuide looks simple, but it crosses the same hard boundaries as exports and transactions: tenant-owned data, financial status, file storage, and audit safety. Reusing existing boundaries is lower risk than custom shortcuts. [VERIFIED: ARCHITECTURE.md]

## Common Pitfalls

### Pitfall 1: `ACCOUNTANT` Route Gate Too Broad

**What goes wrong:** `RbacMiddleware('ACCOUNTANT')` permits OWNER and ACCOUNTANT, but also allows ACCOUNTANT into endpoints that must be OWNER-only. [VERIFIED: RbacMiddleware.ts]  
**How to avoid:** split endpoints by action: create/upload can use `ACCOUNTANT`; paid/cancel must use `OWNER` or service-level exact-role enforcement.  
**Warning signs:** tests show ACCOUNTANT can call `/tax-guides/:id/paid`.

### Pitfall 2: PERSONAL Workspace Leak

**What goes wrong:** `WorkspaceMiddleware` only automatically blocks ACCOUNTANT access to PERSONAL; OWNER of PERSONAL can still pass middleware. [VERIFIED: WorkspaceMiddleware.ts]  
**How to avoid:** `TaxGuideService` must explicitly load workspace type and reject all PERSONAL workspaces with `403`.  
**Warning signs:** create guide in PERSONAL succeeds for OWNER.

### Pitfall 3: Upload Metadata Leaks PII

**What goes wrong:** original filename, object key, or PDF-derived text lands in AuditLog. [VERIFIED: AuditLogService.test.ts]  
**How to avoid:** generate object keys from UUIDs only; audit allowlist; test serialized AuditLog against forbidden substrings.  
**Warning signs:** audit contains `workspaces/`, `r2://`, `.pdf` original name, CNPJ/CPF, or request body.

### Pitfall 4: Transaction Link Becomes Ledger Mutation

**What goes wrong:** mark-paid creates or modifies `Transaction`, changing balances outside transaction flow. [VERIFIED: S5-015A-CONTEXT.md]  
**How to avoid:** service must only read/validate a same-workspace effective transaction and set `TaxGuide.paidTransactionId/status`.  
**Warning signs:** tests need mocks for `TransactionService.create` or account balance update during TaxGuide payment.

### Pitfall 5: RLS Migration Forgotten

**What goes wrong:** Prisma model exists but DB RLS policy for `TaxGuide` does not, making application tests unreliable or unsafe. [ASSUMED]  
**How to avoid:** migration should include the same RLS enable/policy pattern used by existing workspace-owned tables, and integration test must prove cross-tenant invisibility.  
**Warning signs:** `applicationClient.taxGuide.findMany` sees cross-workspace rows or errors due missing policy.

## Code Examples

### Safe Audit Metadata Builder

```typescript
type TaxGuideAuditState = {
  taxGuideId: string;
  workspaceId: number;
  type: 'DAS' | 'DAS_MEI';
  competenceMonth: number;
  competenceYear: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  fileKind?: 'GUIDE_PDF' | 'PAYMENT_PROOF';
  fileSha256?: string;
  paidTransactionId?: string;
};
```

Source pattern: `buildExportAuditNewState` allowlist in `AuditLogService.ts`. [VERIFIED: AuditLogService.ts]

### Tenant-Scoped Transaction Link Validation

```typescript
const transaction = await prisma.transaction.findFirst({
  where: {
    id: paidTransactionId,
    workspaceId,
    isPaid: true,
  },
  select: { id: true, workspaceId: true, isPaid: true, type: true },
});
```

Source pattern: tenant-scoped lookups in `UploadService.getAttachmentSignedUrl` and `ExportArchiveService.getDownloadUrl`. [VERIFIED: UploadService.ts/ExportArchiveService.ts]

### Upload Rollback Pattern

```typescript
await storageProvider.uploadBuffer(buffer, objectKey, 'application/pdf');
try {
  return await prisma.$transaction(async (tx) => {
    // update TaxGuide and write AuditLogService.logSync(..., tx)
  });
} catch (error) {
  await storageProvider.deleteFile(objectKey).catch(() => undefined);
  throw error;
}
```

Source pattern: `ExportArchiveService.archiveAndLog`. [VERIFIED: ExportArchiveService.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Automatic tax provisioning in transaction creation | Taxes off for MVP; TaxGuide records explicit obligations | Phase 2/S5-015A planning | TaxGuide must not reintroduce automatic tax calculation. [VERIFIED: ROADMAP.md] |
| Direct file URL/path exposure | Storage provider object keys and presigned URLs, safe response metadata | Export archive phases | TaxGuide should persist object keys and avoid raw paths in API/audit. [VERIFIED: ExportArchiveService.ts] |
| Mock-only tenant checks | DB-backed `applicationClient` RLS tests for isolation | Existing testing map | TaxGuide needs at least one RLS proof. [VERIFIED: TESTING.md] |

**Deprecated/outdated:**
- Using raw request upload route `/uploads/:filename` for production-like TaxGuide flow; code comments say local route simulates S3 and production would not use it. [VERIFIED: UploadController.ts]
- Treating `Workspace.id` as string; current schema and AGENTS require number. [VERIFIED: schema.prisma/AGENTS.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Add separate `TaxGuideType` and `TaxGuideStatus` enums instead of reusing existing enums. | Existing Patterns / Schema | Low; reusing `TransactionStatus` would blur domain semantics and make `CANCELLED` unavailable. |
| A2 | Add explicit Prisma relation fields on `Workspace`, `Transaction`, and `User`. | Existing Patterns / Schema | Medium; Prisma relation naming may need adjustment during `prisma validate`. |
| A3 | Require linked payment transaction to be same-workspace, `isPaid: true`, `status: COMPLETED`, and `type: EXPENSE`. | Services and Repositories | Resolved by current schema; if future schema removes type/status, revisit in a new phase. |
| A4 | TaxGuide object keys should avoid original filenames and CNPJ/competence strings. | Uploads | Low; safest LGPD posture and consistent with export object key UUID pattern. |
| A5 | Migration must include RLS enable/policies for new table. | Common Pitfalls | Medium; exact existing migration pattern must be copied during implementation. |

## Resolved Planning Questions

1. **Paid transaction validation requires `Transaction.type = EXPENSE`.**
   - Resolution: require linked `Transaction` to be in the same workspace, `isPaid = true`, `status = COMPLETED`, and `type = EXPENSE`.
   - Evidence: current schema has `Transaction.type`, `TransactionType.EXPENSE`, `Transaction.isPaid`, and `Transaction.status`. [VERIFIED: backend/prisma/schema.prisma]
   - Plan encoding: S5-015A-02 service tests and service rules; S5-015A-03 paid route delegates this validation.

2. **API returns projected `status` as the only public status field.**
   - Resolution: get/list DTOs map stored `PENDING` plus past `dueDate` to `status = OVERDUE`; `PAID` and `CANCELLED` are not projected to overdue.
   - MVP boundary: do not expose `storedStatus`, `projectedStatus`, or dual status fields.
   - Plan encoding: S5-015A-02 service DTO tests and S5-015A-03 route response tests.

3. **AuditLog does not include objectKey.**
   - Resolution: object keys remain persisted on `TaxGuide` rows only. AuditLog uses hash/flags/file kind/old-new status metadata and excludes `objectKey`, storage path, bucket, provider URL, original filename, raw PDF, and PII.
   - Plan encoding: S5-015A-04 upload safety tests and S5-015A-05 audit allowlist tests.

## Environment Availability

No new external tools or services are required beyond existing backend stack. Existing local validation commands are available by project convention: `pnpm exec prisma validate`, `pnpm exec tsc --noEmit`, and `pnpm test`. [VERIFIED: AGENTS.md/TESTING.md]

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| pnpm | backend validation | not probed in this research pass | existing project package manager | use approved local `.CMD` binaries if shell permission issues occur |
| Prisma CLI | schema validation | not probed in this research pass | project dependency | `backend/node_modules/.bin/prisma.CMD validate` |
| PostgreSQL test DB | RLS integration tests | not probed in this research pass | environment-specific | mark RLS integration as blocked if unavailable |

**Missing dependencies with no fallback:** none identified during research.  
**Missing dependencies with fallback:** PostgreSQL test DB may be required for RLS proof; if unavailable, planner must add a manual/blocked validation note.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest backend, Supertest route tests, Prisma DB integration tests [VERIFIED: TESTING.md] |
| Config file | `backend/vitest.config.mjs` [VERIFIED: TESTING.md] |
| Quick run command | `cd backend && pnpm test -- TaxGuide` |
| Full backend command | `cd backend && pnpm test` |
| Schema command | `cd backend && pnpm exec prisma validate` |
| Typecheck command | `cd backend && pnpm exec tsc --noEmit` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TG-01 | Create DAS succeeds in BUSINESS workspace | service + route | `cd backend && pnpm test -- TaxGuideService` | no - Wave 0 |
| TG-02 | Create DAS_MEI succeeds in BUSINESS workspace | service + route | `cd backend && pnpm test -- TaxGuideService` | no - Wave 0 |
| TG-03 | PERSONAL workspace returns 403 | service + route | `cd backend && pnpm test -- TaxGuide` | no - Wave 0 |
| TG-04 | Cross-tenant access returns 403 / no rows via RLS | integration | `cd backend && pnpm test -- TaxGuideRLS` | no - Wave 0 |
| TG-05 | ACCOUNTANT can create but cannot mark paid | route + service | `cd backend && pnpm test -- TaxGuide.route` | no - Wave 0 |
| TG-06 | PDF uploads accept only allowed PDF and persist only object key | service | `cd backend && pnpm test -- TaxGuideUpload` | no - Wave 0 |
| TG-07 | OVERDUE projection after due date | service | `cd backend && pnpm test -- TaxGuideService` | no - Wave 0 |
| TG-08 | paidTransactionId must be same workspace and effective payment | service | `cd backend && pnpm test -- TaxGuideService` | no - Wave 0 |
| TG-09 | Payment proof upload stores only allowed PDF/object key | service | `cd backend && pnpm test -- TaxGuideUpload` | no - Wave 0 |
| TG-10 | paidTransactionId same-workspace validation denies cross-workspace and never mutates Transaction | service + route | `cd backend && pnpm test -- TaxGuideService TaxGuide.route` | no - Wave 0 |
| TG-11 | AuditLog excludes raw PDF/raw payload/PII/objectKey | service | `cd backend && pnpm test -- TaxGuideAudit` | no - Wave 0 |

### Sampling Rate

- **Per task commit:** focused `pnpm test -- TaxGuide*` plus `pnpm exec prisma validate` when schema touched.
- **Per wave merge:** `cd backend && pnpm exec tsc --noEmit && pnpm test`.
- **Phase gate:** backend schema validate, typecheck, focused TaxGuide tests, and `git diff --check` must pass before verify-work.

### Wave 0 Gaps

- [ ] `backend/tests/services/TaxGuideService.test.ts` - core domain rules.
- [ ] `backend/tests/services/TaxGuideUpload.test.ts` - PDF upload/storage/audit rollback.
- [ ] `backend/tests/routes/TaxGuide.route.test.ts` - HTTP validation and RBAC.
- [ ] `backend/tests/integration/TaxGuideRLS.integration.test.ts` - DB tenant isolation.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | `AuthMiddleware` bearer JWT validation. [VERIFIED: routes.ts] |
| V3 Session Management | no direct change | Existing auth/session stack only. [VERIFIED: ARCHITECTURE.md] |
| V4 Access Control | yes | `WorkspaceMiddleware`, `RbacMiddleware`, service workspace/type/role checks, RLS tests. [VERIFIED: WorkspaceMiddleware.ts/RbacMiddleware.ts] |
| V5 Input Validation | yes | Zod request schemas, PDF MIME/extension/signature/size checks. [VERIFIED: TransactionController.ts] |
| V6 Cryptography | yes indirectly | Storage provider handles signing; do not hand-roll crypto except SHA-256 hash if needed through Node `crypto`. [VERIFIED: ExportArchiveService.ts] |
| V8 Data Protection | yes | Store object keys only; no raw PDF/PII in DB/AuditLog/logs. [VERIFIED: AGENTS.md] |
| V10 Malicious Code/File Handling | yes | PDF-only allowlist, size cap, signature check where supported, canonical object keys. [ASSUMED] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant guide read/write | Information Disclosure/Tampering | Workspace-scoped lookup by `id + workspaceId`, RLS integration tests. [VERIFIED: ExportArchiveService.ts/RLS tests] |
| Role escalation by ACCOUNTANT | Elevation of Privilege | OWNER-only paid/cancel endpoints plus service defense. [VERIFIED: RbacMiddleware.ts] |
| PDF/path PII leak in audit | Information Disclosure | Audit allowlist and forbidden-substring tests. [VERIFIED: AuditLogService.test.ts] |
| Path traversal in local storage object key | Tampering | LocalStorageProvider path traversal tests and canonical key regex. [VERIFIED: ExportArchiveService.test.ts] |
| Raw upload abuse | Denial of Service/Tampering | Explicit size cap, MIME/extension/signature validation, provider rollback. [VERIFIED: UploadService.ts] |

## Landmines and Exact Files Likely Touched

### Likely Touched

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/<timestamp>_add_tax_guide/`
- `backend/src/routes.ts`
- `backend/src/controllers/TaxGuideController.ts`
- `backend/src/services/TaxGuideService.ts`
- `backend/src/repositories/TaxGuideRepository.ts`
- `backend/tests/services/TaxGuideService.test.ts`
- `backend/tests/services/TaxGuideUpload.test.ts`
- `backend/tests/routes/TaxGuide.route.test.ts`
- `backend/tests/integration/TaxGuideRLS.integration.test.ts`

### Possible but Avoid Unless Needed

- `backend/src/services/AuditLogService.ts` - only if adding TaxGuide audit metadata builder.
- `backend/src/providers/exportStorageProviderFactory.ts` - do not rename for TaxGuide unless creating a generic `getStorageProvider` is necessary; avoid broad provider refactor in this phase.
- `backend/src/services/UploadService.ts` - avoid broad changes; TaxGuide PDF validation should live in TaxGuide flow unless a tiny shared helper is clearly safer.

### Out of Scope / Must Stay Untouched

- `backend/src/services/TransactionService.ts` except read-only reference; TaxGuide must not alter Transaction behavior.
- Telegram/OCR services/controllers/tests.
- Frontend files.
- Export generation internals except as patterns.
- Any production use of `managementClient` or `sysPrisma`.

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project workflow, RBAC/RLS/LGPD, ID and git constraints.
- `.planning/ROADMAP.md` - S5-015A scope, out-of-scope, success criteria.
- `.planning/PROJECT.md` - core tenant-safe finance constraints.
- `.planning/REQUIREMENTS.md` - existing ID/tax transaction constraints.
- `.planning/phases/S5-015A-fiscal-mvp-feature-criar-taxguide-para-das-das-mei-como-obri/S5-015A-CONTEXT.md` - locked phase decisions.
- `.planning/codebase/ARCHITECTURE.md` - backend layering and RLS architecture.
- `.planning/codebase/STRUCTURE.md` - file placement patterns.
- `.planning/codebase/TESTING.md` - test structure and validation guidance.
- `backend/prisma/schema.prisma` - current models/enums/ID contracts.
- `backend/src/routes.ts` - middleware ordering and route patterns.
- `backend/src/middlewares/WorkspaceMiddleware.ts` - workspace membership and tenant context.
- `backend/src/middlewares/RbacMiddleware.ts` - role hierarchy.
- `backend/src/services/AuditLogService.ts` - audit insertion and workspace mismatch checks.
- `backend/src/providers/IStorageProvider.ts` - storage abstraction.
- `backend/src/services/ExportArchiveService.ts` - upload/DB/audit/rollback pattern.
- `backend/src/services/UploadService.ts` - current upload validation and tenant-scoped attachment lookup.
- `backend/src/services/TransactionService.ts` - money, transaction, audit, and RLS-aware patterns.
- `backend/tests/services/ExportArchiveService.test.ts` - storage rollback, RLS, and safe audit test precedents.
- `backend/tests/routes/RbacFinancialMutations.route.test.ts` - route RBAC mock pattern.
- `backend/tests/services/AuditLogService.test.ts` - audit allowlist and forbidden field patterns.

### Secondary (MEDIUM confidence)

- None used.

### Tertiary (LOW confidence)

- None used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components already exist in the repo and no new dependency is needed.
- Architecture: HIGH - route/controller/service/repository/RLS patterns are documented and verified in code.
- Pitfalls: HIGH for RBAC/LGPD/Transaction risks; MEDIUM for exact migration/RLS policy until implementation inspects existing SQL migration style.

**Research date:** 2026-06-01  
**Valid until:** 2026-07-01 for codebase patterns, shorter if schema/routes change before implementation.

## RESEARCH COMPLETE
