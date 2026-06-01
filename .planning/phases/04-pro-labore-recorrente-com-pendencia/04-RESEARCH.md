# Phase 4: Pro-Labore Recorrente com Pendencia - Research

**Researched:** 2026-05-31
**Domain:** Full-stack recurring financial workflow with pending manual confirmation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Cron creates pending confirmations only; it never transfers money.
- Confirmation is manual and uses `BridgeService.executeTransfer`.
- Only OWNER users can create, deactivate, cancel, or confirm recurring pro-labore.
- Schedules are deactivated to preserve history; do not delete historical records.
- Dedicated frontend page for recurring pro-labore.
- Use `PENDING`, `COMPLETED`, and `CANCELLED` as pending statuses.
- Insufficient balance keeps the pending record `PENDING` and records last error/attempt metadata.
- Normalize monthly competence as the first day of the month (`YYYY-MM-01`).
- Enforce one pending record per schedule and competence.
- Cron should process due schedules up to today, not only schedules due exactly today.
- If configured `dayOfMonth` does not exist in a month, use the last day of that month.
- Do not re-enable taxes.
- Do not ask the user for account selection.
- Do not mix this phase with Telegram/OCR.
- Do not change the already validated manual bridge rules beyond what is needed to call `BridgeService` from confirmation.

### the agent's Discretion

No separate discretion section exists in `04-CONTEXT.md`.

### Deferred Ideas (OUT OF SCOPE)

- No automatic transfer from cron.
- No tax provisioning or automatic tax calculation.
- No account selector or user-facing account requirement.
- No Telegram/OCR changes.
- No OpenFinance/OFX changes.
- No direct Transaction creation outside `BridgeService`.
- No broad dashboard rewrite.
- No deletion of historical schedules or pending records.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P4-01 | Create monthly BUSINESS to PERSONAL schedules. | Add `RecurringProLaboreSchedule` with source/destination workspace IDs, amount, day, description, active state, creator, timestamps, and validation in a dedicated service. [VERIFIED: repo `04-CONTEXT.md`, `backend/prisma/schema.prisma`] |
| P4-02 | OWNER-only create/deactivate/cancel/confirm. | Existing RBAC hierarchy allows `RbacMiddleware('OWNER')`, but cross-workspace OWNER checks must also be service-level because confirmation touches two workspaces. [VERIFIED: repo `backend/src/middlewares/RbacMiddleware.ts`, `backend/src/services/BridgeService.ts`] |
| P4-03 | Cron creates pending only. | Extend `CronService.start()` with a scheduled call to a generation method; generation must only insert pending rows and must not call `BridgeService`. [VERIFIED: repo `backend/src/services/CronService.ts`, `04-CONTEXT.md`] |
| P4-04 | Confirmation executes bridge once. | New confirmation service must persist a durable pending-level `bridgeId`/idempotency key, claim the pending row with compare-and-set semantics or an equivalent row-level lock, then delegate to a scoped `BridgeService` idempotency extension; direct `Transaction` writes are forbidden. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `backend/prisma/schema.prisma`, `AGENTS.md`] |
| P4-05 | Insufficient balance keeps pending open. | `BridgeService` throws before opening a Prisma transaction when source balance is insufficient, so the wrapper must catch that error, store attempt metadata, and leave status `PENDING`. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `backend/tests/services/BridgeService.balance-audit.test.ts`] |
| P4-06 | Dedicated frontend page. | Add a lazy route under `/:workspaceId/...`, navigation item(s), API module, hooks, and page state for schedules/pending confirmations. [VERIFIED: repo `frontend/src/App.tsx`, `frontend/src/shared/components/layout/Sidebar.tsx`, `frontend/src/shared/components/layout/BottomNav.tsx`] |
</phase_requirements>

## Summary

Phase 4 should be implemented as a new recurring-pro-labore bounded context, not as a modification of ledger creation or Telegram/OCR flows. [VERIFIED: repo `04-CONTEXT.md`, `AGENTS.md`] The current schema has `Workspace`, `WorkspaceMember`, `Account`, `Transaction`, and `AuditLog`, but no recurrence schedule or pending confirmation models. [VERIFIED: repo `backend/prisma/schema.prisma`]

