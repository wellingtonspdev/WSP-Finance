# Codebase Concerns

**Analysis Date:** 2026-05-31

## Tech Debt

**Large route registry with mixed concerns:**
- Issue: `backend/src/routes.ts` is a 558-line central registry that instantiates controllers, configures upload middleware, embeds long Swagger comments, performs inline authorization checks, and defines all API routes in one file.
- Files: `backend/src/routes.ts`
- Impact: Changes to unrelated domains conflict easily, route-level security review is harder, and sensitive middleware ordering must be audited manually for each new endpoint.
- Fix approach: Split routes by bounded context, for example `backend/src/routes/auth.routes.ts`, `backend/src/routes/workspace.routes.ts`, `backend/src/routes/finance.routes.ts`, `backend/src/routes/integrations.routes.ts`, and keep `backend/src/routes.ts` as a composer only.

**Frontend route components carry workflow, filtering, and mock feed state:**
- Issue: `frontend/src/features/accountant/routes/AccountantHubPage.tsx` combines cache freshness, workspace state reset, filtering, modal state, navigation, and a hard-coded `mockEvents` activity feed in one route component.
- Files: `frontend/src/features/accountant/routes/AccountantHubPage.tsx`, `frontend/src/features/accountant/components/ActivityFeed.tsx`, `frontend/src/features/accountant/components/RecentActivitiesDrawer.tsx`
- Impact: Activity UI can be mistaken for live data, the page is difficult to test in slices, and cache/activity changes require editing a large UI route.
- Fix approach: Move activity events behind an API/hook such as `frontend/src/features/accountant/api/activityEvents.ts`; move filtering/cache derivations into hooks under `frontend/src/features/accountant/hooks/`; keep the route as composition.

**Telegram OCR ingestion is still a POC stub:**
- Issue: `TelegramOcrIngestionService` simulates OCR with a fixed amount, current date, description, and `EXPENSE` type when parsed data is not supplied.
- Files: `backend/src/services/TelegramOcrIngestionService.ts`, `backend/src/services/TelegramOcrConfirmationService.ts`, `backend/tests/services/TelegramOcrIngestionService.test.ts`
- Impact: A user can create pending financial movements from Telegram documents that do not reflect the uploaded receipt content, which can pollute approval inboxes and downstream ledger entries.
- Fix approach: Require a real OCR provider result or store an explicit `NEEDS_REVIEW` draft state before creating `BankMovement`; do not create ledger-adjacent data from `simulateOcrParsing`.

**Seed/demo code contains deterministic shared credentials and non-deterministic data generation:**
- Issue: Seeds create and print demo users with the shared password `password123`, while many seed modules use `Math.random()` for dates, amounts, and audit events.
- Files: `backend/prisma/seed.ts`, `backend/prisma/seed.js`, `backend/prisma/seed/modules/01_Identities.ts`, `backend/prisma/seed/modules/03_TimeTravel.ts`, `backend/prisma/seed/modules/04_Auditor.ts`, `backend/prisma/seed/modules/05_LifeCycle.ts`
- Impact: Demo credentials are easy to leak into non-local environments, and random seed data makes failures harder to reproduce.
- Fix approach: Gate seeds by environment, generate demo credentials from local-only env variables or print one-time local notices, and replace `Math.random()` with a seeded RNG helper.

**Ad hoc database scripts bypass runtime conventions:**
- Issue: Standalone scripts instantiate `PrismaClient` directly and some embed local database URLs rather than using the central client and environment validation.
- Files: `backend/fix_permissions.ts`, `backend/scripts/check-role.js`, `backend/scripts/setup-test-db.js`, `backend/src/scripts/setup-e2e-dominio.ts`, `backend/src/lib/prisma.ts`
- Impact: Scripts can drift from application runtime behavior, especially around `connection_limit`, RLS role checks, and tenant context.
- Fix approach: Move DB operational scripts behind a small shared bootstrap that loads env safely, rejects production unless explicitly allowed, and documents when `sysPrisma` or application Prisma is required.

