-- Account balance reconciliation report
-- Purpose: compare Account.balance against the historical reconstruction from paid, non-deleted transactions.

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
)
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
order by abs(a.balance - r.reconstructed_balance) desc, a.id;

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