The standard design is: schedule persistence owns intent, cron materializes due pending confirmations idempotently, and manual OWNER confirmation delegates the actual financial movement to `BridgeService.executeTransfer`. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`] This preserves the existing bridge boundary for default-account resolution, balance mutation, transaction creation, and audit logging. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `backend/tests/services/BridgeService.balance-audit.test.ts`]

**Primary recommendation:** Add `RecurringProLaboreSchedule` and `RecurringProLaborePending` models, a `RecurringProLaboreService`, a controller/routes surface, cron generation, and a dedicated frontend page; do not install new packages and do not create ledger rows except via `BridgeService.executeTransfer`. [VERIFIED: repo `backend/package.json`, `frontend/package.json`, `04-CONTEXT.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schedule persistence | Database / Storage | API / Backend | Prisma schema must enforce durable history and unique pending generation constraints. [VERIFIED: repo `backend/prisma/schema.prisma`, `04-CONTEXT.md`] |
| Schedule validation | API / Backend | Database / Storage | BUSINESS-to-PERSONAL, different workspaces, OWNER-only, positive amount, and valid day rules are business rules. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/middlewares/RbacMiddleware.ts`] |
| Due pending generation | API / Backend | Database / Storage | `CronService` owns scheduled jobs and should call service logic that only inserts pending rows. [VERIFIED: repo `backend/src/services/CronService.ts`] |
| Actual transfer | API / Backend | Database / Storage | `BridgeService.executeTransfer` already owns atomic transaction creation, balance mutation, and bridge audit. [VERIFIED: repo `backend/src/services/BridgeService.ts`] |
| Recurring UI | Browser / Client | API / Backend | The frontend should configure schedules and confirm pending rows through API calls, not compute authorization or mutate balances. [VERIFIED: repo `frontend/src/App.tsx`, `frontend/src/features/workspaces/api/executeBridgeTransfer.ts`] |

## Project Constraints (from AGENTS.md)

- Use Conventional Commits when commits are explicitly authorized. [VERIFIED: repo `AGENTS.md`]
- Do not implement directly before understanding, technical discovery, TDD plan, execution, verify work, corrections, selective Git finalization, and handoff. [VERIFIED: repo `AGENTS.md`]
- Never use `git add .`, `git reset --hard`, `git clean -fd`, or stage/commit/push without explicit authorization. [VERIFIED: repo `AGENTS.md`]
- Never use `sysPrisma` by convenience or `managementClient` in production. [VERIFIED: repo `AGENTS.md`]
- Never create `Transaction` directly from OCR/Telegram and never store PII/raw OCR/sensitive payload in logs/AuditLog. [VERIFIED: repo `AGENTS.md`]
- Preserve RLS, RBAC, LGPD, and tenant isolation. [VERIFIED: repo `AGENTS.md`]
- Keep `Transaction.id` as string UUID and `Account.id` / `Workspace.id` as numbers. [VERIFIED: repo `AGENTS.md`, `backend/prisma/schema.prisma`]
- Preserve Telegram/OCR baseline and classify baseline versus phase files in reports. [VERIFIED: repo `AGENTS.md`]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma / `@prisma/client` | `^6.2.1` | Schema, migrations, typed data access, unique constraints. | Existing backend ORM and schema authority. [VERIFIED: repo `backend/package.json`, `backend/prisma/schema.prisma`] |
| Express | `^4.21.2` | HTTP route/controller surface. | Existing backend routing layer. [VERIFIED: repo `backend/package.json`, `backend/src/routes.ts`] |
| Zod | backend `^3.24.1` | Request validation in controllers. | Existing `BridgeController` pattern validates DTOs with Zod. [VERIFIED: repo `backend/package.json`, `backend/src/controllers/BridgeController.ts`] |
| node-cron | `^3.0.3` | Recurring scheduled job trigger. | Existing `CronService` uses it for scheduled jobs. [VERIFIED: repo `backend/package.json`, `backend/src/services/CronService.ts`] |
| date-fns / dayjs | `^4.1.0` / `^1.11.19` | Date arithmetic and fiscal-period date checks. | Already present; use one consistent helper for month competence and last-day calculation. [VERIFIED: repo `backend/package.json`, `backend/src/services/CronService.ts`, `backend/src/services/BridgeService.ts`] |
| React + React Router | React `^19.2.0`, router `^7.13.0` | Dedicated page and workspace route. | Existing frontend route architecture. [VERIFIED: repo `frontend/package.json`, `frontend/src/App.tsx`] |
| TanStack React Query | `^5.90.21` | API mutation/query state and invalidation. | Existing bridge hook uses `useMutation` and query invalidation. [VERIFIED: repo `frontend/package.json`, `frontend/src/features/workspaces/hooks/useCreateBridge.ts`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | backend/frontend `4.0.18` | Unit and focused integration tests. | Required for service, route, hook/page tests. [VERIFIED: repo `backend/package.json`, `frontend/package.json`] |
| Testing Library | `@testing-library/react ^16.3.2` | Frontend component/page tests. | Use for dedicated recurring page behavior. [VERIFIED: repo `frontend/package.json`] |
| Axios | backend `^1.7.9`, frontend `^1.13.5` | Frontend HTTP client. | Existing shared API client injects auth and `x-workspace-id` from URL. [VERIFIED: repo `frontend/package.json`, `frontend/src/shared/lib/axios.ts`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New queue/outbox worker | Existing `CronService` | `CronService` already owns scheduled jobs; a new queue adds operational surface without a phase requirement. [VERIFIED: repo `backend/src/services/CronService.ts`, `04-CONTEXT.md`] |
| Direct transaction writes in recurring service | `BridgeService.executeTransfer` | Direct writes bypass existing default-account, balance, fiscal-period, and audit behavior. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `AGENTS.md`] |
| Hard delete schedules | `isActive`/deactivation | The phase requires history preservation. [VERIFIED: repo `04-CONTEXT.md`] |

**Installation:**

No new package installation is recommended for this phase. [VERIFIED: repo `backend/package.json`, `frontend/package.json`]

## Package Legitimacy Audit

No external package installation is recommended; this section is not required for a no-install phase. [VERIFIED: repo `backend/package.json`, `frontend/package.json`]

## Architecture Patterns

### System Architecture Diagram

```text
OWNER browser page
  -> API schedule endpoints
    -> RecurringProLaboreService validates OWNER in source and destination workspaces
      -> Prisma stores schedule history

