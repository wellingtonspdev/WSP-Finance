# Technical Analysis - Phase 4 Pro-labore Recorrente Com Pendencia

## Identificacao

- Issue: Phase 4 - Pro-labore recorrente com pendencia
- Data: 2026-05-31
- Branch: nao alterada por este agente

## Modulos afetados

- finance-core
- workspaces
- rbac-rls
- frontend-shell
- banco/schema
- cron

## Evidencias consultadas

| Fonte | Caminho | Observacao |
|---|---|---|
| Plano | `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-01-PLAN.md` | Checkpoint Phase 3/6 e testes RED |
| Plano | `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-02-PLAN.md` | Backend, schema, cron, idempotencia |
| Plano | `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-03-PLAN.md` | Frontend, pagina propria, validacoes |
| Codigo | `backend/src/services/BridgeService.ts` | Bridge manual simplificado com contas padrao |
| Codigo | `frontend/src/features/workspaces/api/executeBridgeTransfer.ts` | Payload publico sem accountId |

## Fluxo tecnico implementado

1. `RecurringProLaboreSchedule` guarda origem BUSINESS, destino PERSONAL, valor, dia, descricao, ativo e criador.
2. `RecurringProLaborePending` guarda execucao mensal por competencia, status e `bridgeId` duravel.
3. `CronService.generateRecurringProLaborePendings` chama apenas a geracao de pendencias.
4. `RecurringProLaboreService.confirmPending` faz claim idempotente, chama `BridgeService.executeTransfer` com `bridgeId` e conclui a pendencia.
5. `BridgeService` aceita `bridgeId` opcional e reutiliza FITIDs deterministicos para nao duplicar transferencia em retry.
6. Frontend usa rota dedicada `/:workspaceId/pro-labore`, sem account selectors e sem campos fiscais.

## Contratos que nao podem quebrar

- `Transaction.id` continua string/UUID.
- `Account.id` e `Workspace.id` continuam number.
- Bridge manual publico continua sem `accountId`.
- Cron nunca movimenta saldo.
- Backend continua autoridade para OWNER, direcao BUSINESS -> PERSONAL, saldo e idempotencia.

## Riscos

| Risco | Severidade | Mitigacao |
|---|---|---|
| Dupla confirmacao concorrente | alta | `bridgeId` duravel, update atomic de pendencia e FITIDs unicos |
| Retry apos sucesso antes de marcar pendencia | alta | BridgeService retorna transferencia existente por FITID |
| Saldo insuficiente fechar pendencia indevidamente | alta | Erro persiste `lastError` e mantem status PENDING |
| Cron movimentar saldo | critica | Cron chama apenas `generateDuePendings`; testes cobrem delegacao |
