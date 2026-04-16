# 💰 WSP Finance
![CI/CD](https://github.com/wellingtonspdev/WSP-Finance/actions/workflows/ci.yml/badge.svg)

O **WSP Finance** é uma plataforma de gestão financeira híbrida (SaaS), projetada para atender o "Empreendedor Híbrido": aquele que precisa gerenciar suas finanças **Pessoais (CPF)** e **Empresariais (CNPJ)** em um único lugar, com isolamento total de dados e inteligência de mercado.

---

## 🚀 Stack Tecnológica

### Backend (API)
*   **Core:** Node.js, TypeScript, Express.
*   **Dados:** PostgreSQL, Prisma ORM (Decimal Precision).
*   **Segurança:** JWT (Dual Token), RBAC (Owner/Editor/Viewer), Cookies HttpOnly.
*   **Features:** Cron Jobs (Automação), OFX Parser, Uploads (Local/S3).

### Frontend (Web App)
*   **Core:** React (Vite), TypeScript.
*   **Estilo:** Tailwind CSS v4 (Glassmorphism Premium).
*   **Estado:** TanStack Query (Server State), Context API.
*   **Segurança:** Axios Interceptors (Silent Refresh), Memory-only Tokens.

---

## 🛠️ Guia de Instalação e Execução

Siga os passos abaixo para rodar o projeto completo localmente.

### Pré-requisitos
*   Node.js (v18+)
*   PNPM (Recomendado) ou NPM
*   PostgreSQL (Rodando localmente ou Docker)

### 1. Configurando o Backend

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
# Copie o arquivo de exemplo e edite as chaves (necessário para JWT Refresh e Storage, etc)
cp .env.example .env

# 4. Prepare o Banco de Dados
npx prisma generate                 # Gera a tipagem do Prisma
npx prisma migrate dev --name init  # Cria as tabelas
npx prisma db seed                  # Popula com dados de teste (Ana Silva)

# 5. Inicie o Servidor
pnpm dev
```
*O Backend rodará em: `http://localhost:3333`*

### 2. Configurando o Frontend

```bash
# 1. Abra um novo terminal e entre na pasta do frontend
cd frontend

# 2. Instale as dependências
pnpm install

# 3. Configure a variável de ambiente
# Copie o arquivo de exemplo caso exista ou crie para apontar a API
cp .env.example .env

# 4. Inicie a Aplicação
pnpm dev
```
*O Frontend rodará em: `http://localhost:5173`*

---

## 🧪 Credenciais de Teste (Seed)

O script de seed cria um cenário completo com transações, contas e dois workspaces.

*   **E-mail:** `ana@wspfinance.com`
*   **Senha:** `senha123`

---

## 🌟 Funcionalidades Principais

1.  **Multi-tenancy Híbrido:** Alterne entre "Pessoal" e "Empresa" com um clique. Dados e relatórios são totalmente isolados.
2.  **Bridge Service:** Transfira dinheiro entre workspaces (ex: Pro-labore) com rastreabilidade e auditoria.
3.  **Inteligência PACT:** Cálculo automático de margem líquida para vendas de Marketplace (Shopee/ML).
4.  **Automação:** Alertas diários de contas a pagar e risco de caixa (Saldo projetado negativo).
5.  **Importação OFX:** Importe extratos bancários com deduplicação inteligente.

---

## 🏗️ Arquitetura do Projeto

O WSP Finance adota uma **Layered Architecture com Service Pattern**, organizada em monorepo com separação física entre `backend/`, `frontend/` e `documentacao/`. O isolamento multi-tenant é garantido por **dupla barreira**: filtro na aplicação (Prisma `$extends`) e **Row-Level Security (RLS)** diretamente no PostgreSQL.

### Visão Geral

O diagrama abaixo mostra todas as camadas do sistema: o frontend React se comunica com a API Express via JWT, os services orquestram a lógica de negócio, os repositories aplicam o filtro de tenant implicitamente, e o PostgreSQL garante isolamento via RLS. Serviços externos (Cloudflare R2, Gemini, Belvo) são integrados de forma desacoplada, e o pipeline de CI/CD roda testes com banco real antes de qualquer merge.

```mermaid
graph TB
    subgraph CLIENT["🖥️ Frontend — React + Vite"]
        UI["UI Layer<br/>shadcn/ui + Framer Motion + Tailwind v4"]
        FEATURES["Feature Modules<br/>Dashboard · Transactions · Accounts<br/>Bridge · Approval Inbox · Imports"]
        TANSTACK["TanStack Query<br/>Server State Cache"]
        AXIOS["Axios Client<br/>Silent Refresh Interceptor"]
    end

    subgraph API["⚙️ Backend — Node.js + Express + TypeScript"]
        direction TB
        subgraph EDGE["Camada de Entrada"]
            ROUTES["Routes<br/>Express Router"]
            MW["Middlewares<br/>Auth · Error Handler · Tenant Inject"]
        end

        subgraph CORE["Camada de Negócio"]
            SERVICES["Services Layer"]
            BRIDGE["BridgeService<br/>Partida Dobrada Atômica"]
            INGESTION["FinancialIngestionEngine<br/>Buffer → Aprovação"]
            FUZZY["FuzzyDeduplicationService<br/>pg_trgm + Fallback"]
            TRANS["TransactionService<br/>Fiscal Lock Guard"]
            CRON["CronService<br/>Alertas Automáticos"]
            AUDIT["AuditLogService<br/>balanceBefore · balanceAfter · delta"]
        end

        subgraph DATA["Camada de Dados"]
            REPOS["Repositories<br/>RLS Filter Implícito"]
            PRISMA["Prisma Client<br/>Singleton + $extends"]
            TENANT["tenantContext<br/>AsyncLocalStorage"]
        end
    end

    subgraph DB["🐘 PostgreSQL — Supabase"]
        RLS["Row-Level Security<br/>Isolamento por workspaceId"]
        TABLES["Tables<br/>User · Workspace · Account<br/>Transaction · BankMovement · AuditLog"]
        TRGM["pg_trgm Extension<br/>Fuzzy Matching Index"]
        IDX["Índices Otimizados<br/>B-Tree date DESC · GIN trigram"]
    end

    subgraph EXTERNAL["☁️ Serviços Externos"]
        R2["Cloudflare R2<br/>Storage"]
        GEMINI["Google Gemini<br/>Tax Linter IA"]
        BELVO["Belvo<br/>Open Finance"]
    end

    subgraph CICD["🔄 CI/CD — GitHub Actions"]
        CI_BACK["Backend Tests<br/>Postgres 16 · Vitest · TSC"]
        CI_FRONT["Frontend Tests<br/>Vitest"]
        SONAR["SonarCloud<br/>Quality Gate"]
        RELEASE["Release Please<br/>Semantic Versioning"]
    end

    UI --> FEATURES
    FEATURES --> TANSTACK
    TANSTACK --> AXIOS
    AXIOS -->|"JWT + HttpOnly Cookie"| ROUTES

    ROUTES --> MW
    MW -->|"Injeta tenantContext"| SERVICES

    SERVICES --> BRIDGE
    SERVICES --> INGESTION
    SERVICES --> TRANS
    SERVICES --> CRON
    SERVICES --> AUDIT
    INGESTION --> FUZZY

    BRIDGE --> REPOS
    INGESTION --> REPOS
    TRANS --> REPOS
    FUZZY --> REPOS
    AUDIT --> REPOS

    REPOS --> PRISMA
    PRISMA -->|"workspaceId via $extends"| TENANT
    PRISMA -->|"connection_limit=1<br/>pooler:6543"| RLS

    RLS --> TABLES
    TABLES --> TRGM
    TABLES --> IDX

    SERVICES -.->|"Upload"| R2
    SERVICES -.->|"Análise Fiscal"| GEMINI
    INGESTION -.->|"Webhooks"| BELVO

    CI_BACK --> SONAR
    CI_FRONT --> SONAR
    SONAR --> RELEASE
```

---

### Fluxo de Ingestão Financeira (2 Estágios)

A ingestão financeira opera em dois estágios para garantir integridade. Dados de múltiplas fontes (OFX, Open Finance via Belvo, OCR via WhatsApp) entram pelo `FinancialIngestionEngine`, passam por deduplicação fuzzy via `pg_trgm` (com fallback automático para `LIKE/LOWER()` em caso de falha), e são persistidos como `BankMovement` com status `PENDING`. Nenhum saldo é alterado neste estágio. Somente após aprovação explícita no Approval Inbox é que o movimento é convertido em `Transaction`, o saldo é atualizado atomicamente, e o `AuditLog` registra `balanceBefore`, `balanceAfter` e `delta`.

```mermaid
flowchart LR
    subgraph SOURCES["Fontes de Dados"]
        OFX["📄 Arquivo OFX"]
        WEBHOOK["🔗 Open Finance<br/>Belvo Webhook"]
        OCR["📸 WhatsApp OCR"]
    end

    subgraph STAGE1["Estágio 1 — Buffer"]
        ENGINE["FinancialIngestionEngine"]
        DEDUP["FuzzyDeduplicationService<br/>pg_trgm → fallback LIKE"]
        BM["BankMovement<br/>status: PENDING"]
    end

    subgraph STAGE2["Estágio 2 — Aprovação"]
        INBOX["Approval Inbox<br/>Contador / Owner"]
        APPROVE{{"Aprovar?"}}
        TX["Transaction<br/>Saldo Atualizado Atomicamente"]
        AUDIT_LOG["AuditLog<br/>balanceBefore · balanceAfter"]
    end

    OFX --> ENGINE
    WEBHOOK --> ENGINE
    OCR --> ENGINE

    ENGINE --> DEDUP
    DEDUP -->|"Duplicata?"| ENGINE
    ENGINE -->|"Novo"| BM

    BM --> INBOX
    INBOX --> APPROVE
    APPROVE -->|"✅ Sim"| TX
    APPROVE -->|"❌ Não"| REJECT["REJECTED"]
    TX --> AUDIT_LOG
```

---

### Segurança — Zero-Trust Multi-Tenant

O modelo de segurança opera com **princípio de menor privilégio** em todas as camadas. No startup, o sistema verifica se a role Postgres conectada possui `SUPERUSER` ou `BYPASSRLS` — se sim, a aplicação faz **hard crash** com `process.exit(1)`, impedindo qualquer operação com privilégios que neutralizem o RLS. Durante o request, o middleware de autenticação valida o JWT, extrai o `workspaceId` e o propaga via `AsyncLocalStorage` (`tenantContext`). O Prisma `$extends` injeta automaticamente o filtro `WHERE workspaceId = ?` em todas as queries, e o RLS do PostgreSQL aplica uma segunda barreira no nível do banco. Mesmo que a aplicação falhe em filtrar, o banco rejeita o acesso.

```mermaid
flowchart TB
    subgraph STARTUP["🚀 Startup Check"]
        CHECK["checkEnvironment.ts"]
        ROLE{"Role tem SUPERUSER<br/>ou BYPASSRLS?"}
        CRASH["❌ process.exit 1<br/>HARD CRASH"]
        OK["✅ Runtime seguro"]
    end

    subgraph REQUEST["📨 Request Flow"]
        REQ["HTTP Request"] --> AUTH["JWT Middleware<br/>Valida Access Token"]
        AUTH --> TENANT_MW["Tenant Middleware<br/>Extrai workspaceId"]
        TENANT_MW --> ASYNC["AsyncLocalStorage<br/>tenantContext.run"]
        ASYNC --> SERVICE["Service Layer"]
        SERVICE --> REPO["Repository"]
        REPO --> PRISMA_EXT["Prisma $extends<br/>Injeta WHERE workspaceId"]
        PRISMA_EXT --> PG_RLS["PostgreSQL RLS<br/>SET app.current_workspace_id"]
    end

    subgraph ISOLATION["🔒 Dupla Barreira"]
        APP_FILTER["Filtro na Aplicação<br/>Prisma $extends"]
        DB_FILTER["Filtro no Banco<br/>RLS Policy"]
        APP_FILTER --> DB_FILTER
        DB_FILTER --> RESULT["Dados do Tenant"]
    end

    CHECK --> ROLE
    ROLE -->|"Sim"| CRASH
    ROLE -->|"Não"| OK
    OK --> REQ
```

---

### Bridge Service — Partida Dobrada Atômica

O Bridge Service formaliza transferências entre workspaces (ex: pro-labore de CNPJ para CPF) usando partida dobrada contábil dentro de uma única transação de banco. O saldo é atualizado via `increment`/`decrement` atômico, duas transações são criadas (EXPENSE na origem, INCOME no destino), e o `AuditLog` registra `balanceBefore`, `balanceAfter` e `delta` para ambas as contas. Se qualquer etapa falhar, o `ROLLBACK` desfaz tudo — não existe estado intermediário.

```mermaid
sequenceDiagram
    participant U as 👤 Usuário
    participant BS as BridgeService
    participant DB as PostgreSQL
    participant AL as AuditLog

    U->>BS: Transferir R$3.000<br/>(CNPJ → CPF / Pro-labore)

    BS->>DB: BEGIN TRANSACTION

    Note over BS,DB: Operação Atômica

    BS->>DB: Account CNPJ<br/>decrement(3000)<br/>balanceBefore: 15000

    BS->>DB: Account CPF<br/>increment(3000)<br/>balanceBefore: 2000

    BS->>DB: Transaction CNPJ<br/>(EXPENSE / TRANSFER)

    BS->>DB: Transaction CPF<br/>(INCOME / TRANSFER)

    BS->>AL: AuditLog CNPJ<br/>delta: -3000<br/>balanceAfter: 12000

    BS->>AL: AuditLog CPF<br/>delta: +3000<br/>balanceAfter: 5000

    BS->>DB: COMMIT

    BS-->>U: ✅ Transferência concluída<br/>com rastreabilidade total
```

---

## 📚 Documentação da API

Com o backend rodando, acesse o Swagger completo em:
👉 **http://localhost:3333/docs**