CronService daily job
  -> RecurringProLaboreService.generateDuePendings(today)
    -> computes due month competence as YYYY-MM-01
    -> creates pending rows with unique(scheduleId, competence)
    -> never calls BridgeService, never creates Transaction

OWNER browser pending confirmation
  -> API confirm endpoint
    -> RecurringProLaboreService validates pending is PENDING and user is OWNER
      -> BridgeService.executeTransfer(userId, source/destination/amount/date/description)
        -> default accounts, balance check, atomic debit/credit, AuditLog
      -> mark pending COMPLETED only after bridge success
      -> on insufficient balance, keep PENDING and store attempt/error metadata
```

### Recommended Project Structure

```text
backend/src/
+-- controllers/RecurringProLaboreController.ts  # request validation and HTTP responses
+-- services/RecurringProLaboreService.ts        # schedule, pending, confirmation, cron logic
+-- routes.ts                                    # protected route registration
+-- services/CronService.ts                      # schedule due-pending generation

backend/tests/
+-- services/RecurringProLaboreService.test.ts
+-- services/CronService.recurring-pro-labore.test.ts
+-- routes/RecurringProLabore.route.test.ts

frontend/src/features/recurring-pro-labore/
+-- api/recurringProLabore.ts
+-- hooks/useRecurringProLabore.ts
+-- routes/RecurringProLaborePage.tsx
```

### Pattern 1: Schedule and Pending Models

**What:** Add one model for recurring schedule intent and one model for monthly pending confirmation state. [VERIFIED: repo `04-CONTEXT.md`]

**When to use:** Use the schedule model for active/inactive recurrence definition and the pending model for each monthly manual confirmation. [VERIFIED: repo `04-CONTEXT.md`]

**Example:**

```prisma
enum RecurringProLaborePendingStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model RecurringProLaboreSchedule {
  id                     String   @id @default(uuid())
  sourceWorkspaceId      Int
  destinationWorkspaceId Int
  amount                 Decimal  @db.Decimal(19, 4)
  dayOfMonth             Int
  description            String?
  isActive               Boolean  @default(true)
  createdByUserId        Int
  deactivatedAt          DateTime?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  pendings               RecurringProLaborePending[]

  @@index([sourceWorkspaceId])
  @@index([destinationWorkspaceId])
  @@index([isActive, dayOfMonth])
}

model RecurringProLaborePending {
  id                   String   @id @default(uuid())
  scheduleId           String
  competence           DateTime
  status               RecurringProLaborePendingStatus @default(PENDING)
  bridgeId             String?  @unique
  processingClaimId    String?
  processingStartedAt  DateTime?
  confirmedByUserId    Int?
  confirmedAt          DateTime?
  cancelledByUserId    Int?
  cancelledAt          DateTime?
  lastAttemptAt        DateTime?
  lastError            String?  @db.VarChar(1000)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  schedule             RecurringProLaboreSchedule @relation(fields: [scheduleId], references: [id], onDelete: Restrict)

  @@unique([scheduleId, competence])
  @@index([status, competence])
}
```

### Pattern 2: Idempotent Due Generation

**What:** Generation should compute each active schedule's due date for the month, normalize competence to the first day of the month, and create missing pending rows with a unique key. [VERIFIED: repo `04-CONTEXT.md`]

**When to use:** Use from cron and from focused tests; it must process due schedules up to today to recover missed runs. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/CronService.ts`]

