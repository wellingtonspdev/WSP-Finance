# ADR-001: Justificativa Arquitetural do Plano de Estabilizacao (PR1 ao PR4)

## Status

Proposto para aprovacao final de governanca em 2026-04-13.

## Contexto

O Plano Mestre de Estabilizacao de Banco de Dados foi priorizado fora da trilha normal de features porque o risco acumulado deixou de ser apenas tecnico. A combinacao de privilegios excessivos no runtime, crescimento de custo computacional sem controle, divergencia potencial entre saldo contabil e trilha de auditoria, e fragilidade na ingestao do Open Finance criava um risco composto com impacto juridico, financeiro e operacional.

Em termos executivos, a decisao nao foi entre "refatorar ou nao refatorar". A decisao real foi entre:

1. interromper momentaneamente a entrega de novas features para blindar a fundacao do produto; ou
2. manter a velocidade aparente e aceitar a probabilidade de vazamento entre tenants, saturacao do plano gratuito, saldo contabil incorreto e perda silenciosa de eventos bancarios.

A organizacao escolheu a primeira opcao.

## Decisao

Formalizamos que os PRs 1 a 4 do Plano de Estabilizacao tiveram prioridade maxima sobre features de negocio porque tratavam riscos existenciais do produto:

- PR1: integridade contabil e reconciliacao de saldo
- PR2: seguranca Zero-Trust no runtime Prisma/PostgreSQL
- PR3: performance e resiliencia da fila de ingestao financeira
- PR4: otimizacao do query planner sob RLS e prevencao de bloat/estatisticas frias

Essa priorizacao foi uma decisao de arquitetura, seguranca e compliance, nao uma melhoria cosmetica.

## Drivers da Decisao

- proteger isolamento entre clientes sob LGPD e principio de menor privilegio
- preservar o modelo inicial de Zero OpEx no Supabase Free
- impedir surgimento de "dinheiro fantasma" em `Account.balance`
- evitar perda de webhooks e timeouts na esteira de Open Finance
- criar trilha de auditoria defensavel perante stakeholders, fiscalizacao e incident response

## Justificativas Executivas

### 1. LGPD e Zero-Trust (SecOps)

Antes da intervencao, o maior risco nao era um bug funcional isolado, mas o fato de o runtime poder operar com privilegios que neutralizam o RLS na pratica. Em PostgreSQL, uma role com `BYPASSRLS` ou `SUPERUSER` transforma a seguranca multi-tenant em uma convencao de aplicacao, e nao em um controle estrutural de dados.

Isso e inaceitavel sob uma otica de LGPD e Zero-Trust. Bastaria uma consulta sem filtro, uma regressao de repository ou uma rota mal protegida para expor dados de um cliente a outro. O impacto potencial inclui incidente de seguranca, obrigacao de notificacao, dano reputacional e risco de sancao regulatoria.

Mitigacao arquitetural adotada:

- fail-fast em runtime com `process.exit(1)` quando a role conectada possui `rolsuper` ou `rolbypassrls`
- separacao explicita entre `DATABASE_URL` de runtime via pooler e `DIRECT_URL` para operacoes administrativas/migrations
- manutencao do RLS como controle primario no banco, e nao como disciplina opcional na camada de aplicacao

Conclusao executiva: a refatoracao foi uma medida de prevencao de vazamento massivo entre tenants, com impacto direto em compliance e continuidade do negocio.

### 2. FinOps e Zero OpEx Inicial

Sem controle de conexoes, sem indices alinhados ao padrao real de consulta e sem estatisticas quentes do planner, o produto ficaria dependente de sequential scans caros justamente no ambiente com menor margem operacional: Supabase Free.

Na pratica, isso significa consumir CPU e slots de conexao com queries evitaveis, degradar latencia das operacoes criticas e colapsar a API em picos modestos. O risco nao era teorico: RLS mal otimizado, combinado com consultas recorrentes de inbox/pendencias e ingestao financeira, pressiona exatamente os recursos mais escassos do plano gratuito.

Mitigacao arquitetural adotada:

