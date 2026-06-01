# Handoff - Correcoes recomendadas apos analise de pendencias

## Identificacao

- Issue/task: Bootstrap readiness - correcoes recomendadas apos falhas de validacao backend
- Data: 2026-06-01
- Agente atual: Codex
- Proximo agente sugerido: Hiro
- Branch: `codex/bootstrap-readiness-fixes`
- Estado do git no momento do handoff:

```powershell
git branch --show-current
# codex/bootstrap-readiness-fixes

git status --short -uall
# M README.md
# M backend/.env.example
# M backend/.gitignore
# M backend/package.json
# M backend/src/server.ts
# M backend/src/test/setup-test-role.ts
# M frontend/eslint.config.js
# M frontend/src/app/AuthProvider.tsx
# M frontend/src/features/accountant/components/MovementCard.tsx
# M frontend/src/features/transactions/components/TransactionAccordionItem.tsx
# M frontend/src/features/transactions/hooks/useExportDominio.ts
# M frontend/src/features/workspaces/components/CreateWorkspaceForm.tsx
# M frontend/src/shared/components/ui/MoneyInput.tsx
# ?? backend/.env.test.example
```

## Objetivo da task

Continuar a execucao das correcoes recomendadas depois da analise detalhada das pendencias restantes do backend. O objetivo e corrigir testes/fixtures e documentar o problema ambiental do Prisma sem alterar regra de negocio do dashboard, schema Prisma ou dados financeiros de producao.

## Estado atual

- [x] Analise da issue concluida.
- [x] Analise tecnica inicial concluida.
- [x] Matching simplificado justificado: pendencias envolvem banco/testes/dados financeiros, mas a correcao recomendada e restrita a testes/fixtures e bootstrap local.
- [x] Plano TDD operacional incluido neste handoff.
- [x] Prompt de agente gerado neste handoff.
- [ ] Implementacao das correcoes recomendadas concluida.
- [ ] Revisao concluida.
- [x] Handoff de continuidade criado.

## O que ja foi feito nesta branch

Mudancas de bootstrap/readiness ja aplicadas antes deste handoff:

- `README.md` refeito com setup local, testes, seguranca e troubleshooting.
- `backend/.env.example` atualizado com defaults locais e placeholders nao secretos.
- `backend/.env.test.example` criado.
- `backend/.gitignore` ajustado para permitir versionar exemplos `.env.*.example`.
- `backend/package.json` ajustado para scripts Prisma via `pnpm exec`.
- `backend/src/server.ts` recebeu `GET /health`.
- `backend/src/test/setup-test-role.ts` passou a carregar `.env.test` antes de `.env` e falhar com erro claro quando `DIRECT_URL` estiver ausente.
- `frontend/eslint.config.js` ajustado para ignorar artefatos gerados e reduzir regras ruidosas.
- Pequenos fixes de lint em componentes/hooks frontend.

Nao houve stage, commit ou push.

## Analise detalhada das pendencias

### 1. Dashboard esperava `2710.10`, mas recebeu `2730.10`

Evidencia coletada por inspecao read-only do banco local:

- workspace pessoal: `workspaceId = 4`
- conta: `Conta PF Principal`, `accountId = 31`
- saldo da conta: `2730.10`
- total de transacoes no workspace: `7`
- transacoes demo: `6`
- saldo calculado apenas pelas transacoes demo: `2710.10`
- saldo geral incluindo transacao extra: `2730.10`
- transacao extra encontrada:
  - id: `76ce986b-77be-40db-bd78-2f694418f9fb`
  - descricao: `venda`
  - tipo: `INCOME`
  - valor: `20`
  - data: `2026-05-31`
  - `hashDeduplication`: `null`
  - `accountId`: `31`

Conclusao: nao ha evidencia de erro matematico no dashboard. O repositorio de dashboard soma o saldo real das contas do workspace. O valor `2730.10` e coerente com a contaminacao do banco local por uma transacao nao-demo de `20.00`. A falha e de isolamento de teste/fixture, nao de backend.

Arquivos provaveis:

- `backend/tests/services/DashboardService.test.ts`
- `backend/tests/routes/Dashboard.route.test.ts`
- `backend/src/repositories/DashboardRepository.ts`
- `backend/prisma/seed/modules/08_PersonalDemo.ts`

Correcao recomendada:

- Nao alterar `DashboardRepository.getTotalBalance()` apenas para satisfazer o teste.
- Ajustar os testes para nao dependerem do saldo contaminavel de um workspace pessoal compartilhado.
- Preferir uma das abordagens:
  1. criar workspace/conta/transacoes dedicadas ao teste de dashboard dentro do proprio teste;
  2. limpar apenas dados criados pelo proprio teste antes/depois, usando filtros seguros por marcador de teste;
  3. quando a intencao for validar o seed demo, filtrar apenas registros com `hashDeduplication` prefixado por `DEMO_PERSONAL_JOAO_`.