**Example:**

```typescript
// Source: repo pattern from CronService plus phase rules in 04-CONTEXT.md
async generateDuePendings(today = new Date()) {
  const activeSchedules = await prisma.recurringProLaboreSchedule.findMany({
    where: { isActive: true },
  });

  for (const schedule of activeSchedules) {
    const competence = firstDayOfMonth(today);
    const dueDate = dueDateForMonth(competence, schedule.dayOfMonth);
    if (dueDate > endOfDay(today)) continue;

    await prisma.recurringProLaborePending.upsert({
      where: { scheduleId_competence: { scheduleId: schedule.id, competence } },
      create: { scheduleId: schedule.id, competence, status: 'PENDING' },
      update: {},
    });
  }
}
```

### Pattern 3: Manual Confirmation Wrapper

**What:** Confirmation should be the only path that calls `BridgeService.executeTransfer`, and it must make the pending-to-bridge boundary durable before money movement. Persist a pending-level `bridgeId`/idempotency key, acquire the pending row via compare-and-set or row-level lock, call an idempotent `BridgeService` boundary with that key, and mark completion only after bridge success. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`, `backend/prisma/schema.prisma`]

**When to use:** Use for `POST /recurring-pro-labore/pending/:id/confirm` or a workspace-scoped equivalent. [VERIFIED: repo `backend/src/routes.ts`, `frontend/src/features/workspaces/api/executeBridgeTransfer.ts`]

**Durable strategy required by HIGH-01 replan:**

1. `RecurringProLaborePending` stores a unique nullable `bridgeId` or equivalent idempotency key, plus short-lived claim metadata such as `processingClaimId`/`processingStartedAt` if a row-lock-only implementation is not used.
2. Confirmation first validates OWNER-only access, then performs a compare-and-set update or row-level lock on the pending row where `status = PENDING` and the row is not actively claimed by another request. The claim must either assign the durable `bridgeId` once or reuse the existing one for retry.
3. `BridgeService` receives the caller-provided `bridgeId`/idempotency key and uses deterministic FITIDs `BRIDGE_OUT_${bridgeId}` and `BRIDGE_IN_${bridgeId}`. The existing `@@unique([workspaceId, fitid])` constraint on `Transaction` is the duplicate-transfer backstop.
4. If the same idempotency key already produced both bridge legs, `BridgeService` returns the existing transfer result without creating new `Transaction` rows or mutating balances again.
5. If the process crashes after bridge success but before pending completion, a retry reuses the stored `bridgeId`, observes/returns the existing bridge legs, and then completes the pending row.
6. `RecurringProLaboreService` never writes `Transaction` rows directly. Any needed BridgeService change must be a scoped extension of the existing transfer boundary, such as accepting caller-provided correlation/idempotency key and/or a transaction client, without weakening current RBAC/fiscal-period/default-account/balance/audit behavior.

**Example flow:**

```typescript
// Source: repo BridgeService contract plus Phase 4 pending rules.
async confirmPending(userId: number, pendingId: string) {
  const pending = await this.getPendingForConfirmation(pendingId);
  this.assertOwnerForBothWorkspaces(userId, pending.schedule);
  const bridgeId = await this.claimPendingAndEnsureBridgeId(pending.id, userId);

  try {
    const result = await this.bridgeService.executeTransfer(userId, {
      fromWorkspaceId: pending.schedule.sourceWorkspaceId,
      toWorkspaceId: pending.schedule.destinationWorkspaceId,
      amount: Number(pending.schedule.amount),
      description: pending.schedule.description ?? 'Pro-labore recorrente',
      date: new Date(),
      bridgeId,
    });

    await prisma.recurringProLaborePending.update({
      where: { id: pending.id },
      data: { status: 'COMPLETED', confirmedByUserId: userId, confirmedAt: new Date(), lastError: null },
    });

    return result;
  } catch (err) {
    await prisma.recurringProLaborePending.update({
      where: { id: pending.id },
      data: { lastAttemptAt: new Date(), lastError: normalizeSafeError(err) },
    });
    throw err;
  }
}
```

### Anti-Patterns to Avoid

- **Cron calls `BridgeService`:** This would violate the locked decision that cron creates pending confirmations only. [VERIFIED: repo `04-CONTEXT.md`]
- **Relying only on `BridgeService` permission logic:** `BridgeService` currently accepts OWNER or ACCOUNTANT, while Phase 4 requires OWNER-only. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `04-CONTEXT.md`]
- **Using `RbacMiddleware('OWNER')` alone for both workspaces:** Header-scoped RBAC checks only one workspace context; recurring pro-labore must validate ownership on source and destination. [VERIFIED: repo `backend/src/middlewares/RbacMiddleware.ts`, `frontend/src/shared/lib/axios.ts`]
- **Creating `Transaction` rows in recurring service:** The project forbids bypassing established financial boundaries, and BridgeService owns atomic bridge ledger writes. [VERIFIED: repo `AGENTS.md`, `backend/src/services/BridgeService.ts`]
- **Deleting schedules/pending rows:** The phase requires deactivation and history preservation. [VERIFIED: repo `04-CONTEXT.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transfer ledger writes | Custom debit/credit transaction logic | `BridgeService.executeTransfer` | Existing code handles accounts, balance, transactions, and audit. [VERIFIED: repo `backend/src/services/BridgeService.ts`] |
| HTTP input validation | Manual `if` chains for all request shape checks | Zod schemas in controller | Existing controller pattern uses Zod. [VERIFIED: repo `backend/src/controllers/BridgeController.ts`] |
| Cron scheduler | New scheduler/runtime | Existing `node-cron` via `CronService` | Current service already schedules daily/interval jobs with anti-double-start guard. [VERIFIED: repo `backend/src/services/CronService.ts`] |
| Frontend request cache | Custom global loading/cache store | TanStack Query hooks | Existing bridge hook uses mutation and invalidation. [VERIFIED: repo `frontend/src/features/workspaces/hooks/useCreateBridge.ts`] |

