# Gaps Revisados - WSP-Finance

> Gerado pelo Revisor em 2026-05-03.
> `doc_level=detalhado`: lacunas categorizadas por severidade.

## Críticos

| Gap | Evidência | Pergunta relacionada | Status |
|---|---|---|---|
| Política produtiva de `JWT_SECRET` indefinida; código possui fallback hardcoded. | `_reversa_sdd/sdd/auth.md`, `backend/src/middlewares/AuthMiddleware.ts` | Pergunta 2 | Pendente de validação |
| Webhook Open Finance tem segredo fallback quando env não existe. | `_reversa_sdd/sdd/imports-open-finance.md`, `backend/src/services/OpenFinanceWebhookService.ts` | Pergunta 6 | Pendente de validação |
| Rotas CNPJ/CEP estão públicas, com risco de custo/abuso de provider externo. | `_reversa_sdd/sdd/external-data.md`, `backend/src/routes.ts` | Pergunta 5 | Pendente de validação |
| Contrato `Transaction.id` diverge entre Prisma UUID string e frontend number. | `_reversa_sdd/sdd/finance-core.md`, `backend/prisma/schema.prisma`, `frontend/src/features/transactions/types/index.ts` | Pergunta 8 | Pendente de validação |

## Moderados

| Gap | Evidência | Pergunta relacionada | Status |
|---|---|---|---|
| Decisão de produto sobre contador gerenciar certificado A1 não está explícita. | `_reversa_sdd/sdd/workspaces.md`, rota com `RbacMiddleware('OWNER')` | Pergunta 1 | Pendente de validação |
| OTP usa `Math.random`, sem política criptográfica definida. | `_reversa_sdd/sdd/auth.md` | Pergunta 3 | Pendente de validação |
| Provider de e-mail produtivo não foi comprovado; código analisado usa Ethereal. | `_reversa_sdd/sdd/auth.md` | Pergunta 4 | Pendente de validação |
| `BridgeService` chama `crypto.randomUUID()` sem import explícito. | `_reversa_sdd/sdd/finance-core.md`, `backend/src/services/BridgeService.ts` | N/A | Achado confirmado |
| `useExternalLocation` tipa resposta na raiz, enquanto backend retorna `{ address, metadata }`. | `_reversa_sdd/sdd/external-data.md`, `useExternalData.ts`, `CreateWorkspaceForm.tsx` | N/A | Achado confirmado |
| Aprovação idempotente de BankMovement pode colidir por workspace/account/description/date. | `_reversa_sdd/sdd/bank-movements.md`, `BankMovementService.ts` | N/A | Achado confirmado |
| Rotas financeiras de escrita usam Auth + Workspace, mas nem sempre RBAC explícito. | `_reversa_sdd/permissions.md`, `_reversa_sdd/sdd/rbac-rls.md` | N/A | Achado confirmado |

## Cosméticos / Documentação

| Gap | Evidência | Pergunta relacionada | Status |
|---|---|---|---|
| Feed lateral do contador usa `mockEvents`. | `_reversa_sdd/sdd/accountant.md`, `AccountantHubPage.tsx` | Pergunta 7 | Pendente de validação |
| `WorkspaceGuard` usa casts temporários `as any`. | `_reversa_sdd/sdd/frontend-shell.md`, `WorkspaceGuard.tsx` | N/A | Achado confirmado |
| `isForbidden` é setado, mas não há UI consumindo o estado. | `_reversa_sdd/sdd/frontend-shell.md`, `useWorkspaceStore.ts`, `axios.ts` | N/A | Achado confirmado |
| Provider local de uploads diverge da semântica R2 e rota local aceita `filename` direto. | `_reversa_sdd/sdd/uploads-storage.md` | N/A | Achado confirmado |
| Revisão não executou testes RLS/runtime; confiança é estática. | `_reversa_sdd/sdd/rbac-rls.md` | N/A | Limitação da revisão |