- `connection_limit=1` no Prisma de runtime para evitar fan-out de conexoes
- uso do pooler na porta 6543 para trafego de aplicacao e `DIRECT_URL` 5432 apenas para operacoes que exigem conexao direta
- indice B-Tree com `date DESC` para prefiltrar consultas operacionais
- indice GIN com `pg_trgm` para fuzzy matching controlado
- preparacao de rotina de aquecimento de estatisticas e ajuste preventivo de autovacuum para tabelas de alto churn

Conclusao executiva: sem essa intervencao, a promessa de operar com Zero OpEx inicial ficaria comprometida por exaustao prematura de CPU e das 20 conexoes disponiveis.

### 3. Responsabilidade Solidaria e Integridade Contabil

Em software financeiro, um saldo divergente nao e apenas um bug visual. Ele contamina demonstracoes, reconciliacoes, decisao operacional e rastreabilidade de eventos economicos. Quando `Account.balance` pode divergir do historico de transacoes e movimentos aprovados sem trilha atomica de ajuste, o sistema passa a produzir "dinheiro fantasma".

Isso eleva o risco para alem da engenharia. Dependendo do uso do sistema, uma divergencia induzida por software pode sustentar decisao contabil incorreta, gerar retrabalho fiscal e deslocar responsabilidade para quem desenvolveu e operou a plataforma.

Mitigacao arquitetural adotada:

- atualizacao atomica de saldo com `increment`/`decrement`
- ampliacao do `AuditLog` com `balanceBefore`, `balanceAfter`, `delta`, `fromAccount` e `toAccount`
- trilha estruturada para transacoes, aprovacao de movimentos e transferencias em ponte
- script de reconciliacao para comparar `Account.balance` com reconstrucao historica
- script de reparo com auditoria explicita para corrigir drift sem apagar evidencia

Conclusao executiva: a refatoracao blindou o produto contra divergencia contabil silenciosa e reduziu o risco de passivo operacional e juridico associado a saldo incorreto.

### 4. Resiliencia do Open Finance

O Open Finance nao falha de forma elegante quando a base fica lenta. Ele acumula jitter, eleva latencia, pressiona filas e eventualmente perde janela de processamento. Em especial, fuzzy matching sobre `pg_trgm` sem estrategia de degradacao pode transformar um mecanismo de deduplicacao em ponto unico de timeout.

O risco de negocio era claro: perder webhooks, aprovar atrasado, duplicar ou deixar de registrar eventos de clientes. Em termos operacionais, isso deteriora confianca no produto e aumenta custo humano de conciliacao manual.

Mitigacao arquitetural adotada:

- indice GIN para o caminho preferencial de similaridade
- indice B-Tree para reduzir o universo candidato antes do fuzzy matching
- fallback automatico para `LIKE/LOWER()` com similaridade aproximada em application layer quando `pg_trgm` falha, expira ou nao esta disponivel
- comportamento resiliente na `FinancialIngestionEngine`: se a deduplicacao fuzzy falhar, o lote nao e perdido; o movimento segue para persistencia

Conclusao executiva: a refatoracao converteu uma esteira fragil de ingestao em uma esteira degradavel, capaz de preservar continuidade mesmo sob falha parcial do mecanismo fuzzy.

## Evidencias Tecnicas Auditadas

### Consolidado no codigo atual

- `backend/prisma/schema.prisma`
  - datasource com `DATABASE_URL` e `DIRECT_URL`
  - indice B-Tree `@@index([workspaceId, status, amount, date(sort: Desc)], map: "idx_bank_movements_workspace_status_amount_date")`
  - indice GIN `@@index([description(ops: raw("gin_trgm_ops"))], map: "idx_bank_movements_description_trgm", type: Gin)`