## Known Bugs

**Open Finance webhook has a default mock bearer token:**
- Symptoms: If `OPEN_FINANCE_WEBHOOK_KEY` is absent, `OpenFinanceWebhookService.isAuthorized()` accepts `Bearer webhook-auth-key-mock`.
- Files: `backend/src/services/OpenFinanceWebhookService.ts`, `backend/src/controllers/OpenFinanceWebhookController.ts`, `backend/src/routes.ts`
- Trigger: Deploy or run a non-test environment without `OPEN_FINANCE_WEBHOOK_KEY`, then call `POST /api/webhooks/open-finance` with the fallback bearer token.
- Workaround: Set `OPEN_FINANCE_WEBHOOK_KEY` in every runtime and add startup validation that forbids the fallback outside `NODE_ENV=test`.

**Bridge transfer route bypasses normal workspace middleware chain:**
- Symptoms: `POST /bridge/transfer` uses `AuthMiddleware` only and relies on body-provided `fromWorkspaceId` and `toWorkspaceId` plus service-level membership validation.
- Files: `backend/src/routes.ts`, `backend/src/controllers/BridgeController.ts`, `backend/src/services/BridgeService.ts`, `backend/tests/services/BridgeService.balance-audit.test.ts`
- Trigger: Any bridge request can choose both workspace IDs in the body; service validation blocks non-members but the route does not bind one workspace to the authenticated request context.
- Workaround: Keep service-level membership checks intact; add route-level guards or a dedicated bridge middleware that validates both workspaces and sets an explicit tenant context strategy for cross-workspace operations.

**Global transaction listing is unpaginated and outside workspace context:**
- Symptoms: `GET /transactions/all` returns all transactions visible through memberships for the authenticated user, ordered by date, with no cursor/limit schema.
- Files: `backend/src/routes.ts`, `backend/src/controllers/TransactionController.ts`, `backend/src/services/TransactionService.ts`, `backend/src/repositories/TransactionRepository.ts`
- Trigger: A user with many workspaces or high transaction volume calls `/transactions/all`.
- Workaround: Prefer workspace-scoped `GET /transactions`; add pagination and explicit role/workspace filters before exposing the global route in production workflows.

## Security Considerations

**SSE-C key material is returned to browser clients for certificate uploads/downloads:**
- Risk: `S3StorageProvider` returns `x-amz-server-side-encryption-customer-key` and MD5 headers to clients for certificate upload and download flows.
- Files: `backend/src/providers/S3StorageProvider.ts`, `backend/src/services/UploadService.ts`, `backend/src/controllers/WorkspaceController.ts`, `frontend/src/features/workspaces/components/CertificateUploadSection.tsx`
- Current mitigation: `VAULT_MASTER_KEY` length is validated, R2 signed URLs are short-lived, and certificate upload is owner-gated through `backend/src/routes.ts`.
- Recommendations: Proxy certificate upload/download through the backend or use provider-managed KMS/SSE so raw customer key material never leaves the server.

**Open Finance ingestion trusts caller-supplied workspace/account IDs:**
- Risk: The webhook accepts `workspaceId` and `accountId` in the payload after bearer-token authorization, then writes `BankMovement` records through `FinancialIngestionEngine`.
- Files: `backend/src/controllers/OpenFinanceWebhookController.ts`, `backend/src/services/OpenFinanceWebhookService.ts`, `backend/src/services/FinancialIngestionEngine.ts`
- Current mitigation: Bearer token authorization and schema validation exist.
- Recommendations: Bind incoming webhooks to a provider account mapping stored server-side, verify that `accountId` belongs to `workspaceId`, rotate webhook secrets, and reject fallback secrets outside tests.

