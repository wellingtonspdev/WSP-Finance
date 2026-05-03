# Relatório de Confiança - WSP-Finance

> Gerado pelo Revisor em 2026-05-03.
> Status: finalizado sem respostas do usuário; lacunas de produto permanecem pendentes em `_reversa_sdd/questions.md`.

---

## Resumo Geral

| Nível | Quantidade | Percentual |
|---|---:|---:|
| CONFIRMADO | 676 | 98,5% |
| INFERIDO | 5 | 0,7% |
| LACUNA | 5 | 0,7% |
| **Total** | 686 | 100% |

**Confiança geral:** 98,9%
Cálculo: `(CONFIRMADO + INFERIDO * 0.5) / TOTAL`.

## Por Spec

| Spec | CONFIRMADO | INFERIDO | LACUNA | Confiança |
|---|---:|---:|---:|---:|
| `sdd/accountant.md` | 33 | 0 | 0 | 100% |
| `sdd/auth.md` | 67 | 2 | 3 | 94,4% |
| `sdd/bank-movements.md` | 37 | 0 | 0 | 100% |
| `sdd/external-data.md` | 31 | 0 | 0 | 100% |
| `sdd/finance-core.md` | 49 | 0 | 0 | 100% |
| `sdd/frontend-shell.md` | 40 | 0 | 0 | 100% |
| `sdd/imports-open-finance.md` | 31 | 0 | 0 | 100% |
| `sdd/rbac-rls.md` | 167 | 2 | 1 | 98,8% |
| `sdd/uploads-storage.md` | 31 | 0 | 0 | 100% |
| `sdd/workspaces.md` | 190 | 1 | 1 | 99,2% |

## Lacunas Pendentes

### `sdd/auth.md`

- Política produtiva de `JWT_SECRET` não confirmada.
  - Pergunta correspondente: `questions.md#pergunta-2`
  - Status: não respondida
- Requisito criptográfico para OTP não confirmado.
  - Pergunta correspondente: `questions.md#pergunta-3`
  - Status: não respondida
- Provider de e-mail produtivo não confirmado.
  - Pergunta correspondente: `questions.md#pergunta-4`
  - Status: não respondida

### `sdd/rbac-rls.md`

- Validação explícita de prefixo `Bearer` ainda está como requisito recomendado, mas não implementado.
  - Sem pergunta obrigatória; achado técnico confirmado.

### `sdd/workspaces.md`

- Decisão sobre contador poder gerenciar certificado A1 ainda não está definida.
  - Pergunta correspondente: `questions.md#pergunta-1`
  - Status: não respondida

### Lacunas de Produto em Outros Artefatos

- Política de autenticação/rate limit para endpoints CNPJ/CEP.
  - Pergunta correspondente: `questions.md#pergunta-5`
  - Status: não respondida
- Política de fallback para `OPEN_FINANCE_WEBHOOK_KEY`.
  - Pergunta correspondente: `questions.md#pergunta-6`
  - Status: não respondida
- Natureza do feed lateral do hub contador (`mockEvents` temporário vs produto real).
  - Pergunta correspondente: `questions.md#pergunta-7`
  - Status: não respondida
- Contrato oficial de `Transaction.id` entre backend e frontend.
  - Pergunta correspondente: `questions.md#pergunta-8`
  - Status: não respondida

## Revisão Cruzada

- Engine externa consultada: não realizada
- Motivo: nenhuma ferramenta `codex:*` disponível nesta sessão
- Apontamentos recebidos: 0
- Aceitos: 0 | Rejeitados: 0 | Pendentes: 0

## Histórico de Reclassificações

| De | Para | Afirmação | Evidência |
|---|---|---|---|
| LACUNA | CONFIRMADO | Feed do contador usa `mockEvents`. | `frontend/src/features/accountant/routes/AccountantHubPage.tsx` |
| LACUNA | CONFIRMADO | Cache só remove stale entries sem erros. | `backend/src/services/AccountantCacheService.ts` |
| LACUNA | CONFIRMADO | Rotas CNPJ/CEP não usam AuthMiddleware. | `backend/src/routes.ts` |
| LACUNA | CONFIRMADO | ExternalDataController retorna 500 em validação/provider. | `backend/src/controllers/ExternalDataController.ts` |
| LACUNA | CONFIRMADO | CEP backend/frontend divergente. | `useExternalData.ts`, `CreateWorkspaceForm.tsx` |
| LACUNA | CONFIRMADO | `Transaction.id` diverge entre schema e frontend. | `backend/prisma/schema.prisma`, `frontend/src/features/transactions/types/index.ts` |
| LACUNA | CONFIRMADO | `BridgeService` usa `crypto.randomUUID()` sem import explícito. | `backend/src/services/BridgeService.ts` |
| LACUNA | CONFIRMADO | `WorkspaceGuard` usa `as any`. | `frontend/src/shared/components/guards/WorkspaceGuard.tsx` |
| LACUNA | CONFIRMADO | `isForbidden` não é consumido por UI encontrada. | `frontend/src/shared/stores/useWorkspaceStore.ts` |
| LACUNA | CONFIRMADO | Webhook usa fallback `webhook-auth-key-mock`. | `backend/src/services/OpenFinanceWebhookService.ts` |
| LACUNA | CONFIRMADO | Auth não valida prefixo Bearer explicitamente. | `backend/src/middlewares/AuthMiddleware.ts` |
| LACUNA | CONFIRMADO | Provider local de upload altera semântica de key. | `backend/src/providers/LocalStorageProvider.ts` |
| LACUNA | CONFIRMADO | Handler local grava `filename` direto em `uploads`. | `backend/src/controllers/UploadController.ts` |

## Recomendações

- Validar as 8 perguntas em `_reversa_sdd/questions.md` antes de usar as specs como contrato definitivo de produto.
- Priorizar decisões críticas: `JWT_SECRET`, webhook Open Finance, endpoints externos públicos e contrato de `Transaction.id`.
- Se as respostas forem fornecidas depois, atualizar specs afetadas e recalcular este relatório.

## Fechamento da Revisão

| Item | Resultado |
|---|---:|
| Specs revisadas | 10 |
| Matrizes revisadas | 2 |
| Perguntas geradas | 8 |
| Perguntas respondidas | 0 |
| Reclassificações realizadas | 13 |
| Revisão cruzada externa | Não disponível nesta sessão |
| Status final | Concluído com lacunas de produto pendentes |
