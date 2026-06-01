# Roadmap: WSP Finance

## Current Milestone: Manual Transaction MVP Stabilization

Focus: preserve Phase 1/2 hardening, keep Telegram/OCR baseline intact, use simplified bridge transfers, and plan recurring pro-labore as a pending-confirmation workflow.

## Phases

- [x] **Phase 1: Core Hardening** - Security hardening verified with score 5/5.
- [x] **Phase 2: Manual Transactions without accountId + Taxes Off** - Manual transaction creation accepts omitted `accountId`, resolves default accounts, and disables automatic tax provisioning.
- [ ] **Phase 3: Bridge / Manual Pro-Labore without Explicit Accounts** - Plan bridge transfer contract simplification so the client sends workspaces only and backend resolves default accounts.
- [ ] **Phase 4: Pro-Labore Recorrente com Pendencia** - Create monthly recurring pro-labore schedules that generate pending confirmations; transfers remain manual via BridgeService.
- [ ] **Phase 6: Frontend Simplificado Existente** - Align existing frontend flows with simplified backend contracts, hiding account and tax complexity from primary user paths.
- [ ] **Phase S5-014: [HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes** - Consolidate export history UI over existing `ExportArchive` and download infrastructure.

## Phase Details

### Phase 1: Core Hardening

**Goal:** Verify core security hardening and preserve Telegram/OCR baseline.

**Status:** Complete

**Verification:** `.planning/phases/01-core-hardening/01-VERIFICATION.md`

**Success Criteria:**

1. OTP hardening uses CSPRNG.
2. OpenFinance webhook has no unsafe fallback.
3. External data endpoints are protected.
4. Hardening tests exist.
5. Telegram/OCR baseline remains preserved.

Plans:

- Complete via verification report.

### Phase 2: Manual Transactions without accountId + Taxes Off

**Goal:** Simplify manual transaction creation so clients may omit `accountId`; backend resolves a workspace default account, keeps explicit `accountId` workspace-safe, preserves UUID/number ID contracts, and disables automatic tax provisioning for MVP.

**Depends on:** Phase 1

**Status:** Complete

**Success Criteria:**

1. `POST /transactions` accepts manual create payloads without `accountId`.
2. `TransactionService.create` resolves a workspace default account when `accountId` is absent.
3. Explicit `accountId` remains accepted only if it belongs to the current workspace.
4. New transactions persist `taxAmount = null` and `netValue = null`.
5. Marketplace fields remain intact and final amount still excludes fee/shipping as currently intended, without tax provisioning.
6. Paid transactions still update the resolved account balance and audit state correctly.
7. `Transaction.id` remains string UUID; `Account.id` and `Workspace.id` remain numbers.
8. BridgeService, OFX/OpenFinance, Telegram/OCR, and broad frontend changes remain untouched.

Plans:

- [ ] 02-01-PLAN.md — TDD-first backend plan for optional manual `accountId`, workspace default account resolution, taxes-off persistence, marketplace preservation, and ID-contract protection.

### Phase 3: Bridge / Manual Pro-Labore without Explicit Accounts

**Goal:** Simplify manual bridge/pro-labore transfers so clients submit source and target workspaces, while the backend resolves default accounts and preserves RBAC, fiscal-period guards, atomic balance updates, and audit snapshots.

**Depends on:** Phase 2

**Status:** Planning

**Success Criteria:**

1. `POST /bridge/transfer` accepts payloads without `fromAccountId` and `toAccountId`.
2. `BridgeService.executeTransfer` resolves source and target default accounts using `AccountRepository.findDefaultByWorkspace(workspaceId, workspace.type)`.
3. User still needs OWNER or ACCOUNTANT membership in both workspaces.
4. Source and target workspaces must remain different.
5. Closed fiscal period rules stay enforced for both workspaces.
6. Insufficient source balance blocks before transaction creation and balance mutation.
7. Debit/credit transactions and account balance updates stay in one Prisma transaction.
8. Audit rows keep resolved `fromAccount` and `toAccount` IDs and balance snapshots.
9. No recurrence, pending pro-labore, cron, or new manual flow is introduced.

Plans:

- [ ] 03-01-PLAN.md - TDD-first backend plan for bridge contract simplification using existing default-account repository helper.

### Phase 4: Pro-Labore Recorrente com Pendencia

**Goal:** Create monthly recurring pro-labore scheduling that generates pending confirmations. The cron must only create pending records; the actual transfer happens only after manual OWNER confirmation through the simplified BridgeService from Phase 3.

**Depends on:** Phase 3, Phase 6

**Status:** Complete

**Success Criteria:**

1. Users can create a monthly pro-labore schedule from a BUSINESS workspace to a PERSONAL workspace.
2. Only OWNER users can create, deactivate, cancel, or confirm recurring pro-labore.
3. Schedule persistence stores source business workspace, destination personal workspace, amount, day of month, description, active/inactive state, creator, and timestamps.
4. Pending persistence stores schedule, normalized monthly competence, status, confirmation metadata, and last confirmation error/attempt metadata.
5. Cron creates pending records only; it never executes transfers or changes balances.
6. Cron processes due schedules up to the current day and uses the last day of the month when the configured day does not exist.
7. No duplicate pending record can be created for the same schedule and monthly competence.
8. Manual confirmation calls the simplified `BridgeService` and executes the transfer exactly once.
9. Confirming the same pending record twice cannot create duplicate bridge transactions.
10. Insufficient balance blocks confirmation, keeps the pending record open, and does not change balances.
11. Deactivating a schedule preserves history and prevents future pending records.
12. A dedicated frontend page lets the OWNER configure schedules, list schedules, view pending confirmations, confirm pending records, and see insufficient-balance errors clearly.
13. No taxes, Telegram/OCR changes, account selectors, or automatic pro-labore transfers are introduced.

Plans:

- [ ] 04-01-PLAN.md - Pre-flight dependency gate, Reversa deliverables, validation mapping, and RED tests for recurring pro-labore.
- [ ] 04-02-PLAN.md - Backend schema, service, API routes, cron generation, focused backend tests, and full backend suite boundary.
- [ ] 04-03-PLAN.md - Dedicated frontend page, API hooks, navigation, focused frontend test, and final backend/frontend validation boundary.

### Phase 6: Frontend Simplificado Existente

**Goal:** Remover da experiencia principal a complexidade de contas e impostos, alinhando payloads aos contratos backend simplificados.

**Depends on:** Phase 2, Phase 3, Phase 5

**Status:** Planned

**Success Criteria:**

1. Criacao de transacao nao exibe seletor de conta e nao envia `accountId`.
2. Criacao de transacao mantem categoria, valor, data, status e anexo.
3. Pro-labore manual nao exibe seletores de conta origem/destino.
4. Pro-labore manual envia apenas workspaces, valor, descricao e data.
5. Telegram config permite escolher workspace pessoal/empresa sem escolher conta.
6. Exibicao de transacoes nao destaca conta como elemento principal.
7. Exibicao de transacoes nao mostra imposto/liquido quando `taxAmount` e `netValue` forem `null`.
8. Tipos frontend tratam `accountId` como ausente nos payloads publicos simplificados.
9. Nenhuma recorrencia, pendencia, cron, backend change ou reescrita ampla de dashboard e criada nesta fase.

Plans:

- [x] 06-01-PLAN.md - TDD-first frontend plan for existing simplified transaction, bridge, Telegram, and transaction display flows.

### Phase S5-014: [HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes

**Goal:** Consolidar a visualizacao dos historicos de exportacoes existentes, aproveitando `ExportArchive` e a rota de download ja implementada, sem reabrir o core do `ExportService`/Dominio.

**Depends on:** S5-013

**Status:** Planned

**Scope:**

1. Criar ou ajustar tela/lista de historico de exportacoes.
2. Exibir periodo da exportacao, layout utilizado, data de geracao, usuario responsavel, status atual e acao de download/re-download.
3. Exibir `recordCount`, `warningsCount` e `hash` quando disponiveis.
4. Consumir `ExportArchive` existente sem recriar infraestrutura.
5. Aproveitar rota de download existente sem duplicar endpoint.
6. Garantir que `ACCOUNTANT` visualiza apenas historico do workspace autorizado.
7. Aplicar RLS/RBAC no historico.

**Out of Scope:**

1. Refazer `ExportService` ou layout Dominio.
2. Alterar encoding ou validacoes de exportacao.
3. Criar multi-ERP, NFS-e, TaxGuide ou PGDAS.

**Likely Files:**

1. `backend/src/services/ExportArchiveService.ts`
2. `backend/src/controllers/ExportController.ts`
3. `backend/src/routes.ts`
4. `frontend/src/pages/ExportHistoryPage.tsx`
5. `frontend/src/components/ExportDominioModal.tsx`

**Success Criteria:**

1. Listar historico por workspace retorna somente registros do workspace correto.
2. Cross-tenant tentando ver historico de outro workspace recebe `403 Forbidden`.
3. `ACCOUNTANT` autorizado lista historico com `200 OK` e dados filtrados.
4. Download de arquivo respeita RBAC e nega papeis sem permissao.
5. UI renderiza lista com dados reais e todos os campos esperados.
6. UI renderiza estado vazio amigavel quando nao ha exportacoes.
7. Download funciona a partir da tela.
8. RBAC e RLS estao aplicados e testados.

Plans:

- [x] S5-014-01-PLAN.md - TDD backend plan for tenant-safe export history listing API over existing ExportArchive records.
- [x] S5-014-02-PLAN.md - TDD frontend plan for inline collapsed export history cards inside the Extract screen.