**Key insight:** The complex part is not recurrence timing; it is preserving financial invariants while separating "pending intent" from "ledger mutation." [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`]

## Runtime State Inventory

This is a schema/workflow migration phase, so runtime state must be audited before execution. [VERIFIED: repo `04-CONTEXT.md`]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No existing recurring pro-labore schedule/pending tables exist. [VERIFIED: repo `backend/prisma/schema.prisma`] | Create migration; no data backfill required unless a pre-existing manual convention is discovered later. [ASSUMED] |
| Live service config | `CronService` is code-configured; no external scheduler config was found in repo. [VERIFIED: repo `backend/src/services/CronService.ts`] | Add job registration in code; deployment must ensure only intended app instances run cron. [ASSUMED] |
| OS-registered state | No OS scheduler integration was found in repo evidence. [VERIFIED: repo file scans for backend services/routes] | None for code plan; runtime deployment topology remains a verification question. [ASSUMED] |
| Secrets/env vars | Phase 4 does not require new secrets in the context or code evidence. [VERIFIED: repo `04-CONTEXT.md`, `backend/package.json`] | None. |
| Build artifacts | Existing `backend/dist`, `frontend/dist`, coverage outputs, and node_modules exist. [VERIFIED: repo directory listing] | Rebuild/test during execution; do not treat artifacts as source. |

## Common Pitfalls

### Pitfall 1: Duplicate Pendings
**What goes wrong:** Missed cron runs or repeated cron starts create multiple pending rows for one schedule/month. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/CronService.ts`]
**Why it happens:** Generation is not backed by a database unique constraint. [ASSUMED]
**How to avoid:** Add `@@unique([scheduleId, competence])` and use upsert/create-with-conflict behavior. [VERIFIED: repo `04-CONTEXT.md`]
**Warning signs:** Tests pass when called once but fail when generation is called twice for the same date. [ASSUMED]

### Pitfall 1B: Duplicate Transfer on Concurrent or Retried Confirmation
**What goes wrong:** Two requests read a pending row as `PENDING` and both call `BridgeService`, or a process crashes after bridge success but before the pending row is marked `COMPLETED`; retry then creates a second bridge. [VERIFIED: repo `04-REVIEWS.md`, `backend/src/services/BridgeService.ts`]
**Why it happens:** Current `BridgeService.executeTransfer` generates a random bridge id internally and does not accept a caller-owned idempotency key or transaction boundary. [VERIFIED: repo `backend/src/services/BridgeService.ts`]
**How to avoid:** Store the pending's durable `bridgeId`, claim/lock the pending row before calling bridge, pass the same key into a scoped idempotent BridgeService extension, and rely on deterministic FITIDs plus `Transaction` unique constraints to prevent duplicate legs. [VERIFIED: repo `backend/prisma/schema.prisma`, `04-CONTEXT.md`]
**Warning signs:** Sequential double-confirm tests pass, but `Promise.all` concurrent confirms or crash/retry simulations create more than one `BRIDGE_OUT_...` and one `BRIDGE_IN_...` pair. [ASSUMED]