**`sysPrisma` fallback can hide RLS bypass assumptions in dev/test:**
- Risk: `sysPrisma` uses `DIRECT_URL` when present but falls back to `basePrisma`; code using `sysPrisma` may behave differently between environments.
- Files: `backend/src/lib/prisma.ts`, `backend/src/repositories/AccountantCacheRepository.ts`, `backend/src/repositories/BankMovementRepository.ts`, `backend/src/services/AccountantCacheService.ts`, `backend/src/services/AdminService.ts`, `backend/src/services/OutboxService.ts`
- Current mitigation: `backend/src/lib/checkEnvironment.ts` rejects runtime roles with `SUPERUSER` or `BYPASSRLS`, and there are role/RLS tests under `backend/tests/integration/`.
- Recommendations: Make privileged-client intent explicit per call site, fail fast if `DIRECT_URL` is required for a privileged path, and keep tenant-scoped read paths on `prisma` where possible.

**Local static file serving exposes all local uploads by URL:**
- Risk: `backend/src/server.ts` serves `backend/uploads` under `/files` using `express.static`; local provider returns direct `/files/...` URLs.
- Files: `backend/src/server.ts`, `backend/src/providers/LocalStorageProvider.ts`, `backend/src/services/UploadService.ts`
- Current mitigation: Production upload service uses `S3StorageProvider`; local path validation blocks traversal.
- Recommendations: Keep local static serving disabled outside development/test and avoid storing sensitive certificate or receipt files in the local static folder.

## Performance Bottlenecks

**Accountant global pending list fans out across every client workspace:**
- Problem: `BankMovementRepository.findGlobalPendingByAccountant()` loads accountant memberships, opens one transaction per workspace, queries each tenant, flattens all results, sorts in memory, then slices globally.
- Files: `backend/src/repositories/BankMovementRepository.ts`, `backend/src/services/BankMovementService.ts`, `backend/src/controllers/BankMovementController.ts`
- Cause: RLS is forced per workspace and global pagination is reconstructed in application memory.
- Improvement path: Add a materialized inbox/cache table for accountant pending movements or query through a controlled database function/view that enforces membership and performs global ordering/pagination in SQL.

**Fuzzy deduplication runs per movement before chunked insertion:**
- Problem: `FinancialIngestionEngine.ingest()` calls `FuzzyDeduplicationService.findCandidates()` once for every normalized movement before batching inserts.
- Files: `backend/src/services/FinancialIngestionEngine.ts`, `backend/src/services/FuzzyDeduplicationService.ts`, `scripts/benchmark_pg_trgm.sql`, `documentacao/benchmark_pg_trgm_staging.md`
- Cause: Candidate search is per-row, while insertion is chunked at 50.
- Improvement path: Batch candidate lookup by workspace/account/date window, keep pg_trgm indexes validated, and measure large webhook/OFX batches with representative data.

**Transaction global list can load unbounded history:**
- Problem: `TransactionRepository.findManyByUserId()` has no `take`, cursor, date range, or workspace filter.
- Files: `backend/src/repositories/TransactionRepository.ts`, `backend/src/services/TransactionService.ts`, `backend/src/controllers/TransactionController.ts`
- Cause: The global endpoint predates the cursor pattern used in workspace-scoped transaction lists.
- Improvement path: Mirror `findManyByWorkspace()` pagination, require a limit, and include workspace/type/date filters.

## Fragile Areas

**Tenant context and Prisma extension:**
- Files: `backend/src/lib/prisma.ts`, `backend/src/lib/tenantContext.ts`, `backend/src/middlewares/WorkspaceMiddleware.ts`, `backend/tests/integration/RLS.integration.test.ts`, `backend/tests/integration/role-audit.test.ts`, `backend/tests/integration/prisma-runtime-role.test.ts`
- Why fragile: The extension sets `app.current_workspace_id` around Prisma operations and has special branches for transactions, `bypassRls`, and missing workspace context. Cross-workspace operations and `sysPrisma` call sites require careful review.
- Safe modification: Use `WorkspaceMiddleware` for tenant-bound routes, avoid direct `new PrismaClient()` in app code, add tests with real tenant context for any new route/service, and run RLS integration tests after Prisma changes.
- Test coverage: Good baseline exists for RLS role checks, but new privileged paths need route-level tests that prove denied cross-tenant access.