- `backend/prisma/migrations/20260412021800_enable_pg_trgm_fuzzy_index/migration.sql`
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm`
  - `CREATE INDEX ... USING gin (description gin_trgm_ops)`
- `backend/prisma/migrations/20260412220500_add_bank_movement_fuzzy_prefilter_btree/migration.sql`
  - indice B-Tree com `date DESC`
- `backend/src/lib/checkEnvironment.ts`
  - validacao de `rolsuper` e `rolbypassrls`
- `backend/src/server.ts`
  - hard crash com `process.exit(1)` no startup em caso de privilegio excessivo
- `backend/src/lib/prisma.ts`
  - runtime Prisma limitado por `connection_limit`
- `backend/src/services/FuzzyDeduplicationService.ts`
  - caminho preferencial com `pg_trgm`
  - fallback `LIKE/LOWER()` e chaveamento automatico em timeout/indisponibilidade
- `backend/src/services/FinancialIngestionEngine.ts`
  - ingestao resiliente que nao perde o lote se a deduplicacao fuzzy falhar
- `backend/src/services/TransactionService.ts`
- `backend/src/services/BankMovementService.ts`
- `backend/src/services/BridgeService.ts`
  - gravacao atomica de `balanceBefore`, `balanceAfter` e `delta`
- `scripts/reconcile_account_balances.sql`
  - reconstrucao de saldo a partir do historico
- `scripts/fix_account_balances.sql`
  - reparo controlado com insercao de `AuditLog`

### Cobertura de testes encontrada no repositorio

- `backend/tests/integration/prisma-runtime-role.test.ts`
- `backend/tests/services/BridgeService.balance-audit.test.ts`
- `backend/tests/services/FinancialIngestionEngine.test.ts`
- `backend/tests/services/FuzzyDeduplicationService.test.ts`

## Achados de Governanca Antes do Aceite Final

### Gap 1: o ajuste de RLS cacheavel ainda nao esta consolidado no Git

As migrations versionadas de RLS ainda usam `current_setting('app.current_workspace_id', true)::int` de forma direta. O padrao cacheavel com subquery `(SELECT current_setting(...))`, que reduz penalidade do planner sob RLS, aparece em:

- `scripts/db_health_check.sql`
- `backend/prisma/migrations/20260413052239_optimize_rls_and_statistics/migration.sql`

Porem, essa migration `20260413052239_optimize_rls_and_statistics` esta presente apenas no working tree local e ainda nao foi adicionada ao controle de versao.

Impacto: o racional de PR4 esta correto, mas a evidencia consolidada no repositrio ainda esta parcial.

### Gap 2: script de ANALYZE/autovacuum preventivo ainda nao esta versionado

O arquivo `backend/scripts/optimize_vacuum_analyze.sql` contem:

- `ANALYZE` nas tabelas criticas
- ajuste de `autovacuum_vacuum_scale_factor`
- ajuste de `autovacuum_analyze_scale_factor`

Entretanto, o arquivo tambem esta apenas no working tree local, nao no Git.

Impacto: a estrategia de combate a estatisticas frias e bloat esta desenhada, mas ainda nao esta formalmente consolidada no repositorio.

### Gap 3: referencia local de `main` nao representa o estado auditado

Nesta workspace, a branch auditada esta `42` commits a frente de `main` e `0` atras. Portanto, a auditoria confirma o estado da branch atual consolidada, mas nao permite afirmar que a referencia local de `main` ja contem os quatro PRs sem uma sincronizacao adicional.

Impacto: existe risco de governanca de merge/sincronizacao entre o discurso de "mergeado na principal" e o estado real da referencia local.

## Consequencias

### Positivas

- reduzimos risco de vazamento cross-tenant
- preservamos sustentabilidade operacional no plano gratuito
- fortalecemos trilha de auditoria contabil
- aumentamos resiliencia de ingestao financeira
- melhoramos a defensabilidade da arquitetura perante stakeholders e auditorias

### Custos e trade-offs

- atraso deliberado de features de negocio
- aumento de rigor operacional em migrations e configuracao de runtime
- necessidade de manter rotina disciplinada de revisao de planner, estatisticas e bloat

## Recomendacao de Governanca

Este ADR deve ser aprovado como justificativa executiva da priorizacao do Plano de Estabilizacao. Porem, o aceite final do rito de governanca deve ficar condicionado a dois fechamentos tecnicos:

1. versionar a migration `20260413052239_optimize_rls_and_statistics`
2. versionar o script `backend/scripts/optimize_vacuum_analyze.sql`

Sem esses dois itens, a narrativa arquitetural esta correta, mas a consolidacao de PR4 ainda nao pode ser considerada encerrada de forma irrefutavel.
