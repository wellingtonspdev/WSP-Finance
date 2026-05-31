# Phase 4 Plan Review - Convergence Cycle 1

**Phase:** 04 - Pro-Labore Recorrente com Pendencia  
**Review date:** 2026-05-31  
**Review mode:** GSD plan-review-convergence, execution-risk focused  
**Artifacts reviewed:**

- `.planning/ROADMAP.md`
- `AGENTS.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-CONTEXT.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-RESEARCH.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-VALIDATION.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-01-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-02-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-03-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-PLAN-CHECK.md`

## Verdict

**REPLAN REQUIRED before Phase 4 execution.**

The plan set is strong on scope boundaries, dependency gates, Reversa deliverables, cron no-transfer behavior, OWNER-only intent, insufficient-balance handling, frontend scope, and validation breadth. However, one HIGH execution risk remains: confirmation idempotency is specified as an outcome but not as an enforceable atomic design against concurrent requests or process failure between `BridgeService.executeTransfer` and pending status update.

## Current HIGH Concerns

- **HIGH-01 - Confirmation idempotency is not specified as an atomic, concurrency-safe transfer boundary.** `04-CONTEXT.md` requires confirmation to be atomic around pending status transition and bridge execution, and `04-02-PLAN.md` says manual confirmation delegates exactly once to `BridgeService.executeTransfer`. The actual current `BridgeService.executeTransfer` creates bridge ledger rows inside its own `prisma.$transaction`, generates a random `bridgeId` internally, and does not accept an idempotency key or caller-owned transaction client. The plan still leaves room for a flow equivalent to: read pending as `PENDING`, call `BridgeService`, then mark pending `COMPLETED`. Two concurrent confirmations can both pass the `PENDING` check and call `BridgeService`; a crash after bridge success but before the pending update can leave the row retryable and duplicate the transfer. Sequential "double confirm" tests are not enough to prove the invariant.

  **Required replan:** update the Phase 4 backend plan and RED tests to require a concrete atomic/idempotent strategy before implementation. Acceptable replanning directions include a compare-and-set claim plus durable idempotency key/correlation stored on the pending row and enforced by the transfer layer, or a carefully scoped `BridgeService` extension that can participate in the same transaction/idempotency boundary without allowing direct `Transaction` writes from the recurring service. The tests must include concurrent confirm attempts and a failure/retry scenario where bridge success cannot produce a second transfer.

## MEDIUM Concerns

- **MEDIUM-01 - Migration safety is planned but not fully evidenced by commands.** `04-02-PLAN.md` includes `schema.prisma` and migration SQL plus `prisma validate`, typecheck, and backend tests. For a new financial workflow with new tables and enum, execution should also record migration status or equivalent migration SQL verification before handoff. This does not block convergence if HIGH-01 is fixed, because the planned schema additions are additive and no destructive data operation is proposed.

- **MEDIUM-02 - Reversa Matching traceability log is not explicitly planned.** `04-01-PLAN.md` creates the five deliverables required by `AGENTS.md`, including a Matching Report, but the Reversa matching workflow also expects an entry in `_reversa_sdd/traceability/matching-log.md` for formal matching. This is a process continuity gap, not a product safety blocker, because the primary matching artifact is planned.

- **MEDIUM-03 - Existing regression coverage for Telegram/OCR/tax/account selector behavior is mostly indirect.** The plans forbid Telegram/OCR, tax, and account-selector changes and run full suites, but they do not name focused regression checks for those existing simplified flows. Because Phase 4 touches routing/navigation and financial backend routes, execution should record either existing test coverage names or explicit non-touch evidence in the summaries.

## LOW Concerns

- **LOW-01 - Phase dependency risk is delegated to a runtime checkpoint.** The roadmap says Phase 4 depends on Phase 3 and Phase 6, while Phase 6 is still marked planned. `04-01-PLAN.md` correctly blocks on current-checkout evidence and uses `## CHECKPOINT REACHED` if contracts are missing. This is acceptable, but execution agents must not treat `04-PLAN-CHECK.md` as proof that the contracts already exist.