**Bridge double-entry ledger operations:**
- Files: `backend/src/services/BridgeService.ts`, `backend/src/controllers/BridgeController.ts`, `backend/src/routes.ts`, `backend/tests/services/BridgeService.balance-audit.test.ts`
- Why fragile: A single call creates two transactions, updates two account balances, writes two audit rows, and intentionally crosses workspace boundaries.
- Safe modification: Preserve one database transaction, validate both account/workspace pairs before balance mutation, keep audit rows symmetrical, and add tests for partial failure, closed periods, accountant access, and personal workspace restrictions.
- Test coverage: Service balance/audit tests exist; route/middleware tests should cover body workspace tampering and auth edge cases.

**Telegram integration and OCR flow:**
- Files: `backend/src/controllers/TelegramIntegrationController.ts`, `backend/src/services/TelegramBotService.ts`, `backend/src/services/TelegramContextResolver.ts`, `backend/src/services/TelegramLinkService.ts`, `backend/src/services/TelegramLinkTokenService.ts`, `backend/src/services/TelegramOcrIngestionService.ts`, `backend/src/services/TelegramOcrConfirmationService.ts`, `backend/prisma/migrations/20260530062456_add_telegram_pairing_code/migration.sql`, `frontend/src/features/workspaces/routes/TelegramConfigPage.tsx`
- Why fragile: Pairing, default destinations, bot polling, pending movements, and confirmation all meet at a new integration boundary. Token verification uses short codes and OCR ingestion can create `BankMovement` rows before human confirmation.
- Safe modification: Keep token hashes only, add brute-force/rate-limit controls around pairing attempts, store OCR drafts separately from financial movements, and require explicit user confirmation before ledger-affecting approval.
- Test coverage: Unit tests exist for Telegram services and config page; integration/e2e coverage for the bot-to-bank-movement-to-approval path is the gap.

**Export archive/download and R2 storage:**
- Files: `backend/src/services/ExportArchiveService.ts`, `backend/src/controllers/ExportDownloadController.ts`, `backend/src/providers/S3StorageProvider.ts`, `backend/tests/services/ExportArchiveService.download.test.ts`, `backend/tests/controllers/ExportDownloadController.test.ts`
- Why fragile: Export download combines tenant route params, `WorkspaceRouteParamGuard`, short-lived signed URLs, and storage object keys.
- Safe modification: Keep route-param workspace guards before `WorkspaceMiddleware`, never derive workspace from archive ID alone, sanitize download filenames, and keep signed URL TTL capped.
- Test coverage: Download and archive tests exist; storage-provider behavior should stay covered for header sanitization and missing object/key cases.

## Scaling Limits

**Accountant dashboard cache refresh:**
- Current capacity: Cache refresh processes each accountant's client workspaces through `AccountantCacheService` and uses `sysPrisma` with per-workspace RLS config.
- Limit: Large accounting offices can make refresh slow or expensive as memberships and pending movement volume grow.
- Scaling path: Move refresh to queue/outbox-driven incremental updates, persist activity summaries, and expose stale-cache state rather than forcing synchronous fan-out refresh from `POST /accountant/cache/refresh`.

**Upload quota accounting:**
- Current capacity: `UploadService.requestUpload()` aggregates `Transaction.attachmentSize` on demand per workspace before signing a new upload.
- Limit: Large transaction tables make every upload authorization dependent on an aggregate scan unless indexed/optimized.
- Scaling path: Maintain per-workspace storage usage counters updated transactionally when attachments are created/deleted.

**Open Finance ingestion batches:**
- Current capacity: Insert chunks are fixed at 50 movements after per-row fuzzy deduplication.
- Limit: High-volume webhook batches may time out or run many similarity queries before insert.
- Scaling path: Introduce provider batch IDs, async ingestion jobs, batch dedup prefetch, and retryable failed chunk tracking.

## Dependencies at Risk

