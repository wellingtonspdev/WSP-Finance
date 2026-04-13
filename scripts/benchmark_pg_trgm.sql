-- Controlled pg_trgm benchmark checks for staging/local only.
-- Run after the k6 batches to inspect extension state, locks and GIN pending list.

select
  now() as executed_at,
  current_database() as database_name,
  current_user as current_user;

select
  exists (select 1 from pg_extension where extname = 'pg_trgm') as pg_trgm_installed,
  to_regclass('public.idx_bank_movements_description_trgm') as gin_index_name,
  to_regclass('public.idx_bank_movements_workspace_status_amount_date') as btree_index_name;

select
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
where schemaname = 'public'
  and indexrelname in (
    'idx_bank_movements_description_trgm',
    'idx_bank_movements_workspace_status_amount_date'
  )
order by indexrelname;

select
  locktype,
  mode,
  granted,
  count(*)::int as lock_count
from pg_locks
where relation = '"BankMovement"'::regclass
group by locktype, mode, granted
order by locktype, mode, granted;

select
  sa.pid,
  sa.usename,
  sa.application_name,
  sa.state,
  sa.wait_event_type,
  sa.wait_event,
  now() - coalesce(sa.xact_start, sa.query_start) as running_for,
  left(sa.query, 180) as query
from pg_stat_activity sa
where sa.datname = current_database()
  and (
    sa.query ilike '%BankMovement%'
    or sa.wait_event_type is not null
  )
order by coalesce(sa.xact_start, sa.query_start) desc nulls last;

drop table if exists tmp_pg_trgm_pending;
create temp table tmp_pg_trgm_pending (
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
    insert into tmp_pg_trgm_pending(index_name, pending_pages, pending_tuples, note)
    values ('idx_bank_movements_description_trgm', null, null, 'GIN index missing');
  elsif not v_has_pgstatgin then
    insert into tmp_pg_trgm_pending(index_name, pending_pages, pending_tuples, note)
    values (v_idx::text, null, null, 'pgstatginindex unavailable');
  else
    execute format(
      'insert into tmp_pg_trgm_pending(index_name, pending_pages, pending_tuples, note)
       select %L, pending_pages, pending_tuples, %L
       from pgstatginindex(%L::regclass)',
      v_idx::text,
      'ok',
      v_idx::text
    );
  end if;
end $$;

select * from tmp_pg_trgm_pending;