- **LOW-02 - Frontend authorization is correctly backend-owned, but OWNER-only UI expectations should stay non-authoritative.** `04-03-PLAN.md` keeps backend as the authority and only uses UI state for affordances. That is correct; summaries should avoid claiming UI hiding proves authorization.

## Specific Gate Review

| Gate | Result | Notes |
|---|---|---|
| Dependency gates | PASS with LOW caveat | `04-01-PLAN.md` blocks on current Phase 3 `BridgeService.executeTransfer` and Phase 6 simplified frontend proof before implementation. |
| Reversa deliverables | PASS with MEDIUM caveat | Five required deliverables are planned before product implementation; matching-log continuity is not explicit. |
| Cron no-transfer invariant | PASS | Plans repeatedly require cron to create pending rows only and tests to assert no `BridgeService`, `Transaction`, or balance mutation from cron. |
| OWNER-only checks | PASS | Plans require service-level OWNER membership in both source and destination workspaces, not header-only RBAC and not `BridgeService` ACCOUNTANT allowance. |
| Idempotency | FAIL | Due generation idempotency is covered with unique schedule/competence; confirmation idempotency lacks concrete atomic/concurrency/crash-safe design. |
| Insufficient balance | PASS with dependency on HIGH-01 | Plans keep pending `PENDING`, store safe attempt metadata, and avoid balance mutation on insufficient balance. This remains sound if confirmation locking is replanned. |
| Schema/migration safety | PASS with MEDIUM caveat | Additive models and unique constraint are planned; add migration status/SQL verification evidence during execution. |
| Frontend scope | PASS | Dedicated page, hooks, route, and navigation are scoped; no dashboard rewrite or manual bridge rewrite is planned. |
| Validation coverage | PASS with MEDIUM caveat | Backend/frontend focused and full boundary commands are planned; add named regression evidence for protected out-of-scope flows. |
| No Telegram/OCR/tax/account selector regression | PASS with MEDIUM caveat | Scope prohibitions are explicit; final summaries should prove non-touch or run existing focused tests if available. |

## Convergence Recommendation

Do not start Phase 4 execution until HIGH-01 is addressed in the planning packet. After that replan, the remaining MEDIUM/LOW items can be tracked in execution summaries and verify-work without blocking convergence.

```yaml
current_high: 1
issues:
  - id: HIGH-01
    severity: HIGH
    status: unresolved
    blocks_execution: true
    summary: "Confirmation idempotency lacks an atomic, concurrency-safe, crash-aware strategy around BridgeService execution and pending completion."
```

---

# Phase 4 Plan Review - Convergence Cycle 2

**Phase:** 04 - Pro-Labore Recorrente com Pendencia  
**Review date:** 2026-05-31  
**Review mode:** GSD plan-review-convergence cycle 2, HIGH-risk closure review  
**Artifacts reviewed:**