### 2. Teste do seed pessoal falha porque encontrou `hashDeduplication = null`

Falha observada:

```text
tests/seeds/PersonalDemoSeed.test.ts
esperava hashDeduplication truthy, mas encontrou null
```

Causa identificada:

- O teste consulta todas as transacoes do workspace pessoal.
- O workspace contem uma transacao nao-demo (`venda`) com `hashDeduplication = null`.
- Uma transacao real/user-created pode legitimamente nao ter hash demo.

Conclusao: o teste esta amplo demais. A invariant "hash estavel sem YYYY_MM" pertence ao seed demo, nao a todas as transacoes do workspace.

Arquivo principal:

- `backend/tests/seeds/PersonalDemoSeed.test.ts`

Correcao recomendada:

- Alterar a consulta do teste para validar somente transacoes do seed demo:

```ts
where: {
  workspaceId: personalWorkspaceId,
  hashDeduplication: {
    startsWith: "DEMO_PERSONAL_JOAO_"
  }
}
```

- Confirmar que o total esperado continua sendo `PERSONAL_DEMO_EXPECTED_COUNT`.
- Validar que nenhum hash demo contem sufixo mensal instavel como `YYYY_MM`.

### 3. `getMonthlyFlow` retornou `0` no teste completo

Evidencia:

- Em execucao focada posterior de `tests/seeds/PersonalDemoSeed.test.ts`, as falhas de `income > 0` e `expense > 0` nao persistiram.
- Inspecao read-only mostrou 6 transacoes demo no mes corrente:
  - income: `8500`
  - expense: `5789.90`
  - result: `2710.10`

Conclusao: aparencia de flakiness/interferencia entre testes. Provavel relacao com teste que move datas para outro mes e depois restaura, ou com ordem/concorrencia de execucao sobre o mesmo workspace/mes demo. Nao ha evidencia de bug persistente no `DashboardService`.

Arquivos provaveis:

- `backend/tests/seeds/PersonalDemoSeed.test.ts`
- `backend/src/services/DashboardService.ts`
- `backend/src/repositories/DashboardRepository.ts`

Correcao recomendada:

- Garantir isolamento temporal nos testes que alteram datas demo.
- Se algum teste move datas para janeiro de 2027, encapsular em `try/finally` robusto e restaurar com filtro apenas dos hashes demo.
- Evitar que testes de dashboard e seed compartilhem estado mutavel do mesmo workspace sem reset controlado.
- Se o runner executar arquivos em paralelo, considerar serializar esse arquivo de teste ou remover dependencia de estado global.

### 4. `pnpm run prisma:generate` falha com `EPERM rename query_engine-windows.dll.node.tmp...`

Erro observado mesmo com permissao elevada:

```text
EPERM: operation not permitted, rename
...\query_engine-windows.dll.node.tmpXXXXX
-> ...\query_engine-windows.dll.node
```

Evidencia adicional:

- Existem varios arquivos antigos `query_engine-windows.dll.node.tmp*` em:

```text
backend\node_modules\.pnpm\@prisma+client@6.19.2_...\node_modules\.prisma\client
```

- `pnpm run prisma:validate` passou.
- `pnpm exec tsc --noEmit` passou.

Conclusao: problema ambiental/local do Windows, lock de DLL ou arquivos temporarios antigos do Prisma Client. Nao ha indicio de schema quebrado.

Correcao recomendada:

- Nao alterar schema Prisma por causa desse erro.
- Antes de deletar arquivos temporarios, pedir autorizacao explicita ao usuario.
- Procedimento sugerido:
  1. fechar processos Node/Vite/Vitest/IDE que possam estar segurando Prisma Client;
  2. verificar processos Node ativos;
  3. com autorizacao, remover somente `query_engine-windows.dll.node.tmp*` dentro da pasta `.prisma/client`;
  4. rerodar `cd backend; pnpm run prisma:generate`.

## Plano TDD para o proximo agente

### Red

Reproduzir as falhas focadas antes de editar:

```powershell
cd backend
pnpm test -- tests/seeds/PersonalDemoSeed.test.ts
pnpm test -- tests/services/DashboardService.test.ts tests/routes/Dashboard.route.test.ts
```

Registrar se:

- o teste de hash ainda falha;
- os testes de saldo ainda recebem `2730.10`;
- as falhas de fluxo mensal reaparecem.

### Green

Implementar correcoes pequenas e localizadas:

1. Em `backend/tests/seeds/PersonalDemoSeed.test.ts`, filtrar as invariants do seed por `hashDeduplication` demo.
2. Em `backend/tests/services/DashboardService.test.ts` e `backend/tests/routes/Dashboard.route.test.ts`, remover dependencia do saldo contaminavel do workspace pessoal local. Preferir fixture dedicada ao teste.
3. Se houver teste que move datas demo, garantir restauracao em `finally` e filtro por prefixo demo.

### Refactor

