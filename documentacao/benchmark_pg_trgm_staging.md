# Benchmark pg_trgm em staging/local

## Escopo

PR3 executado em `2026-04-12` com foco em:

- fallback operacional via `FUZZY_DEDUP_MODE=auto|trgm|fallback`
- degradacao graciosa para `LIKE/LOWER()` quando `pg_trgm` falha ou entra em timeout
- experimento controlado de escrita com `pg_trgm` em banco local/staging
- validacao do pre-filtro adicional B-Tree apos aprovacao do gate

## Ambiente

- Banco avaliado: `finance_app`
- Runtime do benchmark HTTP: harness local em `http://localhost:3334`
- Endpoint exercitado: `POST /api/webhooks/open-finance`
- Dataset-alvo do benchmark: `workspaceId=3`, `accountId=1`
- Extensoes locais usadas:
  - `pg_trgm`
  - `pgstattuple` (apenas para inspeção do GIN pending list)

## Validacao de fallback

Arquivo validado: `beckend/tests/services/FuzzyDeduplicationService.test.ts`

Casos explicitamente cobertos:

- `FUZZY_DEDUP_MODE=fallback` forca o caminho `LIKE/LOWER()` sem tentar `similarity()`
- timeout de banco degrada o modo `auto` para fallback e mantem o modo seguro nas chamadas seguintes
- indisponibilidade de `pg_trgm` mantem o comportamento resiliente

Status:

- `9/9` testes passaram

## Metodologia

1. Seed local executado para repovoar `BankMovement` e contas associadas.
2. `k6` rodado em 3 lotes de webhook:
   - batch `1`
   - batch `100`
   - batch `1000`
3. Como o runtime local usa `postgres` superuser, o benchmark HTTP foi executado em um harness temporario (`beckend/tests/openFinanceWebhookHarness.ts`) para nao afrouxar a checagem de privilegios do `server.ts`.
4. Depois do gate positivo do GIN, foi adicionada a migration do indice B-Tree:
   - `idx_bank_movements_workspace_status_amount_date`
5. Os lotes foram rerodados para que os numeros finais refletissem a configuracao pronta para revisao.

## Resultados finais do k6

| Batch | VUs | Iteracoes | p50 (ms) | p95 (ms) | max (ms) |
|---|---:|---:|---:|---:|---:|
| 1 | 4 | 12 | 10.875568 | 16.67607725 | 17.914658 |
| 100 | 6 | 12 | 217.8287315 | 263.68773075 | 267.712034 |
| 1000 | 8 | 12 | 1502.256053 | 1568.6198982 | 1572.736591 |

Leitura operacional:

- sem erros HTTP (`rate = 0`)
- jitter controlado no lote de `1000` (`p95 - p50 ~= 66.36 ms`)
- aumento de latencia coerente com o volume, sem explosao de cauda

## Diagnostico PostgreSQL apos a rodada final

Script usado: `scripts/benchmark_pg_trgm.sql`

Estado observado:

- `pg_trgm_installed = true`
- `gin_index_name = idx_bank_movements_description_trgm`
- `btree_index_name = idx_bank_movements_workspace_status_amount_date`
- locks em `BankMovement`: `0`
- `pg_stat_activity`: sem waits de lock relacionados ao benchmark
- pending list do GIN:
  - `pending_pages = 0`
  - `pending_tuples = 0`

Observacao:

- `idx_scan = 0` nos dois indices durante esta rodada porque o experimento focou no custo de escrita do webhook sob presenca do GIN/B-Tree, nao em throughput de leitura da query fuzzy.

## Decisao do gate

Status: **Aprovado**

Motivos:

- nenhum lock longo detectado
- pending list do GIN zerada
- sem timeout HTTP
- fallback validado por teste automatizado
- p95 do lote `1000` ficou em `1568.6198982 ms`, com baixa distancia para o p50

## Rollout recomendado

1. Manter `FUZZY_DEDUP_MODE=auto` como default operacional.
2. Promover a migration do experimento para staging compartilhado/ambiente candidato.
3. Repetir a mesma bateria em ambiente com usuario sem `superuser` e com carga concorrente mais proxima de producao.
4. Se os numeros se mantiverem, liberar rollout controlado para producao.

## Artefatos gerados

- `beckend/tests/stress-test.k6.js`
- `beckend/tests/k6-summary-batch-1.json`
- `beckend/tests/k6-summary-batch-100.json`
- `beckend/tests/k6-summary-batch-1000.json`
- `scripts/benchmark_pg_trgm.sql`
- `beckend/prisma/migrations/20260412220500_add_bank_movement_fuzzy_prefilter_btree/migration.sql`
