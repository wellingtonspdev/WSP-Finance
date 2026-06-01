# S5-015A Validation Map

**Phase:** S5-015A TaxGuide DAS/DAS-MEI
**Scope:** backend-only planning and execution validation
**Rule:** do not stage, commit, push, reset, clean, or implement frontend work as part of this phase.

## Requirement IDs

| ID | Roadmap Success Criterion |
|---|---|
| TG-01 | Criar guia do tipo `DAS` retorna sucesso. |
| TG-02 | Criar guia do tipo `DAS_MEI` retorna sucesso. |
| TG-03 | Criar guia em workspace `PERSONAL` retorna `403 Forbidden`. |
| TG-04 | Requisicao cross-tenant retorna `403 Forbidden` or no data through RLS-safe reads. |
| TG-05 | `ACCOUNTANT` cria guia com `201 Created` sem alterar `Transaction`, and cannot mark guide as paid. |
| TG-06 | Upload de PDF da guia armazena somente arquivo permitido e salva apenas object key. |
| TG-07 | Status `OVERDUE` fica correto apos `dueDate` passar. |
| TG-08 | Vinculo com `Transaction` requires same-workspace effective payment: `isPaid = true`, `status = COMPLETED`, and `type = EXPENSE`. |
| TG-09 | Upload de comprovante armazena somente arquivo permitido e salva apenas object key. |
| TG-10 | Cross-workspace `paidTransactionId` is denied and TaxGuide never creates or mutates `Transaction`. |
| TG-11 | `AuditLog` nao salva PDF bruto, raw payload sensivel, PII, original filename, storage internals, or objectKey. |

## Plan and Task Mapping

| Plan | Task | Requirements | Automated Checks |
|---|---|---|---|
| S5-015A-01 | Task 1: Add RED TaxGuide schema and RLS tests | TG-01, TG-02, TG-04 | `cd backend; pnpm test -- tests/integration/TaxGuideRLS.integration.test.ts` |
| S5-015A-01 | Task 2: Add TaxGuide Prisma model, relations, and migration | TG-01, TG-02, TG-04 | `cd backend; pnpm exec prisma validate`; `cd backend; pnpm test -- tests/integration/TaxGuideRLS.integration.test.ts` |
| S5-015A-02 | Task 1: Add RED service tests for TaxGuide domain rules | TG-01, TG-02, TG-03, TG-05, TG-07, TG-08, TG-10 | `cd backend; pnpm test -- tests/services/TaxGuideService.test.ts` |
| S5-015A-02 | Task 2: Implement workspace-scoped repository and service rules | TG-01, TG-02, TG-03, TG-05, TG-07, TG-08, TG-10 | `cd backend; pnpm exec prisma validate`; `cd backend; pnpm exec tsc --noEmit`; `cd backend; pnpm test -- tests/services/TaxGuideService.test.ts` |
| S5-015A-03 | Task 1: Add RED TaxGuide route and RBAC tests | TG-01, TG-02, TG-03, TG-04, TG-05, TG-07, TG-08, TG-10 | `cd backend; pnpm test -- tests/routes/TaxGuide.route.test.ts` |
| S5-015A-03 | Task 2: Add TaxGuide controller and route wiring | TG-01, TG-02, TG-03, TG-04, TG-05, TG-07, TG-08, TG-10 | `cd backend; pnpm exec tsc --noEmit`; `cd backend; pnpm test -- tests/routes/TaxGuide.route.test.ts tests/services/TaxGuideService.test.ts` |
| S5-015A-04 | Task 1: Add RED TaxGuide upload tests | TG-06, TG-09, TG-11 | `cd backend; pnpm test -- tests/services/TaxGuideUpload.test.ts tests/routes/TaxGuide.route.test.ts` |
| S5-015A-04 | Task 2: Implement PDF upload commands and endpoints | TG-06, TG-09, TG-11 | `cd backend; pnpm exec tsc --noEmit`; `cd backend; pnpm test -- tests/services/TaxGuideUpload.test.ts tests/routes/TaxGuide.route.test.ts` |
| S5-015A-05 | Task 1: Add RED TaxGuide audit allowlist tests | TG-01, TG-02, TG-03, TG-04, TG-05, TG-06, TG-07, TG-08, TG-09, TG-10, TG-11 | `cd backend; pnpm test -- tests/services/TaxGuideAudit.test.ts tests/services/AuditLogService.test.ts` |
| S5-015A-05 | Task 2: Implement audit allowlist and run focused acceptance sweep | TG-01, TG-02, TG-03, TG-04, TG-05, TG-06, TG-07, TG-08, TG-09, TG-10, TG-11 | `cd backend; pnpm exec prisma validate`; `cd backend; pnpm exec tsc --noEmit`; `cd backend; pnpm test -- tests/integration/TaxGuideRLS.integration.test.ts tests/services/TaxGuideService.test.ts tests/services/TaxGuideUpload.test.ts tests/services/TaxGuideAudit.test.ts tests/routes/TaxGuide.route.test.ts`; `git diff --check`; `git diff -- frontend` |

## Phase Gate

Run before S5-015A handoff:

```powershell
git branch --show-current
git status --short -uall
git diff --stat
git diff --check
git diff -- frontend
cd backend
pnpm exec prisma validate
pnpm exec tsc --noEmit
pnpm test -- tests/integration/TaxGuideRLS.integration.test.ts tests/services/TaxGuideService.test.ts tests/services/TaxGuideUpload.test.ts tests/services/TaxGuideAudit.test.ts tests/routes/TaxGuide.route.test.ts
```

## Non-Goals To Verify

- No frontend files changed.
- No Telegram/OCR files changed.
- No ExportService generation internals changed.
- No `Transaction` create/update/delete/balance mutation is introduced by TaxGuide.
- No `sysPrisma` or production `managementClient` use is introduced.
- No `objectKey`, raw PDF, original filename, full request body, CPF/CNPJ/email/name, bucket, `r2://`, `s3://`, or storage path appears in AuditLog payloads.
