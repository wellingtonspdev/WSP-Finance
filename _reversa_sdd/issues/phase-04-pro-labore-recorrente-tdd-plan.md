# TDD Plan - Phase 4 Pro-labore Recorrente Com Pendencia

## Objetivo testavel

Provar que recorrencia mensal cria pendencias, confirmacao manual executa bridge uma unica vez, e UI permite operar o fluxo sem expor conta bancaria ou impostos.

## Estrategia TDD

- Primeiro: testes de service para regras de negocio, idempotencia e saldo insuficiente.
- Depois: teste de CronService provando que nao chama transferencia.
- Depois: teste de rota para contrato HTTP.
- Depois: teste de pagina React para criar/listar/confirmar/erro/inativo.

## Cenarios cobertos

- Criar agendamento valido BUSINESS -> PERSONAL.
- Bloquear origem e destino iguais.
- Bloquear usuario sem OWNER.
- Gerar pendencia no ultimo dia do mes quando `dayOfMonth` excede o mes.
- Usar `upsert` por `scheduleId + competence`.
- Confirmar pendencia chama BridgeService com `bridgeId` duravel.
- Confirmar pendencia ja concluida nao duplica BridgeService.
- Saldo insuficiente registra erro e mantem pendencia aberta.
- Desativar agendamento preserva historico.
- Frontend cria agendamento, lista pendencia, confirma, mostra saldo insuficiente e exibe inativo.

## Comandos planejados

```powershell
cd backend
pnpm exec prisma validate
pnpm exec tsc --noEmit
pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/services/CronService.recurring-pro-labore.test.ts tests/routes/RecurringProLabore.route.test.ts
pnpm test

cd frontend
pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx
pnpm test
pnpm run build
```

## Criterios de bloqueio

- Falha nos testes focados da Phase 4.
- Cron chamando bridge diretamente.
- UI enviando accountId ou imposto.
- Confirmacao sem idempotencia duravel.