### Pitfall 2: ACCOUNTANT Can Confirm
**What goes wrong:** Delegating directly to `BridgeService` would allow ACCOUNTANT because the current bridge permission query accepts OWNER and ACCOUNTANT. [VERIFIED: repo `backend/src/services/BridgeService.ts`]
**Why it happens:** Phase 3 bridge rules differ from Phase 4 OWNER-only rules. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`]
**How to avoid:** `RecurringProLaboreService` must explicitly require OWNER membership in both source and destination before calling bridge. [VERIFIED: repo `04-CONTEXT.md`]
**Warning signs:** A service test with ACCOUNTANT membership reaches `BridgeService.executeTransfer`. [ASSUMED]

### Pitfall 3: Marking Completed Before Bridge Success
**What goes wrong:** A pending row can become `COMPLETED` even when balance is insufficient or transfer fails. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`]
**Why it happens:** Status transition is sequenced before side effect. [ASSUMED]
**How to avoid:** Confirm only after bridge success; on known errors, store `lastAttemptAt`/`lastError` and keep `PENDING`. [VERIFIED: repo `04-CONTEXT.md`]
**Warning signs:** Insufficient-balance tests find `status = COMPLETED` or created transactions. [VERIFIED: repo `04-CONTEXT.md`]

### Pitfall 4: Header-Only Workspace Authorization
**What goes wrong:** API calls authorized by the active URL workspace can accidentally ignore destination workspace ownership. [VERIFIED: repo `frontend/src/shared/lib/axios.ts`, `backend/src/middlewares/WorkspaceMiddleware.ts`]
**Why it happens:** `x-workspace-id` comes from one route parameter, but the operation is cross-workspace. [VERIFIED: repo `frontend/src/shared/lib/axios.ts`]
**How to avoid:** Service-level authorization must query `WorkspaceMember` for both workspace IDs. [VERIFIED: repo `backend/src/services/BridgeService.ts`]
**Warning signs:** Route tests pass with source membership only. [ASSUMED]

## Code Examples

### Last Day of Month Rule

```typescript
// Source: Phase 4 CONTEXT requirement; implement with existing date helper dependency.
function dueDateForMonth(competence: Date, dayOfMonth: number) {
  const year = competence.getUTCFullYear();
  const month = competence.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const safeDay = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(year, month, safeDay));
}
```

### OWNER Check for Both Workspaces

```typescript
// Source: BridgeService membership lookup pattern plus Phase 4 OWNER-only rule.
const memberships = await prisma.workspaceMember.findMany({
  where: {
    userId,
    workspaceId: { in: [sourceWorkspaceId, destinationWorkspaceId] },
    role: 'OWNER',
  },
  include: { workspace: true },
});
```

### Frontend Query Pattern

```typescript
// Source: existing useCreateBridge React Query pattern.
export const useConfirmRecurringProLabore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmRecurringProLaborePending,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-pro-labore'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct recurring transfer automation | Pending manual confirmation | Locked in Phase 4 context on 2026-05-31 | Cron must not execute money movement. [VERIFIED: repo `04-CONTEXT.md`] |
| User-facing account selection | Default-account bridge transfer | Phase 3 dependency and existing bridge code | Recurring UI must ask for workspaces, amount, day, description only. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`] |
| Tax provisioning in pro-labore flow | Taxes remain disabled | Phase 4 context and roadmap | Do not compute or display tax/net values for this workflow. [VERIFIED: repo `.planning/ROADMAP.md`, `04-CONTEXT.md`] |

**Deprecated/outdated:**
- Automatic pro-labore transfer from cron is explicitly out of scope. [VERIFIED: repo `04-CONTEXT.md`]
- Account selectors are explicitly out of scope. [VERIFIED: repo `04-CONTEXT.md`]
- Telegram/OCR integration is explicitly out of scope. [VERIFIED: repo `04-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No data backfill is required unless a pre-existing manual convention is discovered later. | Runtime State Inventory | Existing users may expect old manual records to seed schedules. |
| A2 | Deployment has a single intended cron runner or accepts idempotent multi-run behavior. | Runtime State Inventory | Multiple app instances may race due pending creation; DB unique constraint mitigates duplicates. |
| A3 | No OS scheduler exists outside repo. | Runtime State Inventory | External scheduler could also call generation and change operational cadence. |
| A4 | Warning signs listed in pitfalls are expected test smells. | Common Pitfalls | Planner may need to refine test names or fixtures. |

## Open Questions (RESOLVED)

1. **Route shape — RESOLVED**
   - What we know: Existing workspace routes often use `x-workspace-id`, while bridge uses a global `/bridge/transfer` route with body workspace IDs. [VERIFIED: repo `backend/src/routes.ts`, `frontend/src/shared/lib/axios.ts`]
   - Resolution: Use global authenticated endpoints under `/recurring-pro-labore` with explicit source/destination workspace IDs in validated request bodies and service-level OWNER checks for both workspaces. Do not trust one `x-workspace-id` header or one route workspace parameter for cross-workspace authorization. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `backend/src/routes.ts`]
   - Planning impact: Plan 04-02 must implement a thin Zod-validating controller and global route registration; Plan 04-03 must call the same global route shape from the frontend API module.

2. **Cron cadence — RESOLVED**
   - What we know: `CronService` already schedules a daily health check at 08:00 and cache refresh every 30 minutes. [VERIFIED: repo `backend/src/services/CronService.ts`]
   - Resolution: Add a daily morning generation job in `CronService` and keep generation idempotent so missed or repeated runs are safe. The service method remains callable by tests without scheduling side effects. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/CronService.ts`]
   - Planning impact: Plan 04-02 must wire cron to due-pending generation only; it must not call `BridgeService`, create `Transaction` rows, or mutate balances from cron.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Backend/frontend scripts | Yes | `v22.16.0` | None needed. [VERIFIED: shell `node --version`] |
