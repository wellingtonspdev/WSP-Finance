# Development Agent Prompt - Phase 4 Pro-labore Recorrente Com Pendencia

Voce esta trabalhando no projeto WSP Finance.

Tarefa: implementar pro-labore recorrente mensal com pendencia para confirmacao manual.

Contexto obrigatorio:

- Leia `AGENTS.md`.
- Leia os artefatos desta issue em `_reversa_sdd/issues/phase-04-pro-labore-recorrente-*`.
- Leia `.planning/phases/04-pro-labore-recorrente-com-pendencia/04-01-PLAN.md`, `04-02-PLAN.md`, `04-03-PLAN.md`.

Regras obrigatorias:

- Nao usar `git add .`.
- Nao stage/commit/push sem autorizacao.
- Nao executar transferencia automatica no cron.
- Nao pedir conta bancaria ao usuario.
- Nao reativar impostos.
- Confirmacao deve usar `BridgeService`.
- OWNER-only para operar recorrencia.

Implementacao esperada:

1. Prisma schema/migration para schedules e pendings.
2. `RecurringProLaboreService` com criacao, listagem, desativacao, geracao e confirmacao.
3. Extensao estreita de `BridgeService` para `bridgeId` opcional e idempotencia por FITID.
4. Rotas globais autenticadas `/recurring-pro-labore`.
5. Cron que gera pendencias.
6. Pagina frontend dedicada `/:workspaceId/pro-labore`.
7. Testes backend/frontend focados.

Validacoes:

```powershell
cd backend
pnpm exec prisma validate
pnpm exec tsc --noEmit
pnpm test -- tests/services/RecurringProLaboreService.test.ts tests/services/CronService.recurring-pro-labore.test.ts tests/routes/RecurringProLabore.route.test.ts

cd frontend
pnpm test -- tests/features/recurring-pro-labore/RecurringProLaborePage.test.tsx
pnpm run build
```
