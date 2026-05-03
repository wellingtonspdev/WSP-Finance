# SDD - Finance Core

## Visão Geral

[CONFIRMADO] O componente `finance-core` cobre contas, categorias, transações, saldo bancário, dashboard financeiro, auditoria de mutações monetárias e bridge entre workspaces.

[CONFIRMADO] As rotas financeiras principais operam sob `AuthMiddleware` e `WorkspaceMiddleware`, usando o workspace ativo como fronteira de dados.

## Responsabilidades

- [CONFIRMADO] Criar, listar, editar e excluir contas por workspace.
- [CONFIRMADO] Listar categorias globais e categorias do workspace.
- [CONFIRMADO] Criar e excluir transações com validação de conta, categoria e período fiscal.
- [CONFIRMADO] Atualizar saldo quando transação está paga.
- [CONFIRMADO] Registrar auditoria síncrona com saldo antes/depois e delta em mutações monetárias.
- [CONFIRMADO] Calcular valores de marketplace, taxa, imposto e líquido quando aplicável.
- [CONFIRMADO] Gerar dashboard com saldo total, fluxo mensal e despesas fixas.
- [CONFIRMADO] Executar bridge entre workspaces com lançamentos espelhados.

## Interface

| Recurso | Rotas / operações | Saída | Confiança |
|---|---|---|---|
| Contas | `GET/POST/PUT/PATCH/DELETE /accounts` | contas do workspace e saldos | CONFIRMADO |
| Categorias | `GET/POST/DELETE /categories` | categorias globais + workspace | CONFIRMADO |
| Transações | `GET/POST/DELETE /transactions` | lançamentos financeiros | CONFIRMADO |
| Todas transações | `GET /transactions/all` | lançamentos por memberships do usuário | CONFIRMADO |
| Dashboard | `GET /dashboard/summary` | saldo, fluxo e métricas | CONFIRMADO |
| Bridge | `POST /bridge/transfer` | transação de débito e crédito | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Conta pertence a um workspace e usa saldo decimal.
- [CONFIRMADO] Categoria global tem `workspaceId = null` e pode aparecer junto com categorias do workspace.
- [CONFIRMADO] Transação deve referenciar conta e categoria válidas para o workspace.
- [CONFIRMADO] Transação paga atualiza saldo imediatamente.
- [CONFIRMADO] Exclusão de transação paga reverte saldo.
- [CONFIRMADO] Período fiscal fechado bloqueia alteração com `date <= closedUntil`.
- [CONFIRMADO] Contador pode bypassar fechamento apenas em workspace `BUSINESS`.
- [CONFIRMADO] Marketplace com `grossAmount` recalcula fee, imposto, líquido e valor final.
- [CONFIRMADO] Listagem usa paginação por cursor com `limit + 1`, `hasMore` e `nextCursor`.
- [CONFIRMADO] Dashboard soma apenas contas com `isIncludedInTotal: true`.
- [CONFIRMADO] Bridge exige `OWNER` ou `ACCOUNTANT` em origem e destino.
- [CONFIRMADO] Bridge exige saldo suficiente na origem e categorias válidas nos dois workspaces.
- [CONFIRMADO] Bridge é atômica: cria débito, crédito, atualiza dois saldos e grava duas auditorias com mesmo `bridgeId`.
- [CONFIRMADO] O frontend tipa `Transaction.id` como `number` em tipos/componentes de transação, enquanto o schema Prisma define `Transaction.id` como UUID string. [Revisão Reviewer]
- [CONFIRMADO] `BridgeService` chama `crypto.randomUUID()` sem import explícito de `crypto` no arquivo analisado. [Revisão Reviewer]

## Fluxo Principal

### Criar Transação

1. [CONFIRMADO] Request chega com workspace autenticado.
2. [CONFIRMADO] Service valida conta e categoria no workspace.
3. [CONFIRMADO] Service busca workspace e valida `closedUntil`.
4. [CONFIRMADO] Service calcula valores financeiros, incluindo regras de marketplace quando presentes.
5. [CONFIRMADO] Prisma cria transação em transação de banco.
6. [CONFIRMADO] Se `isPaid`, saldo da conta é atualizado e `AuditLog` é gravado.
7. [CONFIRMADO] Transação criada é retornada.

### Excluir Transação

1. [CONFIRMADO] Service busca transação por id e workspace.
2. [CONFIRMADO] Service valida fechamento fiscal.
3. [CONFIRMADO] Se transação estava paga, saldo é revertido e auditoria é gravada.
4. [CONFIRMADO] Transação é excluída.
5. [CONFIRMADO] Se havia anexo remoto, remoção do arquivo ocorre em background.

### Bridge

1. [CONFIRMADO] Service valida memberships `OWNER` ou `ACCOUNTANT` nos dois workspaces.
2. [CONFIRMADO] Service valida fechamento fiscal na origem e no destino.
3. [CONFIRMADO] Service valida contas, saldo de origem e categorias.
4. [CONFIRMADO] Transação atômica cria débito e crédito.
5. [CONFIRMADO] Saldos são decrementado/incrementado.
6. [CONFIRMADO] Duas auditorias `BRIDGE_TRANSFER` são gravadas.

## Critérios de Aceitação

```gherkin
Dado uma conta válida no workspace
Quando uma transação paga é criada
Então o saldo da conta é atualizado e uma auditoria CREATE é registrada

Dado uma transação paga existente
Quando ela é excluída
Então o saldo é revertido e uma auditoria DELETE é registrada

Dado uma data dentro de período fechado
Quando usuário sem bypass tenta criar ou excluir transação
Então o sistema bloqueia a operação

Dado dois workspaces e permissão em ambos
Quando uma bridge válida é executada
Então o sistema cria débito, crédito, atualiza saldos e audita as duas pernas
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/controllers/TransactionController.ts` | rotas de transação |
| `backend/src/services/TransactionService.ts` | criação, exclusão, cálculo e lock fiscal |
| `backend/src/repositories/TransactionRepository.ts` | persistência/listagem |
| `backend/src/controllers/AccountController.ts` | rotas de contas |
| `backend/src/services/AccountService.ts` | regras de contas |
| `backend/src/controllers/CategoryController.ts` | rotas de categorias |
| `backend/src/services/DashboardService.ts` | resumo financeiro |
| `backend/src/controllers/BridgeController.ts` | endpoint de bridge |
| `backend/src/services/BridgeService.ts` | bridge dupla e auditoria |
| `_reversa_sdd/flowcharts/finance-core*.md` | fluxos financeiros |