| pnpm | Package scripts | Yes | `10.27.0` | Existing local binaries can be called directly if needed. [VERIFIED: shell `pnpm --version`] |
| Backend node_modules | Type/test commands | Yes | Present | Install step only if missing in a future run. [VERIFIED: repo directory listing] |
| Frontend node_modules | Type/test/build commands | Yes | Present | Install step only if missing in a future run. [VERIFIED: repo directory listing] |
| PostgreSQL/Supabase runtime | Prisma migrations and integration validation | Not probed | Environment-specific | Planner should keep migration/status validation explicit. [ASSUMED] |

**Missing dependencies with no fallback:**
- PostgreSQL/Supabase runtime availability was not verified in this research turn. [ASSUMED]

**Missing dependencies with fallback:**
- None found for code planning. [VERIFIED: shell probes and repo package files]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Vitest `4.0.18`. [VERIFIED: repo `backend/package.json`] |
| Backend config file | `backend/vitest.config.mjs`. [VERIFIED: repo directory listing] |
| Backend quick run command | `cd backend && pnpm test -- tests/services/RecurringProLaboreService.test.ts` |
| Backend full suite command | `cd backend && pnpm test` |
| Frontend framework | Vitest `4.0.18` with Testing Library. [VERIFIED: repo `frontend/package.json`] |
| Frontend config file | `frontend/vitest.config.mjs`. [VERIFIED: repo directory listing] |
| Frontend quick run command | `cd frontend && pnpm test -- src/features/recurring-pro-labore` |
| Frontend full suite command | `cd frontend && pnpm test && pnpm run build` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| P4-01 | Create valid BUSINESS to PERSONAL schedule | service + route | `cd backend && pnpm test -- tests/services/RecurringProLaboreService.test.ts` | No - Wave 0 |
| P4-02 | Block same workspace, non-OWNER, invalid direction | service + route | `cd backend && pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/routes/RecurringProLabore.route.test.ts` | No - Wave 0 |
| P4-03 | Cron generates due pending and no duplicates | service + cron unit | `cd backend && pnpm test -- tests/services/CronService.recurring-pro-labore.test.ts` | No - Wave 0 |
| P4-04 | Confirm pending delegates to bridge once, including concurrent confirm attempts and crash/retry after bridge success | service unit | `cd backend && pnpm test -- tests/services/RecurringProLaboreService.test.ts` | No - Wave 0 |
| P4-05 | Insufficient balance keeps pending open | service unit | `cd backend && pnpm test -- tests/services/RecurringProLaboreService.test.ts` | No - Wave 0 |
| P4-06 | Frontend creates/list/confirms and displays errors/inactive state | component/page | `cd frontend && pnpm test -- src/features/recurring-pro-labore` | No - Wave 0 |

### Sampling Rate

- **Per task commit:** Run focused backend/frontend commands for touched layer. [VERIFIED: repo `04-CONTEXT.md`]
- **Per wave merge:** Run backend `pnpm exec prisma validate`, `pnpm exec tsc --noEmit`, backend `pnpm test`, frontend `pnpm test`, and frontend `pnpm run build`. [VERIFIED: repo `04-CONTEXT.md`, `AGENTS.md`]
- **Phase gate:** Full suite green before verify-work. [VERIFIED: repo `AGENTS.md`]

### Wave 0 Gaps

