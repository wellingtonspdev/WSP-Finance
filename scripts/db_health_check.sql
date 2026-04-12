-- WSP Finance - PostgreSQL master audit / health check
-- Safe to run in Supabase SQL editor or psql.
-- Note: the benchmark sections below perform INSERTs inside BEGIN/ROLLBACK.

-- =========================================================
-- 0) Runtime context
-- =========================================================

select
  now() as executed_at,
  current_database() as database_name,
  current_user as current_user,
  session_user as session_user,
  (select rolsuper from pg_roles where rolname = current_user) as rolsuper,
  (select rolbypassrls from pg_roles where rolname = current_user) as rolbypassrls,
  current_setting('max_connections') as max_connections,
  current_setting('default_toast_compression') as default_toast_compression,
  pg_database_size(current_database()) as database_size_bytes;

-- Auto-select the most populated workspace for representative tenant tests.
select set_config(
  'app.current_workspace_id',
  coalesce((
    select "workspaceId"::text
    from "Transaction"
    group by "workspaceId"
    order by count(*) desc, "workspaceId"
    limit 1
  ), '0'),
  false
) as simulated_workspace_id;

select current_setting('app.current_workspace_id', true) as current_workspace_id;

select
  "workspaceId",
  count(*) as transaction_rows
from "Transaction"
group by "workspaceId"
order by transaction_rows desc, "workspaceId";

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('Transaction', 'Account', 'Category', 'BankMovement', 'AuditLog')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  migration_name,
  finished_at,
  rolled_back_at
from _prisma_migrations
order by finished_at nulls last, migration_name;

-- =========================================================
-- EIXO 1) Gargalos de isolamento (RLS + Prisma)
-- =========================================================

-- Query shape close to the current policy expression.
explain (analyze, buffers, verbose, costs, settings)
select
  t.id,
  t."workspaceId",
  t.date,
  t.amount
from "Transaction" t
where t."workspaceId" = current_setting('app.current_workspace_id', true)::int
order by t.date desc
limit 20;

-- Query shape recommended by Supabase/Postgres best practices:
-- wrap current_setting/auth helpers inside a SELECT so the planner can cache it once.
explain (analyze, buffers, verbose, costs, settings)
select
  t.id,
  t."workspaceId",
  t.date,
  t.amount
from "Transaction" t
where t."workspaceId" = (select current_setting('app.current_workspace_id', true)::int)
order by t.date desc
limit 20;

explain (analyze, buffers, verbose, costs, settings)
select
  bm.id,
  bm."workspaceId",
  bm.date,
  bm.status,
  bm.description
from "BankMovement" bm
where bm."workspaceId" = (select current_setting('app.current_workspace_id', true)::int)
  and bm.status = 'PENDING'
order by bm.date desc
limit 20;

select
  coalesce(state, 'null') as state,
  count(*)::int as connection_count
from pg_stat_activity
where datname = current_database()
group by state
order by connection_count desc, state;

select
  pid,
  usename,
  application_name,
  client_addr::text as client_addr,
  state,
  now() - xact_start as xact_age,
  wait_event_type,
  wait_event,
  left(query, 180) as query
from pg_stat_activity
where datname = current_database()
  and state = 'idle in transaction'
order by xact_start nulls last;

-- =========================================================
-- EIXO 2) Morte por disco (TOAST + JSONB)
-- =========================================================

select
  c.relname as table_name,
  pg_relation_size(c.oid) as heap_size_bytes,
  pg_indexes_size(c.oid) as index_size_bytes,
  case
    when c.reltoastrelid <> 0 then pg_total_relation_size(c.reltoastrelid)
    else 0
  end as toast_size_bytes,
  pg_total_relation_size(c.oid) as total_size_bytes,
  t.relname as toast_table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_class t on t.oid = c.reltoastrelid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('BankMovement', 'AuditLog', 'Transaction', 'Account')
order by pg_total_relation_size(c.oid) desc;

select
  relname as table_name,
  n_live_tup,
  n_dead_tup,
  round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  vacuum_count,
  autovacuum_count,
  analyze_count,
  autoanalyze_count