- `AGENTS.md`
- `.planning/ROADMAP.md`
- `backend/src/services/BridgeService.ts`
- `backend/prisma/schema.prisma`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-CONTEXT.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-RESEARCH.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-VALIDATION.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-01-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-02-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-03-PLAN.md`
- `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-PLAN-CHECK.md`

## Verdict

**HIGH-01 is resolved in the planning artifacts. Phase 4 has no unresolved HIGH execution risk at plan-review convergence cycle 2.**

The updated packet now requires confirmation idempotency as a concrete design, not just as an expected result. The current code still shows why the issue mattered: `BridgeService.executeTransfer` owns ledger creation, balance mutation, and audit inside its own Prisma transaction and currently derives its own bridge correlation internally. The revised Phase 4 plan compensates by requiring a scoped idempotent bridge extension, a durable pending-level bridge id/idempotency key, pending-row claim/lock semantics, deterministic bridge FITIDs, and RED/GREEN tests for concurrent confirmation and crash/retry after bridge success.

## HIGH-01 Closure Evidence

- `04-CONTEXT.md` now makes the invariant explicit: confirmation must be atomic, concurrency-safe, crash-aware, persist/reuse a durable `bridgeId` or idempotency key before bridge execution, claim the pending row with compare-and-set or equivalent row-level lock, and avoid duplicate transfer legs on retry.
- `04-RESEARCH.md` now contains a durable strategy for HIGH-01: `RecurringProLaborePending.bridgeId` as a unique nullable key, optional processing claim metadata, OWNER validation before claim, deterministic `BRIDGE_OUT_${bridgeId}` / `BRIDGE_IN_${bridgeId}` FITIDs, existing `Transaction` uniqueness as duplicate-transfer backstop, and a scoped `BridgeService` extension that returns or observes existing legs on retry.
- `04-VALIDATION.md` now requires RED cases for two formerly missing failure modes: concurrent `confirmPending` attempts and crash/retry after `BridgeService` succeeds but before pending completion.
- `04-01-PLAN.md` now requires RED backend tests for concurrent confirmation and crash/retry behavior before production implementation starts.
- `04-02-PLAN.md` now forbids the unsafe read-pending/call-bridge/update-pending sequence, requires atomic claim/lock while `status = PENDING`, requires assigning/reusing the durable key before bridge execution, and requires a scoped idempotent `BridgeService` extension using deterministic FITIDs without letting the recurring service write `Transaction` rows directly.
- `04-PLAN-CHECK.md` marks previous blockers closed and the plan structure ready for ordered execution through 04-01, 04-02, and 04-03.

## Current HIGH Concerns

None.

## Non-HIGH Concerns to Track During Execution

- **MEDIUM-01 - Migration evidence remains an execution responsibility.** The backend plan includes additive schema/migration work and Prisma validation, but execution summaries should also record migration SQL/status evidence before handoff because this phase introduces new financial persistence.
- **MEDIUM-02 - Reversa matching traceability should be confirmed when 04-01 runs.** The plan creates the mandatory Matching Report and other Reversa deliverables. If the local Reversa workflow expects a traceability log entry, the 04-01 summary should record whether it was written or why the report artifact is sufficient.
- **LOW-01 - Dependency gates are blocking runtime gates, not proof already achieved.** `04-01` must still inspect the current checkout and either prove Phase 3/Phase 6 contracts or stop with `## CHECKPOINT REACHED`. Do not skip directly to `04-02`.

## Specific Gate Review

| Gate | Result | Notes |
|---|---|---|
| HIGH-01 idempotency closure | PASS | Durable bridge id/key, pending claim/lock, scoped idempotent BridgeService extension, deterministic FITIDs, and concurrent/crash RED tests are now required. |
| Cron no-transfer invariant | PASS | Cron remains limited to pending generation and tests must prove no BridgeService, Transaction, or balance mutation from cron. |
| OWNER-only checks | PASS | Plans require service-level OWNER membership in both workspaces before schedule mutation or confirmation, avoiding reliance on BridgeService's broader OWNER/ACCOUNTANT allowance. |
| Insufficient balance | PASS | Plans keep pending open, store safe attempt metadata, and require no balance mutation or transaction creation when BridgeService blocks for insufficient balance. |
| Direct ledger writes | PASS | Recurring service is explicitly forbidden from writing `Transaction` rows directly; BridgeService remains the money-movement boundary. |
| Dependency readiness | PASS as a gate | Execution may proceed only through 04-01 first; missing dependency proof must stop the phase before backend implementation. |
| Frontend scope | PASS | Dedicated page/API/hooks are scoped without account selector, tax controls, Telegram/OCR changes, or dashboard rewrite. |

## Convergence Recommendation

Phase 4 planning can proceed to execution through the planned order. Run `04-01` first and honor its checkpoint behavior. Do not start `04-02` unless `04-01` proves dependency contracts and creates the required Reversa deliverables plus RED tests. No Git finalization is authorized by this review.

```yaml
current_high: 0
issues: []
```
