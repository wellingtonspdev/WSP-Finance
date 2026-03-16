# 📄 WSP Finance - Backend Architecture Guidelines (V4.2)

**Data de Atualização:** 09 de Março de 2026
**Diretriz Principal:** Ingestão Passiva, Saneamento de Dados e Engenharia de Resiliência (Defensiva).

---

## 🛠️ 1. STACK TECNOLÓGICA E INFRAESTRUTURA
- **Runtime:** Node.js (v20+) com TypeScript estrito.
- **Package Manager:** `pnpm` (ESTRITAMENTE PROIBIDO).
- **Banco de Dados:** PostgreSQL (Prisma ORM - Supabase). 
- **Storage:** Cloudflare R2 (Egress Fee Zero).
- **Tipagem Monetária:** 
    - **Banco/Schema**: `Decimal(19, 4)` obrigatório.
    - **Lógica/Cálculo**: **`decimal.js` obrigatório**. O tipo `number` (IEEE 754) é PROIBIDO para aritmética monetária.
- **IA & Linter Fiscal:** Google Gemini (Vertex AI).

---

## 🚨 2. REGRAS DE OURO DA ENGENHARIA DEFENSIVA (INVARIANTES)

### Regra 1: O "Amortecedor" de Ingestão (`bank_movements`)
NUNCA atualize o saldo real (`Account.balance`) diretamente de integrações. Dados caem em `BankMovement` como `PENDING`.

### Regra 2: Arquitetura Zero-Trust & Singleton Prisma (CRÍTICO)
O isolamento por **Row-Level Security (RLS)** é obrigatório e ativado via `prisma.$extends`.
- **Singleton Mandatório:** Importe sempre de `src/lib/prisma.ts`. Proibido `new PrismaClient()`.
- **Acesso direto proibido:** Proibido chamar `prisma.model.findMany()` sem o filtro `workspaceId`. Use repositórios.

```typescript
// ✅ CORRETO — Repositório com contexto implícito
const accounts = await accountRepository.findAll(); // workspaceId injetado via tenantContext

// ❌ ERRADO — Acesso direto sem filtro de tenant
const accounts = await prisma.account.findMany();
```

### Regra 3: Deduplicação via Fuzzy Matching
Use a extensão `pg_trgm` (Trigramas) nativa do PostgreSQL para comparar descrições de OCR vs Open Finance.

### Regra 4: Exportação ERP (Windows-1252) e `MacroCategory`
- **Plano de Contas:** Toda nova `Category` no banco deve ter o campo `macroCategoryId`.
- **Encoding Legado:** Arquivos `.TXT` gerados no `ExportService` devem usar `Windows-1252` via `iconv-lite`.
- **Sanitização:** Remova emoticons, acentos e faça `truncate` exato para o limite do layout do ERP.

### Regra 5: Lastro de Evidência e Reconciliação (Tolerância de 5 centavos)
- Ao realizar reconciliação exija o *matching* cruzando Data e Valor. 
- Aplique uma **tolerância de erro de ±R$ 0,05** entre o valor do arquivo e o extrato bancário.

### Regra 6: Alta Performance do Hub B2B
Proibido o uso de `Promise.all` em tempo real para múltiplos clientes. Utilize a tabela de cache `accountant_dashboard_cache`.

### Regra 7: A Trava de Fechamento (`closedUntil`) — Lógica
Mutações bloqueadas se `data` <= `closedUntil`. O `TransactionService` deve disparar `HTTP 403`.

### Regra 8: Zero Billing Code
Billing 100% terceirizado (Stripe/Asaas). Proibido criar tabelas de `Subscription` ou `Plan` no Prisma.

### Regra 9: LGPD e os Limites do Super Admin
O `systemRole: 'ADMIN'` nunca vê valores financeiros, descrições brutas ou recibos. Use `prisma.$queryRawUnsafe()` apenas para totalizadores agregados.

---

## 🧬 3. CONTEXTO IMPLÍCITO E FLUXO TÉCNICO

### 3.1 `tenantContext` (AsyncLocalStorage)
- Use para propagar `workspaceId` e `userId` implicitamente.
- **Proibição Absoluta:** Proibido passar `workspaceId` como parâmetro em mais de um nível de profundidade (**Prop-drilling**).

```typescript
// ✅ CORRETO — Acessar via contexto
import { tenantContext } from '@/context/tenantContext';
const { workspaceId } = tenantContext.getStore()!;
```

### 3.2 Tratamento de Erros (`AppError`)
Erros de negócio devem usar a classe `AppError` com códigos HTTP semânticos:
- `400 Bad Request`: Validação/Input.
- `401 Unauthorized`: Auth.
- `403 Forbidden`: **Fiscal Lock** ou Violação de RLS.
- `404 Not Found`: Recurso não localizado no tenant.

---

## 🛠️ 4. CONVENÇÕES E ESTRUTURA

### 4.1 Git & Commits (Conventional Commits)
- `feat`: Novo, `fix`: Bug, `refactor`: Código, `docs`: Documentação, `chore`: Manutenção.

### 4.2 Estrutura de Ficheiros (Backend)
```
beckend/
├── prisma/ (schema, seed/modules)
├── src/
│   ├── context/ (tenantContext)
│   ├── services/ (Lógica de negócio)
│   ├── repositories/ (Acesso a dados + RLS)
│   ├── middlewares/ (Auth, error handler)
│   ├── routes/ (Express)
│   ├── errors/ (AppError)
```

### 4.3 TSC Strict Mode
Clean Architecture com isolamento em Use Cases/Services. TSC Strict Mode mandatório. TSC estático: `pnpm exec tsc --noEmit`.