from pg_stat_user_tables
where schemaname = 'public'
order by n_dead_tup desc, relname;

select
  count(*)::int as bankmovement_rows,
  coalesce(sum(pg_column_size("rawPayload")), 0)::bigint as total_jsonb_bytes,
  coalesce(avg(pg_column_size("rawPayload"))::numeric(12, 2), 0) as avg_jsonb_bytes,
  coalesce(max(pg_column_size("rawPayload")), 0)::bigint as max_jsonb_bytes
from "BankMovement";

select
  count(*)::int as auditlog_rows,
  coalesce(sum(case when "oldState" is not null then pg_column_size("oldState") else 0 end), 0)::bigint as total_oldstate_bytes,
  coalesce(sum(case when "newState" is not null then pg_column_size("newState") else 0 end), 0)::bigint as total_newstate_bytes,
  coalesce(avg(case when "oldState" is not null then pg_column_size("oldState") end)::numeric(12, 2), 0) as avg_oldstate_bytes,
  coalesce(avg(case when "newState" is not null then pg_column_size("newState") end)::numeric(12, 2), 0) as avg_newstate_bytes,
  coalesce(max(case when "oldState" is not null then pg_column_size("oldState") else 0 end), 0)::bigint as max_oldstate_bytes,
  coalesce(max(case when "newState" is not null then pg_column_size("newState") else 0 end), 0)::bigint as max_newstate_bytes
from "AuditLog";

select
  count(*) filter (
    where "balanceBefore" is not null
       or "balanceAfter" is not null
       or delta is not null
  )::int as structured_balance_audit_rows,
  count(*) filter (
    where "fromAccount" is not null
       or "toAccount" is not null
  )::int as structured_account_link_rows,
  max("createdAt") filter (
    where "balanceBefore" is not null
       or "balanceAfter" is not null
       or delta is not null
  ) as latest_structured_balance_audit_at
from "AuditLog";

with reconstructed as (
  select
    a.id as account_id,
    a."workspaceId" as workspace_id,
    coalesce(
      sum(
        case
          when t."deletedAt" is null and t."isPaid" = true then
            case
              when t.type = 'INCOME' then t.amount
              else -t.amount
            end
          else 0
        end
      ),
      0
    )::numeric(19,4) as reconstructed_balance
  from "Account" a
  left join "Transaction" t
    on t."accountId" = a.id
   and t."workspaceId" = a."workspaceId"
  group by a.id, a."workspaceId"
),
diffs as (
  select
    a.id as account_id,
    a.name as account_name,
    a."workspaceId" as workspace_id,
    a.balance::numeric(19,4) as current_balance,
    r.reconstructed_balance,
    (a.balance - r.reconstructed_balance)::numeric(19,4) as drift
  from "Account" a
  join reconstructed r
    on r.account_id = a.id
   and r.workspace_id = a."workspaceId"
)
select
  count(*) filter (where drift <> 0)::int as drifted_accounts,
  coalesce(sum(abs(drift)), 0)::numeric(19,4) as total_absolute_drift,
  coalesce(max(abs(drift)), 0)::numeric(19,4) as max_absolute_drift
from diffs;

select current_setting('default_toast_compression') as current_default_toast_compression;

begin;
set local default_toast_compression = 'lz4';
select current_setting('default_toast_compression') as lz4_session_test;
rollback;

select
  attrelid::regclass::text as table_name,
  attname,
  attcompression
from pg_attribute
where attrelid in ('"BankMovement"'::regclass, '"AuditLog"'::regclass)
  and attname in ('rawPayload', 'oldState', 'newState')
order by attrelid::regclass::text, attname;

-- =========================================================
-- EIXO 3) Escrita vs indices GIN (pg_trgm)
-- =========================================================

select
  exists (
    select 1
    from _prisma_migrations
    where migration_name = '20260412021800_enable_pg_trgm_fuzzy_index'
      and finished_at is not null
  ) as pg_trgm_migration_applied;

select
  name,
  default_version,
  installed_version
