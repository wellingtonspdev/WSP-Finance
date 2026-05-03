# SDD - Bank Movements

## Visão Geral

[CONFIRMADO] O componente `bank-movements` é a área de staging e conciliação: lista pendências, agrupa/mescla duplicatas, aprova movimentos para `Transaction` real e rejeita movimentos sem impacto contábil.

## Responsabilidades

- [CONFIRMADO] Listar movimentos `PENDING` por workspace.
- [CONFIRMADO] Listar pendências globais para contador.
- [CONFIRMADO] Mesclar movimentos duplicados.
- [CONFIRMADO] Aprovar movimento criando transação real.
- [CONFIRMADO] Atualizar saldo e auditoria durante aprovação.
- [CONFIRMADO] Rejeitar movimento pendente sem criar transação.
- [CONFIRMADO] Aplicar deduplicação fuzzy por valor, data e descrição.

## Interface

| Método | Rota | Entrada | Saída | Confiança |
|---|---|---|---|---|
| `GET` | `/bank-movements` | workspace, cursor/limit | pendências do workspace | CONFIRMADO |
| `GET` | `/accountant/bank-movements/pending` | usuário contador | pendências globais | CONFIRMADO |
| `POST` | `/bank-movements/:id/merge` | `keepId`, `discardIds` | movimento consolidado | CONFIRMADO |
| `POST` | `/bank-movements/:id/approve` | conta/categoria/dados de transação | transação criada ou existente | CONFIRMADO |
| `POST` | `/bank-movements/:id/reject` | id do movimento | status `REJECTED` | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Listagem por workspace filtra `status = PENDING`.
- [CONFIRMADO] Listagem usa cursor UUID e limite entre 1 e 100.
- [CONFIRMADO] Listagem global do contador busca memberships `ACCOUNTANT` e consulta por tenant com `set_config`.
- [CONFIRMADO] Merge exige `keepId` igual ao parâmetro `:id`.
- [CONFIRMADO] Merge exige `discardIds` não vazio.
- [CONFIRMADO] Todos os movimentos do merge devem pertencer ao mesmo workspace e estar `PENDING`.
- [CONFIRMADO] Merge usa transação serializável.
- [CONFIRMADO] Aprovação é idempotente para movimento já `APPROVED`.
- [CONFIRMADO] Aprovação cria `Transaction`, atualiza saldo, grava auditoria e marca movimento como `APPROVED`.
- [CONFIRMADO] Aprovação respeita `closedUntil` com bypass apenas para `ACCOUNTANT` em `BUSINESS`.
- [CONFIRMADO] Rejeição exige movimento existente e `PENDING`.
- [CONFIRMADO] Fuzzy dedup ignora valores absolutos abaixo de R$ 1,00.
- [CONFIRMADO] Fuzzy dedup usa janela temporal de +/- 2 horas.
- [CONFIRMADO] Modo preferencial usa `pg_trgm` com `similarity > 0.6`.
- [CONFIRMADO] Fallback usa `LIKE/LOWER` e Jaccard por trigramas no app.
- [CONFIRMADO] Inbox frontend agrupa duplicatas por valor igual e data em até 2 horas, mas ignora similaridade textual usada no backend. [Revisão Reviewer]
- [CONFIRMADO] Aprovação idempotente procura transação por workspace/account/description/date e pode ser ambígua se houver colisões legítimas. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] Movimento entra em staging como `PENDING`.
2. [CONFIRMADO] Usuário ou contador lista pendências.
3. [CONFIRMADO] Usuário pode rejeitar, mesclar ou aprovar.
4. [CONFIRMADO] Aprovação valida lock fiscal, conta e categoria.
5. [CONFIRMADO] Aprovação cria transação paga.
6. [CONFIRMADO] Saldo é atualizado e `AuditLog CREATE` é gravado.
7. [CONFIRMADO] Movimento é marcado como `APPROVED`.

## Critérios de Aceitação

```gherkin
Dado um BankMovement PENDING
Quando o usuário aprova com conta e categoria válidas
Então o sistema cria Transaction paga, atualiza saldo, audita e marca APPROVED

Dado um BankMovement PENDING
Quando o usuário rejeita
Então o sistema marca REJECTED e não altera saldo

Dado movimentos pendentes duplicados no mesmo workspace
Quando o usuário mescla keepId e discardIds
Então o sistema consolida o keepId e remove descartes em transação serializável
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/controllers/BankMovementController.ts` | endpoints de staging |
| `backend/src/services/BankMovementService.ts` | list, merge, approve, reject |
| `backend/src/repositories/BankMovementRepository.ts` | queries e persistência |
| `backend/src/services/FuzzyDeduplicationService.ts` | deduplicação fuzzy |
| `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx` | inbox |
| `frontend/src/features/accountant/components/MovementCard.tsx` | card de movimento |
| `_reversa_sdd/flowcharts/bank-movements*.md` | fluxos do módulo |