- Manter helper pequeno se houver duplicacao de fixture entre rota e service.
- Nao introduzir `sysPrisma`, `managementClient` ou bypass de RLS em codigo de producao.
- Nao alterar o contrato do dashboard sem issue explicita.

## Validacoes executadas antes do handoff

| Comando | Resultado | Observacao |
|---|---|---|
| `git diff --check` | Passou | Apenas warnings de CRLF. |
| `cd backend; pnpm run prisma:validate` | Passou | Schema valido. |
| `cd backend; pnpm exec tsc --noEmit` | Passou | Typecheck backend valido. |
| `cd frontend; pnpm lint` | Passou com 2 warnings | 0 erros. |
| `cd frontend; pnpm test` | Passou | 26 arquivos, 195 testes. |
| `cd frontend; pnpm build` | Passou | Necessitou rerun fora do sandbox por `spawn EPERM`. |
| `cd backend; pnpm run prisma:generate` | Falhou | `EPERM rename query_engine-windows.dll.node.tmp...`; ambiental/local. |
| `cd backend; pnpm test` | Falhou | 5 falhas iniciais; depois reduzidas por rerun focado conforme analise. |

## Pendencias

### Bloqueantes

- [ ] Corrigir isolamento/escopo dos testes backend listados.
- [ ] Rerodar testes focados backend.
- [ ] Rerodar `pnpm exec tsc --noEmit` e `pnpm run prisma:validate` apos as correcoes.

### Nao bloqueantes

- [ ] Resolver `prisma:generate` ambiental com limpeza controlada dos temporarios Prisma, se o usuario autorizar.
- [ ] Avaliar serializacao ou isolamento adicional dos testes que mutam datas demo.

### Fora de escopo

- Alterar regra de negocio do dashboard.
- Alterar schema Prisma.
- Apagar dados reais do banco local sem autorizacao explicita.
- Stage, commit ou push sem autorizacao explicita.

## Riscos e cuidados

- Nunca usar `git add .`.
- Nunca usar `git reset --hard` ou `git clean -fd`.
- Preservar RLS/RBAC/LGPD.
- Nao criar `Transaction` diretamente a partir de OCR/Telegram.
- Nao gravar PII/raw OCR/payload sensivel em logs.
- Tratar `Transaction.id` como string/UUID.
- Tratar `Account.id` e `Workspace.id` como number.
- Separar no relatorio final:
  1. baseline herdado;
  2. arquivos tocados pela correcao atual;
  3. arquivos novos da correcao atual;
  4. arquivos fora de escopo intocados.

## Como continuar

1. Ler `AGENTS.md` e este handoff.
2. Confirmar estado da branch e diff:

```powershell
git branch --show-current
git status --short -uall
git diff --stat
git diff --name-status
git diff --check
```

3. Reproduzir testes focados backend.
4. Editar apenas testes/helpers necessarios.
5. Rerodar validacoes focadas.
6. Rerodar validacoes minimas da fase.
7. Entregar relatorio com P0/P1/P2/P3.

## Comandos recomendados

```powershell
cd backend
pnpm run prisma:validate
pnpm exec tsc --noEmit
pnpm test -- tests/seeds/PersonalDemoSeed.test.ts
pnpm test -- tests/services/DashboardService.test.ts tests/routes/Dashboard.route.test.ts
```

Se frontend nao for tocado, provar que ficou fora de escopo:

```powershell
git diff -- frontend
```

Validacao final de repo:

```powershell
git branch --show-current
git status --short -uall
git diff --stat
git diff --check
```

## Mensagem curta de continuidade

```markdown
Continuar a issue "Bootstrap readiness - correcoes recomendadas".

Estado atual:
- Branch: codex/bootstrap-readiness-fixes.
- Ja ha mudancas de bootstrap/readiness na branch.
- As falhas restantes do backend foram analisadas e parecem ser isolamento de teste/estado local, nao bug de dashboard/schema.

Ja foi feito:
- README/env/scripts/health/test setup/lint frontend ajustados.
- Validacoes frontend passaram.
- Prisma validate e backend tsc passaram.
- Backend test falha por testes contaminados pelo banco local.

Continue a partir de:
- Corrigir os testes backend para filtrar invariants demo por hash DEMO_PERSONAL_JOAO_* e isolar os testes de dashboard do saldo contaminavel do workspace pessoal.

Nao refaca:
- Nao alterar DashboardRepository para mascarar o saldo.
- Nao alterar schema Prisma por causa do EPERM do generate.
- Nao limpar banco ou arquivos tmp sem autorizacao explicita.
- Nao fazer stage/commit/push sem autorizacao.

Valide com:
- cd backend; pnpm run prisma:validate
- cd backend; pnpm exec tsc --noEmit
- cd backend; pnpm test -- tests/seeds/PersonalDemoSeed.test.ts
- cd backend; pnpm test -- tests/services/DashboardService.test.ts tests/routes/Dashboard.route.test.ts
- git diff --check
```