from pg_available_extensions
where name in ('pg_trgm', 'pgstattuple', 'pageinspect')
order by name;

select
  to_regclass('public.idx_bank_movements_description_trgm') as gin_index_regclass,
  exists (select 1 from pg_extension where extname = 'pg_trgm') as pg_trgm_installed,
  exists (select 1 from pg_proc where proname = 'pgstatginindex') as pgstatginindex_available;

drop table if exists tmp_gin_pending;
create temp table tmp_gin_pending (
  index_name text,
  pending_pages bigint,
  pending_tuples bigint,
  note text
);

do $$
declare
  v_idx regclass := to_regclass('public.idx_bank_movements_description_trgm');
  v_has_pgstatgin boolean := exists (select 1 from pg_proc where proname = 'pgstatginindex');
begin
  if v_idx is null then
    insert into tmp_gin_pending(index_name, pending_pages, pending_tuples, note)
    values ('idx_bank_movements_description_trgm', null, null, 'GIN index missing');
  elsif not v_has_pgstatgin then
    insert into tmp_gin_pending(index_name, pending_pages, pending_tuples, note)
    values (v_idx::text, null, null, 'pgstatginindex unavailable; install pgstattuple to inspect pending list');
  else
    execute format(
      'insert into tmp_gin_pending(index_name, pending_pages, pending_tuples, note)
       select %L, pending_pages, pending_tuples, %L
       from pgstatginindex(%L::regclass)',
      v_idx::text,
      'ok',
      v_idx::text
    );
  end if;
end $$;

select * from tmp_gin_pending;

-- Single insert baseline (rolled back).
begin;
explain (analyze, buffers)
with seed as (
  select
    a.id as account_id,
    a."workspaceId" as workspace_id
  from "Account" a
  join "BankMovement" bm
    on bm."accountId" = a.id
   and bm."workspaceId" = a."workspaceId"
  group by a.id, a."workspaceId"
  order by count(*) desc, a.id
  limit 1
)
insert into "BankMovement" (
  id,
  "workspaceId",
  "accountId",
  amount,
  date,
  description,
  source,
  status,
  fitid,
  "hashDeduplication",
  "rawPayload",
  "createdAt"
)
select
  md5(random()::text || clock_timestamp()::text),
  workspace_id,
  account_id,
  123.45,
  now(),
  'health-check-single',
  'OPEN_FINANCE'::"MovementSource",
  'PENDING'::"MovementStatus",
  null,
  md5(random()::text || clock_timestamp()::text || 'single'),
  jsonb_build_object('probe', 'single', 'ts', clock_timestamp()),
  now()
from seed;
rollback;

-- Batch insert baseline (100 rows, rolled back).
begin;
explain (analyze, buffers)
with seed as (
  select
    a.id as account_id,
    a."workspaceId" as workspace_id
  from "Account" a
  join "BankMovement" bm
    on bm."accountId" = a.id
   and bm."workspaceId" = a."workspaceId"
  group by a.id, a."workspaceId"
  order by count(*) desc, a.id
  limit 1
)
insert into "BankMovement" (
  id,
  "workspaceId",
  "accountId",
  amount,
  date,
  description,
  source,
  status,
  fitid,
  "hashDeduplication",
  "rawPayload",
  "createdAt"
)
select
  md5(random()::text || clock_timestamp()::text || gs::text),
  seed.workspace_id,
  seed.account_id,
  gs::numeric,
  now(),
  'health-check-batch-' || gs,
  'OPEN_FINANCE'::"MovementSource",
  'PENDING'::"MovementStatus",
  null,
  md5(random()::text || clock_timestamp()::text || 'batch' || gs::text),
  jsonb_build_object('probe', 'batch', 'n', gs),
  now()
from seed
cross join generate_series(1, 100) as gs;
rollback;

-- =========================================================
-- EIXO 4) Integridade do ledger / saldos
-- =========================================================

