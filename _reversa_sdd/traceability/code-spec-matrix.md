# Code-Spec Traceability Matrix - WSP Finance

> Matriz gerada na Fase 4 do Reversa. Escopo: documentação reversa baseada em leitura estática dos artefatos de Fases 1 a 3.

## Visão Geral

| Módulo | SDD | User stories | Fluxos | ADR / arquitetura | Confiança |
|---|---|---|---|---|---|
| Auth | `_reversa_sdd/sdd/auth.md` | `user-stories/onboarding-auth.md` | `flowcharts/auth*.md` | `domain.md`, `state-machines.md` | CONFIRMADO |
| Workspaces | `_reversa_sdd/sdd/workspaces.md` | `user-stories/workspace-management.md`, `certificate-a1-vault.md` | `flowcharts/workspaces*.md` | `adrs/005-secure-a1-vault.md` | CONFIRMADO |
| RBAC/RLS | `_reversa_sdd/sdd/rbac-rls.md` | `workspace-management.md`, `accountant-hub.md` | `flowcharts/rbac-rls*.md` | `adrs/001-multi-tenant-rls-zero-trust.md` | CONFIRMADO |
| Finance Core | `_reversa_sdd/sdd/finance-core.md` | `transaction-management.md`, `bridge-transfer.md` | `flowcharts/finance-core*.md` | `adrs/003-fiscal-closeduntil.md`, `adrs/006-bridge-double-entry.md` | CONFIRMADO |
| Uploads/Storage | `_reversa_sdd/sdd/uploads-storage.md` | `attachment-upload-view.md`, `certificate-a1-vault.md` | `flowcharts/uploads-storage*.md` | `architecture.md`, `adrs/005-secure-a1-vault.md` | CONFIRMADO |
| Imports/Open Finance | `_reversa_sdd/sdd/imports-open-finance.md` | `bank-import-approval.md` | `flowcharts/imports-open-finance.md` | `adrs/002-bank-movement-staging.md` | CONFIRMADO |
| Bank Movements | `_reversa_sdd/sdd/bank-movements.md` | `bank-import-approval.md`, `accountant-hub.md` | `flowcharts/bank-movements*.md` | `state-machines.md`, `adrs/002-bank-movement-staging.md` | CONFIRMADO |
| Accountant | `_reversa_sdd/sdd/accountant.md` | `accountant-hub.md` | `flowcharts/accountant*.md` | `adrs/004-accountant-cache.md` | CONFIRMADO |
| External Data | `_reversa_sdd/sdd/external-data.md` | `external-data-autofill.md` | `flowcharts/external-data.md` | `architecture.md` | CONFIRMADO/LACUNA |
| Frontend Shell | `_reversa_sdd/sdd/frontend-shell.md` | todas as histórias com UI | `flowcharts/frontend-shell*.md` | `c4-components.md` | CONFIRMADO |

## Código Backend por Spec

