-- One-shot balance repair
-- IMPORTANT:
-- 1) Run scripts/reconcile_account_balances.sql first.
-- 2) Replace audit_user_id below with the real operator user id.
-- 3) Execute only after taking a fresh database backup/snapshot.

begin;

with params as (
  select 1::integer as audit_user_id
),
reconstructed as (
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
    a."workspaceId" as workspace_id,
    a.balance::numeric(19,4) as current_balance,
    r.reconstructed_balance,
    (r.reconstructed_balance - a.balance)::numeric(19,4) as adjustment
  from "Account" a
  join reconstructed r
    on r.account_id = a.id
   and r.workspace_id = a."workspaceId"
  where a.balance is distinct from r.reconstructed_balance
),
updated as (
  update "Account" a
  set balance = d.reconstructed_balance
  from diffs d
  where a.id = d.account_id
  returning
    a.id,
    a."workspaceId",
    d.current_balance,
    d.reconstructed_balance,
    d.adjustment
),
audited as (
  insert into "AuditLog" (
    "userId",
    "workspaceId",
    "action",
    "entity",
    "entityId",
    "oldState",
    "newState",
    "balanceBefore",
    "balanceAfter",
    "delta",
    "fromAccount",
    "ipAddress",
    "userAgent"
  )
  select
    p.audit_user_id,
    u."workspaceId",
    'UPDATE'::"AuditAction",
    'Account',
    u.id::text,
    jsonb_build_object(
      'source', 'scripts/fix_account_balances.sql',
      'mode', 'reconciliation',
      'balance', u.current_balance
    ),
    jsonb_build_object(
      'source', 'scripts/fix_account_balances.sql',
      'mode', 'reconciliation',
      'balance', u.reconstructed_balance
    ),
    u.current_balance,
    u.reconstructed_balance,
    u.adjustment,
    u.id,
    '127.0.0.1',
    'scripts/fix_account_balances.sql'
  from updated u
  cross join params p
  returning "entityId"
)
select
  u.id as account_id,
  u."workspaceId" as workspace_id,
  u.current_balance,
  u.reconstructed_balance as repaired_balance,
  u.adjustment
from updated u
order by abs(u.adjustment) desc, u.id;

commit;