**`node-telegram-bot-api` runtime require:**
- Risk: `backend/src/server.ts` uses dynamic `require('node-telegram-bot-api')` only when Telegram bot is enabled, so missing dependency or token misconfiguration appears at runtime.
- Impact: Telegram bot startup can fail independently from API startup, and polling errors may be missed without operational monitoring.
- Migration plan: Import through a typed adapter, validate package/config at startup when `TELEGRAM_BOT_ENABLED=true`, and add health/status reporting for bot polling.

**Cloudflare R2/S3 provider configuration:**
- Risk: `S3StorageProvider` warns on missing R2 credentials but still constructs a client with empty strings.
- Impact: Upload signing fails at request time instead of failing startup in environments that require file storage.
- Migration plan: Add environment validation for storage mode; fail fast when production storage credentials are missing.

## Missing Critical Features

**Real OCR provider and draft review state:**
- Problem: Telegram OCR creates `BankMovement` records using simulated parsing when no parsed data is supplied.
- Blocks: Trustworthy receipt ingestion, reliable approval inbox data, and production use of Telegram OCR.

**Webhook-to-account binding model:**
- Problem: Open Finance webhook authorization is global and payload-driven rather than bound to a provider connection/account.
- Blocks: Safe multi-tenant Open Finance onboarding, key rotation per connection, and precise revocation.

**Production-grade activity feed for Accountant Hub:**
- Problem: Recent activity UI uses hard-coded events in `AccountantHubPage`.
- Blocks: Accurate audit trail UX and user trust in the hub's operational dashboard.

## Test Coverage Gaps

**Route-level security for cross-workspace Bridge transfer:**
- What's not tested: End-to-end request behavior for `/bridge/transfer`, including body tampering, mismatched memberships, accountant-to-personal restrictions, and closed-period handling at route level.
- Files: `backend/src/routes.ts`, `backend/src/controllers/BridgeController.ts`, `backend/src/services/BridgeService.ts`
- Risk: Service tests can pass while route integration still misses request-context or middleware regressions.
- Priority: High

**Open Finance webhook production-secret behavior:**
- What's not tested: Startup/runtime rejection when `OPEN_FINANCE_WEBHOOK_KEY` is absent outside tests and rejection of fallback token in non-test environments.
- Files: `backend/src/services/OpenFinanceWebhookService.ts`, `backend/src/controllers/OpenFinanceWebhookController.ts`
- Risk: A deployment can accidentally accept the mock bearer token.
- Priority: High

**Telegram bot full ingestion workflow:**
- What's not tested: Realistic flow from pairing code through bot message/document handling, destination resolution, OCR draft/movement creation, confirmation, and final transaction approval.
- Files: `backend/src/services/TelegramBotService.ts`, `backend/src/services/TelegramLinkService.ts`, `backend/src/services/TelegramContextResolver.ts`, `backend/src/services/TelegramOcrIngestionService.ts`, `backend/src/services/TelegramOcrConfirmationService.ts`
- Risk: Unit-level service tests miss integration bugs across bot, database, and financial approval boundaries.
- Priority: High

**Frontend activity feed data contract:**
- What's not tested: API-backed activity feed loading, empty/error states, and stale/mock-data prevention.
- Files: `frontend/src/features/accountant/routes/AccountantHubPage.tsx`, `frontend/src/features/accountant/components/RecentActivitiesDrawer.tsx`, `frontend/src/features/accountant/components/ActivityFeed.tsx`
- Risk: Users see prototype content in a production-looking accountant hub.
- Priority: Medium

**Privileged `sysPrisma` call-site authorization:**
- What's not tested: Every `sysPrisma` usage has a local authorization proof that restricts returned records to an admin, accountant, infrastructure worker, or explicit tenant list.
- Files: `backend/src/lib/prisma.ts`, `backend/src/services/AdminService.ts`, `backend/src/services/AccountantCacheService.ts`, `backend/src/repositories/BankMovementRepository.ts`, `backend/src/services/OutboxService.ts`
- Risk: A future privileged query can bypass RLS without a matching application-level guard.
- Priority: High

---

*Concerns audit: 2026-05-31*
