# 📋 WSP Finance — API Contracts (Trindade SDD)

> **Specification-Driven Development**: Este documento é a fonte canônica de verdade
> para os contratos de API entre Frontend e Backend. Toda rota DEVE ser documentada
> aqui ANTES da implementação ser finalizada.

**Última atualização:** 2026-04-11  
**Sprint:** 2  
**Autor:** Squad Ágil (Automação)

---

## 🏦 Bank Movements — Inbox de Aprovação

### `GET /bank-movements`

**Descrição:** Lista movimentos bancários com status `PENDING` para o workspace do contador.  
**Middleware:** `AuthMiddleware` → `WorkspaceMiddleware`  
**Header obrigatório:** `x-workspace-id: number`

#### Query Params

| Param    | Tipo   | Obrigatório | Default | Validação                  |
|----------|--------|-------------|---------|----------------------------|
| `cursor` | string | ❌          | —       | UUID v4                    |
| `limit`  | number | ❌          | `20`    | `min(1)`, `max(100)`       |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "workspaceId": 1,
      "accountId": 1,
      "amount": "1500.0000",
      "date": "2026-03-15T00:00:00.000Z",
      "description": "PIX RECEBIDO - CLIENTE X",
      "source": "OFX | OPEN_FINANCE | OCR | MANUAL",
      "status": "PENDING",
      "fitid": "string | null",
      "hashDeduplication": "string | null",
      "rawPayload": {},
      "createdAt": "2026-03-15T10:30:00.000Z",
      "account": { "name": "Conta Corrente BB" }
    }
  ],
  "nextCursor": "uuid | null",
  "hasMore": true
}
```

---

### `POST /bank-movements/:id/merge`

**Descrição:** Mescla movimentos duplicados em um único registro. Combina os `rawPayload` e deleta os descartados.  
**Middleware:** `AuthMiddleware` → `WorkspaceMiddleware`  
**Header obrigatório:** `x-workspace-id: number`  
**Atomicidade:** `prisma.$transaction` com `isolationLevel: Serializable`

#### Path Params

| Param | Tipo   | Validação | Regra                                      |
|-------|--------|-----------|---------------------------------------------|
| `id`  | string | UUID v4   | Deve ser idêntico ao `keepId` do body       |

#### Request Body (JSON)

```json
{
  "keepId": "uuid-do-movimento-mantido",
  "discardIds": ["uuid-duplicata-1", "uuid-duplicata-2"]
}
```

| Campo        | Tipo       | Obrigatório | Validação                       |
|--------------|------------|-------------|---------------------------------|
| `keepId`     | `string`   | ✅          | UUID v4                         |
| `discardIds` | `string[]` | ✅          | `Array<UUID>`, `.min(1)`        |

##### 🔒 Regras de Validação

1. `keepId` **não pode** estar presente em `discardIds`.
2. Todos os IDs (`keepId` + `discardIds`) devem pertencer ao `workspaceId` do header.
3. Todos os movimentos envolvidos devem estar com `status: PENDING`.
4. O param `:id` da URL deve corresponder exatamente ao `keepId`.

##### 🧬 Regra de Aglutinação do `rawPayload` (Merge)

A combinação dos payloads segue a estrutura de **Lastro de Evidência** (BACKEND_GUIDELINES Regra 5):

```json
{
  "merged": true,
  "mergedAt": "2026-04-11T22:53:52.000Z",
  "mergedCount": 3,
  "primary": { "...payload original do keepId..." },
  "sources": [
    {
      "id": "uuid-descartado-1",
      "source": "OFX",
      "payload": { "...payload original do descartado..." }
    },
    {
      "id": "uuid-descartado-2",
      "source": "OCR",
      "payload": { "...payload original do descartado..." }
    }
  ]
}
```

| Campo         | Tipo      | Descrição                                                    |
|---------------|-----------|--------------------------------------------------------------|
| `merged`      | `boolean` | Flag de auditoria indicando que este registro foi mesclado   |
| `mergedAt`    | `string`  | ISO 8601 timestamp do momento da operação                    |
| `mergedCount` | `number`  | Total de registros envolvidos (keepId + discardIds)           |
| `primary`     | `object`  | `rawPayload` original inalterado do `keepId` (lastro)        |
| `sources`     | `array`   | Payloads originais dos `discardIds` com metadados de origem  |

> **Requisito de Auditoria (Regra 5):** O `rawPayload` do `keepId` (campo `primary`)
> NUNCA é sobrescrito. Os payloads descartados são preservados em `sources` como
> lastro de evidência para reconciliação futura.

#### Response `200 OK`

```json
{
  "id": "uuid-do-keep",
  "workspaceId": 1,
  "amount": "1500.0000",
  "status": "PENDING",
  "rawPayload": { "merged": true, "..." }
}
```

#### Erros

| Status | Código                         | Mensagem                                                     |
|--------|--------------------------------|--------------------------------------------------------------|
| `400`  | `KEEP_IN_DISCARD`              | `keepId não pode estar em discardIds`                        |
| `400`  | `NON_PENDING_MOVEMENTS`        | `Todos os movimentos envolvidos no merge devem estar PENDING`|
| `400`  | `PARAM_MISMATCH`               | `O param :id deve corresponder ao keepId do body`            |
| `404`  | `MOVEMENTS_NOT_FOUND`          | `Um ou mais movimentos não encontrados neste workspace`      |

---

### `POST /bank-movements/:id/approve`

**Descrição:** Converte um `BankMovement` (PENDING) em `Transaction` real, atualizando o saldo da conta.  
**Middleware:** `AuthMiddleware` → `WorkspaceMiddleware`  
**Header obrigatório:** `x-workspace-id: number`  
**Atomicidade:** `prisma.$transaction` com `isolationLevel: Serializable`

#### Path Params

| Param | Tipo   | Validação |
|-------|--------|-----------|
| `id`  | string | UUID v4   |

#### Request Body (JSON)

```json
{
  "accountId": 1,
  "categoryId": 5
}
```

| Campo        | Tipo     | Obrigatório | Validação               |
|--------------|----------|-------------|-------------------------|
| `accountId`  | `number` | ✅          | `int().positive()`      |
| `categoryId` | `number` | ✅          | `int().positive()`      |

##### Fluxo interno (atômico)

1. Busca o `BankMovement` por `id` + `workspaceId` → valida `status === PENDING`.
2. Determina `TransactionType`: `amount >= 0` → `INCOME`, senão `EXPENSE`.
3. Cria `Transaction` vinculada ao workspace/account/category.
4. Atualiza `Account.balance` com `+abs(amount)` (INCOME) ou `-abs(amount)` (EXPENSE).
5. Marca o `BankMovement` como `APPROVED`.

> **Regra 1 (Amortecedor):** O saldo só é atualizado AQUI, nunca na ingestão.

#### Response `201 Created`

```json
{
  "id": 42,
  "description": "PIX RECEBIDO - CLIENTE X",
  "amount": "1500.0000",
  "type": "INCOME",
  "isPaid": true,
  "date": "2026-03-15T00:00:00.000Z"
}
```

#### Erros

| Status | Código               | Mensagem                          |
|--------|----------------------|-----------------------------------|
| `404`  | `NOT_FOUND`          | `Movimento não encontrado`        |
| `400`  | `NOT_PENDING`        | `Movimento não está pendente`     |

---

### `POST /bank-movements/:id/reject`

**Descrição:** Descarta o movimento sem criar Transaction.  
**Middleware:** `AuthMiddleware` → `WorkspaceMiddleware`  
**Header obrigatório:** `x-workspace-id: number`

#### Path Params

| Param | Tipo   | Validação |
|-------|--------|-----------|
| `id`  | string | UUID v4   |

#### Response `200 OK`

```json
{
  "id": "uuid",
  "status": "REJECTED"
}
```

#### Erros

| Status | Código               | Mensagem                          |
|--------|----------------------|-----------------------------------|
| `404`  | `NOT_FOUND`          | `Movimento não encontrado`        |
| `400`  | `NOT_PENDING`        | `Movimento não está pendente`     |

---

## 🔒 Segurança Transversal

| Aspecto             | Implementação                                                   |
|---------------------|-----------------------------------------------------------------|
| **Autenticação**    | Bearer JWT via `AuthMiddleware`                                  |
| **Autorização**     | `WorkspaceMiddleware` valida membership + tipo `BUSINESS`        |
| **Isolamento**      | Todas as queries filtram por `workspaceId` (Row-Level Security)  |
| **Atomicidade**     | Operações de merge e approve usam `prisma.$transaction`          |
| **Aritmética**      | `Decimal(19,4)` no banco, `decimal.js` na lógica                |
| **Validação**       | Zod schema em todos os inputs (body, params, query)              |

---

## 📊 Enum: `MovementStatus`

```prisma
enum MovementStatus {
  PENDING   // Aguardando ação do contador
  APPROVED  // Convertido em Transaction
  REJECTED  // Descartado manualmente
  MERGED    // Absorvido por outro movimento (transitório → deletado)
}
```

## 📊 Enum: `MovementSource`

```prisma
enum MovementSource {
  OFX           // Importação de arquivo OFX
  OPEN_FINANCE  // Belvo / Open Banking
  OCR           // WhatsApp receipt scan
  MANUAL        // Inserção manual
}
```

---

## 🔍 Deduplicação Fuzzy (`FuzzyDeduplicationService`)

**Responsabilidade:** Identificar movimentos "quase iguais" — mesmo valor, data similar (±2h), descrição variada (ex: "Posto Shell" vs "POSTO SHELL LTDA").

### Modo de Operação (Dual-mode)

| Modo | Mecanismo | Condição |
|------|-----------|----------|
| **Primário** | `pg_trgm` → `similarity()` SQL nativa | Extensão ativada no PostgreSQL |
| **Fallback** | `LIKE` + `LOWER()` + Jaccard no app layer | Supabase Free negar `CREATE EXTENSION` |

> **⚠️ Fallback documentado:** Se `pg_trgm` não estiver disponível no ambiente (erro `42883 - undefined_function`),
> o serviço ativa automaticamente o modo fallback usando `ILIKE` com as 3 primeiras palavras
> significativas da descrição (>= 3 caracteres) + cálculo de Jaccard sobre trigramas no application layer.
> O log `[FuzzyDedup] pg_trgm indisponível` é emitido no console.

### Regras de Negócio

| Regra | Valor | Justificativa |
|-------|-------|---------------|
| Threshold de similaridade | `> 0.6` | Balanceamento entre precisão e recall |
| Janela temporal | `±2 horas` | Bancos processam em batch noturno |
| Valor mínimo | `>= R$ 1,00` (abs) | Evitar falsos positivos em taxas bancárias |
| Status filtrado | `PENDING` | Apenas movimentos ainda não processados |
| Isolamento | `workspaceId` | RLS obrigatório |

### Interface de Resposta

```typescript
interface FuzzyCandidate {
  match: BankMovement;     // Candidato encontrado
  similarity: number;      // Score [0..1], > 0.6 é match
}
```

### Migração SQL

```sql
-- migration: 20260412021800_enable_pg_trgm_fuzzy_index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_bank_movements_description_trgm
  ON "BankMovement" USING gin (description gin_trgm_ops);
```

### Arquivos Relacionados

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/services/FuzzyDeduplicationService.ts` | Serviço dual-mode com fallback |
| `tests/services/FuzzyDeduplicationService.test.ts` | 7 testes TDD (critérios de aceitação) |
| `prisma/migrations/20260412021800_.../migration.sql` | Infra pg_trgm + índice GIN |