| Arquivo / área | Specs relacionadas | Regras cobertas | Lacunas associadas |
|---|---|---|---|
| `backend/src/controllers/AuthController.ts` | `sdd/auth.md`, OpenAPI Auth | registro, login, refresh, `/auth/me` | fallback `JWT_SECRET` está no middleware/service |
| `backend/src/services/AuthService.ts` | `sdd/auth.md`, `sdd/accountant.md` | tokens, email verificado, cache contador | OTP/provider e-mail dependem de outros services |
| `backend/src/services/VerificationService.ts` | `sdd/auth.md`, `onboarding-auth.md` | verificação e resend | OTP usa `Math.random` |
| `backend/src/services/PasswordResetService.ts` | `sdd/auth.md`, `onboarding-auth.md` | reset e invalidação de refresh tokens | força criptográfica do OTP não comprovada |
| `backend/src/controllers/WorkspaceController.ts` | `sdd/workspaces.md`, OpenAPI Workspaces | create/list/update/certificado | update exige `name` e `type` apesar de schema opcional |
| `backend/src/services/WorkspaceService.ts` | `sdd/workspaces.md`, `certificate-a1-vault.md` | taxRate, update owner, upload A1 | decisão contador gerenciar certificado não explícita |
| `backend/src/services/InviteService.ts` | `sdd/workspaces.md`, `workspace-management.md` | OWNER, double handshake, expiração | expiração persistida depende do fluxo chamado |
| `backend/src/middlewares/AuthMiddleware.ts` | `sdd/rbac-rls.md` | JWT e `req.user.id` | prefixo Bearer não validado explicitamente |
| `backend/src/middlewares/WorkspaceMiddleware.ts` | `sdd/rbac-rls.md`, `sdd/workspaces.md` | membership, tenant context, zero-trust | depende de rotas aplicarem o middleware |
| `backend/src/middlewares/RbacMiddleware.ts` | `sdd/rbac-rls.md` | hierarquia de roles | nem toda escrita financeira usa RBAC explícito |
| `backend/src/lib/prisma.ts` | `sdd/rbac-rls.md` | `set_config`, transações, RLS context | uso de `sysPrisma` exige disciplina por módulo |
| `backend/src/lib/checkEnvironment.ts` | `sdd/rbac-rls.md` | bloqueio superuser/bypassrls | validação runtime não executada nesta fase |
| `backend/src/services/TransactionService.ts` | `sdd/finance-core.md`, `transaction-management.md` | lock fiscal, saldo, auditoria, marketplace | divergência de tipo `Transaction.id` frontend |
| `backend/src/services/BridgeService.ts` | `sdd/finance-core.md`, `bridge-transfer.md` | bridge atômica dupla | possível `crypto.randomUUID()` sem import explícito |
| `backend/src/services/UploadService.ts` | `sdd/uploads-storage.md`, `attachment-upload-view.md` | quota, presigned, signed view | fallback local diverge de R2 |
| `backend/src/providers/S3StorageProvider.ts` | `sdd/uploads-storage.md`, `certificate-a1-vault.md` | presign, SSE-C, vault | depende de env `VAULT_MASTER_KEY` correto |
| `backend/src/services/FinancialIngestionEngine.ts` | `sdd/imports-open-finance.md`, `bank-import-approval.md` | normalização, hash, chunks | accountId/workspaceId não validado neste módulo |
| `backend/src/services/FuzzyDeduplicationService.ts` | `sdd/bank-movements.md` | pg_trgm/fallback | frontend agrupa duplicatas de forma diferente |
| `backend/src/services/BankMovementService.ts` | `sdd/bank-movements.md`, `bank-import-approval.md` | approve/reject/merge | idempotência pode colidir em casos legítimos |
| `backend/src/services/AccountantCacheService.ts` | `sdd/accountant.md`, `accountant-hub.md` | cache multi-workspace | falhas parciais mantêm caches antigos |
| `backend/src/infra/external/ExternalDataService.ts` | `sdd/external-data.md`, `external-data-autofill.md` | cache, circuit breaker, fallback | endpoint público e contrato CEP divergente |

## Código Frontend por Spec

| Arquivo / área | Specs relacionadas | Regras cobertas | Lacunas associadas |
|---|---|---|---|
| `frontend/src/app/AuthProvider.tsx` | `sdd/auth.md`, `sdd/frontend-shell.md` | restore, login/logout, dashboard cache | depende de refresh token local |
| `frontend/src/shared/lib/axios.ts` | `sdd/auth.md`, `sdd/frontend-shell.md`, `sdd/rbac-rls.md` | Bearer, refresh queue, workspace header | derivação por URL precisa acompanhar rotas novas |
| `frontend/src/app/WorkspaceProvider.tsx` | `sdd/workspaces.md`, `sdd/frontend-shell.md` | workspace ativo | contrato de memberships precisa seguir auth payload |
| `frontend/src/shared/stores/useWorkspaceStore.ts` | `sdd/workspaces.md` | persistência workspace/forbidden | UX final de forbidden não comprovada |
| `frontend/src/shared/components/guards/WorkspaceGuard.tsx` | `sdd/frontend-shell.md`, `sdd/rbac-rls.md` | guardas por persona/workspace | casts `as any` indicam contrato frouxo |
| `frontend/src/features/workspaces/components/CreateWorkspaceForm.tsx` | `sdd/workspaces.md`, `sdd/external-data.md` | criação, CNPJ, CEP | resposta CEP divergente |
| `frontend/src/features/workspaces/routes/TeamSettingsPage.tsx` | `sdd/workspaces.md`, `certificate-a1-vault.md` | membros, convites, certificado | arquivo estava modificado antes desta fase |
| `frontend/src/features/accountant/routes/AccountantHubPage.tsx` | `sdd/accountant.md`, `accountant-hub.md` | hub e cache | `mockEvents` não vem de backend |
| `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx` | `sdd/bank-movements.md`, `bank-import-approval.md` | inbox global/workspace | agrupamento client-side diverge do fuzzy backend |
| `frontend/src/features/transactions/components/AttachmentPreview.tsx` | `sdd/uploads-storage.md`, `attachment-upload-view.md` | fetch signed URL e blob | depende de headers retornados pelo backend |

