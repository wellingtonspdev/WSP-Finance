# SDD - Imports e Open Finance

## Visão Geral

[CONFIRMADO] O componente `imports-open-finance` converte arquivos OFX locais e webhooks Open Finance em `BankMovement` de staging usando uma engine única de ingestão financeira.

## Responsabilidades

- [CONFIRMADO] Receber importação OFX em rota autenticada por workspace.
- [CONFIRMADO] Validar path/extensão `.ofx`.
- [CONFIRMADO] Parsear OFX bancário e cartão via `ofx-js`.
- [CONFIRMADO] Receber webhook Open Finance com bearer próprio.
- [CONFIRMADO] Validar payload de movimentos externos.
- [CONFIRMADO] Normalizar data, valor decimal, descrição e identificador.
- [CONFIRMADO] Gerar `hashDeduplication` SHA-256.
- [CONFIRMADO] Executar deduplicação fuzzy antes de inserir.
- [CONFIRMADO] Inserir movimentos em chunks de 50 como `PENDING`.

## Interface

| Método | Rota | Proteção | Entrada | Saída |
|---|---|---|---|---|
| `POST` | `/transactions/import` | Auth + Workspace | `fileName`, `accountId` | resumo da importação |
| `POST` | `/api/webhooks/open-finance` | Bearer `OPEN_FINANCE_WEBHOOK_KEY` | `workspaceId`, `accountId`, `movements[]` | movimentos ingeridos |

## Regras de Negócio

- [CONFIRMADO] Importação OFX rejeita path vazio.
- [CONFIRMADO] Importação OFX rejeita path contendo `..`.
- [CONFIRMADO] Importação OFX rejeita arquivo sem extensão `.ofx`.
- [CONFIRMADO] Webhook exige bearer token próprio.
- [CONFIRMADO] Webhook usa fallback `webhook-auth-key-mock` quando env não existe.
- [CONFIRMADO] Payload Open Finance exige `workspaceId`, `accountId` e lista não vazia de movimentos.
- [CONFIRMADO] Movimento exige `date`, `description`, `amount` e `transactionId?`.
- [CONFIRMADO] Engine normaliza entrada unitária ou lista.
- [CONFIRMADO] Valor é convertido com `Decimal`.
- [CONFIRMADO] Data é normalizada para UTC.
- [CONFIRMADO] Duplicatas fuzzy não entram no lote.
- [CONFIRMADO] Inserção usa `createMany` com `skipDuplicates`.
- [CONFIRMADO] `FinancialIngestionEngine` recebe `workspaceId` e `accountId` e os persiste nos movimentos sem validar neste módulo que a conta pertence ao workspace. [Revisão Reviewer]
- [CONFIRMADO] `OpenFinanceWebhookService` usa fallback default `webhook-auth-key-mock` quando `OPEN_FINANCE_WEBHOOK_KEY` não existe. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] Origem externa entra por OFX ou webhook.
2. [CONFIRMADO] Controller valida autenticação/proteção específica e payload.
3. [CONFIRMADO] Parser transforma entrada em movimentos intermediários.
4. [CONFIRMADO] `FinancialIngestionEngine.ingest` normaliza campos.
5. [CONFIRMADO] Engine calcula hash e consulta deduplicação fuzzy.
6. [CONFIRMADO] Movimentos não duplicados são inseridos em chunks de 50.
7. [CONFIRMADO] Cada movimento entra como `BankMovement PENDING`, sem impacto em saldo.

## Critérios de Aceitação

```gherkin
Dado um OFX válido de conta bancária
Quando o usuário importa o arquivo em um workspace
Então o sistema cria BankMovements PENDING normalizados

Dado um webhook Open Finance com bearer inválido
Quando a request chega ao backend
Então o sistema rejeita a ingestão

Dado movimentos duplicados por valor, data e descrição aproximada
Quando a engine processa o lote
Então duplicatas fuzzy não são inseridas novamente
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/controllers/ImportController.ts` | rota OFX |
| `backend/src/services/ImportService.ts` | validação e parse OFX |
| `backend/src/controllers/OpenFinanceWebhookController.ts` | rota webhook |
| `backend/src/services/OpenFinanceWebhookService.ts` | validação do webhook |
| `backend/src/services/FinancialIngestionEngine.ts` | normalização e persistência |
| `backend/src/repositories/BankMovementRepository.ts` | create batch |
| `_reversa_sdd/flowcharts/imports-open-finance.md` | fluxo do módulo |