- [ ] `backend/tests/services/RecurringProLaboreService.test.ts` - covers schedule validation, OWNER-only, pending generation, confirmation, insufficient balance, deactivation. [VERIFIED: repo test listing]
- [ ] `backend/tests/services/CronService.recurring-pro-labore.test.ts` - covers cron registration and generation delegation. [VERIFIED: repo `backend/tests/services/CronService.test.ts`]
- [ ] `backend/tests/routes/RecurringProLabore.route.test.ts` - covers API access and DTO validation. [VERIFIED: repo route test patterns]
- [ ] `frontend/src/features/recurring-pro-labore/...` tests - covers dedicated page workflows. [VERIFIED: repo frontend has no matching test files from scan]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | `AuthMiddleware` on all recurring endpoints. [VERIFIED: repo `backend/src/routes.ts`] |
| V3 Session Management | yes | Existing JWT/refresh handling; no new session mechanism. [VERIFIED: repo `frontend/src/shared/lib/axios.ts`, `backend/src/routes.ts`] |
| V4 Access Control | yes | Explicit OWNER membership in both workspaces before schedule mutation or confirmation. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`] |
| V5 Input Validation | yes | Zod controller schemas for amount, dates, IDs, status actions. [VERIFIED: repo `backend/src/controllers/BridgeController.ts`] |
| V6 Cryptography | no direct new crypto | Use existing UUID/default IDs; do not introduce custom cryptography. [VERIFIED: repo `backend/prisma/schema.prisma`] |
| V7 Error Handling | yes | Store safe `lastError` without PII or raw sensitive payload. [VERIFIED: repo `AGENTS.md`, `04-CONTEXT.md`] |
| V10 Malicious Code | yes | No new packages; no dynamic code execution. [VERIFIED: repo `backend/package.json`, `frontend/package.json`] |

### Known Threat Patterns for WSP Finance Phase 4

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant confirmation | Elevation of privilege | Service-level OWNER check on source and destination workspace IDs. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/BridgeService.ts`] |
| Duplicate transfer by double click/retry | Tampering | Pending status guard plus idempotency tests; never complete twice. [VERIFIED: repo `04-CONTEXT.md`] |
| Duplicate transfer after crash/retry | Tampering | Durable pending-level bridge id, idempotent BridgeService boundary, deterministic FITIDs, and crash/retry RED tests. [VERIFIED: repo `04-REVIEWS.md`, `backend/prisma/schema.prisma`] |
| Cron creates money movement | Tampering | Cron generation method only inserts pending rows and never imports/calls bridge. [VERIFIED: repo `04-CONTEXT.md`, `backend/src/services/CronService.ts`] |
| Error metadata leaks sensitive data | Information disclosure | Normalize and truncate errors; do not persist raw payloads or PII. [VERIFIED: repo `AGENTS.md`] |
| ACCOUNTANT confirms personal transfer | Elevation of privilege | Do not rely on `BridgeService` role allowance; require OWNER before bridge delegation. [VERIFIED: repo `backend/src/services/BridgeService.ts`, `04-CONTEXT.md`] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project constraints, Git safety, financial invariants, ID rules, LGPD/RBAC requirements.
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-CONTEXT.md` - locked Phase 4 decisions, scope, tests, invariants.
- `.planning/ROADMAP.md` - phase dependencies and success criteria.
- `backend/prisma/schema.prisma` - current data model and absence of recurring pro-labore models.
- `backend/src/services/BridgeService.ts` - bridge transfer contract, account resolution, balance mutation, audit behavior, current role allowance.
- `backend/src/services/CronService.ts` - existing cron ownership and anti-double-start/cache overlap patterns.
- `backend/src/routes.ts` and `backend/src/controllers/BridgeController.ts` - route/controller patterns and Zod validation.
- `frontend/src/App.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `executeBridgeTransfer.ts`, `useCreateBridge.ts`, `axios.ts` - frontend routing, navigation, API, hook, and workspace header patterns.
- `backend/tests/services/CronService.test.ts`, `backend/tests/services/BridgeService.balance-audit.test.ts` - existing test patterns for cron and bridge invariants.

### Secondary (MEDIUM confidence)

- None used.

### Tertiary (LOW confidence)

- Memory note from prior planning that recurring pro-labore should remain pending-confirmation only; current repo `04-CONTEXT.md` re-verified the decision.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all recommendations use existing repo dependencies and package versions.
- Architecture: HIGH - core decisions are locked in `04-CONTEXT.md` and match existing service boundaries.
- Pitfalls: HIGH for permission/cron/bridge issues because current code demonstrates them; MEDIUM for deployment topology because runtime process count was not probed.

**Research date:** 2026-05-31
**Valid until:** 2026-06-30, or earlier if Phase 3 bridge implementation changes `BridgeService.executeTransfer`.