## Requisitos Críticos e Evidência

| Requisito | Evidência primária | Evidência complementar | Status |
|---|---|---|---|
| Registro cria workspace pessoal e OWNER | `sdd/auth.md` | `domain.md`, `code-analysis.md` | Especificado |
| Login exige e-mail verificado | `sdd/auth.md` | `state-machines.md` | Especificado |
| Rotas por workspace validam membership | `sdd/rbac-rls.md` | `sdd/workspaces.md` | Especificado |
| RLS protege dados financeiros | `sdd/rbac-rls.md` | ADR 001, migrations | Especificado, não executado runtime |
| Contador não acessa workspace pessoal | `sdd/rbac-rls.md` | `permissions.md` | Especificado |
| Transação paga altera saldo e audita | `sdd/finance-core.md` | `state-machines.md` | Especificado |
| Fechamento fiscal bloqueia retroação | `sdd/finance-core.md` | `state-machines.md` | Especificado |
| BankMovement não altera saldo até aprovação | `sdd/bank-movements.md` | ADR 002 | Especificado |
| Certificado A1 usa vault seguro | `sdd/workspaces.md`, `sdd/uploads-storage.md` | ADR 005 | Especificado |
| Cache do contador materializa KPIs | `sdd/accountant.md` | ADR 004 | Especificado |
| CNPJ/CEP têm fallback externo | `sdd/external-data.md` | `architecture.md` | Especificado com lacunas |

## Lacunas Consolidadas

| Lacuna | Impacto | Fonte |
|---|---|---|
| Testes RLS não executados contra banco real nesta fase | Risco de diferença entre leitura estática e runtime | `sdd/rbac-rls.md` |
| Rotas financeiras de escrita sem RBAC explícito em alguns pontos | Risco de autorização permissiva se service não compensar | `permissions.md`, `architecture.md` |
| Endpoint CNPJ/CEP público | Risco de abuso de provider externo | `sdd/external-data.md` |
| Contrato CEP backend/frontend divergente | Risco de autocomplete quebrado | `sdd/external-data.md` |
| Frontend `Transaction.id` como number vs Prisma UUID string | Risco de bug de tipagem/integração | `sdd/finance-core.md` |
| `BridgeService` com possível `crypto.randomUUID()` sem import | Risco de build/runtime | `sdd/finance-core.md` |
| Feed lateral do contador usa `mockEvents` | Risco de percepção de dado real inexistente | `sdd/accountant.md` |
| Webhook Open Finance tem segredo fallback | Risco de configuração insegura | `sdd/imports-open-finance.md` |

## Status da Fase 4

| Item | Arquivo | Status |
|---:|---|---|
| 1 | `_reversa_sdd/sdd/auth.md` | Concluído |
| 2 | `_reversa_sdd/sdd/workspaces.md` | Concluído |
| 3 | `_reversa_sdd/sdd/rbac-rls.md` | Concluído |
| 4 | `_reversa_sdd/sdd/finance-core.md` | Concluído |
| 5 | `_reversa_sdd/sdd/uploads-storage.md` | Concluído |
| 6 | `_reversa_sdd/sdd/imports-open-finance.md` | Concluído |
| 7 | `_reversa_sdd/sdd/bank-movements.md` | Concluído |
| 8 | `_reversa_sdd/sdd/accountant.md` | Concluído |
| 9 | `_reversa_sdd/sdd/external-data.md` | Concluído |
| 10 | `_reversa_sdd/sdd/frontend-shell.md` | Concluído |
| 11 | `_reversa_sdd/openapi/wsp-finance-api.yaml` | Concluído |
| 12 | `_reversa_sdd/user-stories/onboarding-auth.md` | Concluído |
| 13 | `_reversa_sdd/user-stories/workspace-management.md` | Concluído |
| 14 | `_reversa_sdd/user-stories/transaction-management.md` | Concluído |
| 15 | `_reversa_sdd/user-stories/bank-import-approval.md` | Concluído |
| 16 | `_reversa_sdd/user-stories/accountant-hub.md` | Concluído |
| 17 | `_reversa_sdd/user-stories/certificate-a1-vault.md` | Concluído |
| 18 | `_reversa_sdd/user-stories/bridge-transfer.md` | Concluído |
| 19 | `_reversa_sdd/user-stories/attachment-upload-view.md` | Concluído |
| 20 | `_reversa_sdd/user-stories/external-data-autofill.md` | Concluído |
| 21 | `_reversa_sdd/traceability/code-spec-matrix.md` | Concluído |