-- IMPORTANT:
-- The current schema does not expose a formal ledger_entries table with
-- transaction_id + side (debit/credit). The query below derives transaction_id
-- from BRIDGE_OUT_/BRIDGE_IN_ fitid pairs, which is the strongest invariant
-- currently available in SQL without changing the schema.
with bridge_pairs as (
  select
    regexp_replace(fitid, '^BRIDGE_(OUT|IN)_', '') as transaction_id,
    sum(case when type = 'EXPENSE' then amount else 0 end) as total_debitos,
    sum(case when type = 'INCOME' then amount else 0 end) as total_creditos,
    sum(case when type = 'EXPENSE' then -amount else amount end) as debitos_mais_creditos,
    count(*) as legs
  from "Transaction"
  where fitid like 'BRIDGE_OUT_%'
     or fitid like 'BRIDGE_IN_%'
  group by 1
)
select *
from bridge_pairs
order by transaction_id;

with bridge_pairs as (
  select
    regexp_replace(fitid, '^BRIDGE_(OUT|IN)_', '') as transaction_id,
    sum(case when type = 'EXPENSE' then -amount else amount end) as debitos_mais_creditos,
    count(*) as legs
  from "Transaction"
  where fitid like 'BRIDGE_OUT_%'
     or fitid like 'BRIDGE_IN_%'
  group by 1
)
select count(*)::int as discrepancies
from bridge_pairs
where debitos_mais_creditos <> 0
   or legs <> 2;

-- AuditLog coverage check for balance reconstruction.
select
  count(*)::int as total_audit_rows,
  count(*) filter (where "newState" ? 'fromAccount')::int as rows_with_from_account,
  count(*) filter (where "newState" ? 'toAccount')::int as rows_with_to_account,
  count(*) filter (where "newState" ? 'balance')::int as rows_with_balance_key
from "AuditLog";

-- Best-effort balance reconstruction from AuditLog snapshots, when present.
with audit_account_snapshots as (
  select
    "createdAt",
    ("newState"->'fromAccount'->>'id')::int as account_id,
    ("newState"->'fromAccount'->>'balance')::numeric as balance_after
  from "AuditLog"
  where "newState" ? 'fromAccount'

  union all

  select
    "createdAt",
    ("newState"->'toAccount'->>'id')::int as account_id,
    ("newState"->'toAccount'->>'balance')::numeric as balance_after
  from "AuditLog"
  where "newState" ? 'toAccount'

  union all

  select
    "createdAt",
    ("newState"->>'accountId')::int as account_id,
    ("newState"->>'balance')::numeric as balance_after
  from "AuditLog"
  where "newState" ? 'accountId'
    and "newState" ? 'balance'
),
latest_snapshot as (
  select distinct on (account_id)
    account_id,
    balance_after,
    "createdAt"
  from audit_account_snapshots
  where account_id is not null
    and balance_after is not null
  order by account_id, "createdAt" desc
)
select
  a.id as account_id,
  a.name,
  a.balance as current_balance,
  ls.balance_after as latest_audit_balance,
  a.balance - ls.balance_after as delta,
  ls."createdAt" as snapshot_at
from "Account" a
left join latest_snapshot ls
  on ls.account_id = a.id
order by abs(coalesce(a.balance - ls.balance_after, 0)) desc, a.id;

-- Fallback reconciliation from Transaction, useful while AuditLog does not
-- persist every balance mutation.
with reconstructed as (
  select
    t."accountId" as account_id,
    sum(
      case
        when t."isPaid" = true and t.type = 'INCOME' then t.amount
        when t."isPaid" = true and t.type = 'EXPENSE' then -t.amount
        else 0
      end
    ) as reconstructed_balance
  from "Transaction" t
  where t."deletedAt" is null
  group by t."accountId"
)
select
  a.id as account_id,
  a.name,
  a.balance as current_balance,
  coalesce(r.reconstructed_balance, 0) as reconstructed_balance,
  a.balance - coalesce(r.reconstructed_balance, 0) as delta
from "Account" a
left join reconstructed r
  on r.account_id = a.id
order by abs(a.balance - coalesce(r.reconstructed_balance, 0)) desc, a.id;
