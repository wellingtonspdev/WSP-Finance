# WSP Finance

**WSP Finance** e um SaaS de gestao financeira multi-tenant robusto, projetado para oferecer seguranca, escalabilidade e conformidade com a LGPD.

## Visao Geral e Objetivo

O objetivo do WSP Finance e resolver o problema de gestao financeira pulverizada enfrentado por pequenas e medias empresas, alem de profissionais independentes. O sistema oferece uma visao unificada e segura do fluxo de caixa, permitindo nao so o registro do que foi gasto ou recebido, mas tambem facilitando a conciliacao bancaria atraves de uma area de *staging* (BankMovement) antes do lancamento definitivo (Transaction).

## Publico-Alvo

- **Pequenas e Medias Empresas (PMEs):** que necessitam organizar financas em workspaces do tipo `BUSINESS`.
- **Profissionais Autonomos/Pessoas Fisicas:** que utilizam a plataforma para gerenciar suas contas e recebiveis em workspaces `PERSONAL`.
- **Contadores e Auditores:** profissionais que recebem acesso externo (tipo `ACCOUNTANT`) para consultar e exportar informacoes de multiplos workspaces sem poder modificar os dados primarios.

## Principais Funcionalidades

- **Autenticacao:** Login seguro via JWT.
- **Usuarios Demo:** Seed preparado com usuarios simulados para facilitar validacao (ver secao *Credenciais Demo*).
- **Workspaces:** Separacao rigida de dados usando os perfis `PERSONAL` e `BUSINESS`.
- **Acesso para Contador:** Perfil especifico (`ACCOUNTANT`) para facilitar a exportacao de dados contabeis.
- **Dashboard Financeiro:** Visao consolidada de saldo, despesas e receitas.
- **Transacoes (Ledger Definitivo):** Registro consolidado de entradas e saidas.
- **BankMovement (Staging):** Camada temporaria para movimentos bancarios crus aguardando categorizacao ou aprovacao antes de virarem *Transactions*.
- **Controle de Acesso Baseado em Funcao (RBAC):** Controle de privilegios (`ADMIN`, `MEMBER`, `VIEWER`, `ACCOUNTANT`) em nivel de workspace.
- **Seguranca em Nivel de Linha (RLS):** Isolamento total dos dados no banco PostgreSQL; tenants nao conseguem enxergar dados alheios mesmo em falhas de aplicacao.
- **Auditoria:** Rastreio imutavel de eventos sensiveis (criacao/modificacao).
- **Exportacao Contabil:** Geracao de planilhas e relatorios estruturados para contadores.
- **Anexos / Certificado A1:** Upload seguro de arquivos criptografados via envelope de seguranca para o provedor R2/S3.
- **AI Insights:** Fake/Local provider para demonstracao de IA na categorizacao e analise.
- **OCR / Telegram:** Fake/Local providers para extracao de dados via recibos e interacao inicial do chatbot.
- **Pro-Labore Recorrente:** Logica para provisionar automaticamente pagamentos fixos.

## Arquitetura

O projeto e uma aplicacao fullstack organizada em duas pastas principais (`backend/` e `frontend/`) dentro de um unico repositorio:

- **Backend:** Express em Node.js com TypeScript, organizado em rotas, controladores, servicos e repositorios (padrao MVC/Service).
- **ORM:** Prisma para tipagem segura, geracao de *queries* otimizadas e gerenciamento de *migrations*.
- **Banco de Dados:** PostgreSQL 15+, com regras de isolamento RLS e extensoes essenciais como `pg_trgm` para buscas textuais.
- **Seguranca Nativa:** RLS/RBAC gerenciado por middleware customizado e Prisma Client Extensions no backend.
- **Frontend:** React com Vite, Tailwind CSS, gerenciamento de estado e requisicoes otimizadas (ex: React Query/Zustand), oferecendo uma SPA moderna e responsiva.

## Estrutura de Pastas

- **`/backend`**: Codigo do servidor da API Node.js/Express.
- **`/backend/prisma`**: Esquema do banco de dados (schema.prisma), scripts de seed e *migrations*.
- **`/backend/tests`**: Suite de testes automatizados unitarios e de integracao do backend.
- **`/frontend`**: Aplicacao SPA em React/Vite.
- **`/_reversa_sdd`**: Documentacao tecnica continua focada em design de software estruturado (Processos, Identidade, Entidade-Relacionamento, Permissoes).
- **`/.planning`**: Arquivos de ciclo de vida do projeto (Project, Roadmap, Requisitos) baseados no framework GSD.
- **`/documentacao`**: Documentacoes historicas, ADRs (Architecture Decision Records) e fluxos gerais do negocio.

## Stack e Versoes Homologadas

- **Node.js**: `v22.16.0`
- **pnpm**: `10.27.0`
- **PostgreSQL**: `15+`
- **Prisma**: `6+`
- **React / Vite**: Versoes atuais homologadas nos arquivos `package.json`.
- **TypeScript**: Para consistencia fullstack.

## Setup do Zero

### 1. Clone do repositorio

```bash
git clone <URL_DO_REPOSITORIO>
cd WSP-Finance
```

### 2. Instalacao de dependencias

```bash
# Backend
cd backend
pnpm install

# Frontend
cd ../frontend
pnpm install
```

### 3. Criacao dos bancos de dados

Acesse seu SGBD local PostgreSQL e crie os bancos:

```sql
CREATE DATABASE wsp_finance;
CREATE DATABASE wsp_finance_test;  -- necessario para rodar a suite de testes
```

> **Importante:** O usuario PostgreSQL configurado nas variaveis de ambiente precisa ter
> privilegio de `CREATE EXTENSION` para que o Prisma Migrate instale a extensao `pg_trgm`
> na primeira execucao. Normalmente o usuario `postgres` ja possui essa permissao.

### 4. Variaveis de ambiente

O projeto usa dois arquivos de ambiente no backend:

| Arquivo      | Finalidade                                       | Banco alvo          |
|--------------|--------------------------------------------------|---------------------|
| `.env`       | Execucao local (dev) e migrations/seed           | `wsp_finance`       |
| `.env.test`  | Suite de testes Vitest (backend)                  | `wsp_finance_test`  |

```bash
cd backend

# Ambiente de desenvolvimento/runtime
cp .env.example .env
# Edite .env substituindo LOCAL_PASSWORD pela senha real do seu PostgreSQL local.

# Ambiente de teste
cp .env.test.example .env.test
# Edite .env.test substituindo LOCAL_PASSWORD pela senha real do seu PostgreSQL local.
```

### 5. Setup do banco principal (desenvolvimento)

```bash
cd backend
pnpm run prisma:generate
pnpm exec prisma migrate dev
pnpm exec prisma db seed
```

> **O que cada comando faz:**
> - `prisma:generate` — Gera o Prisma Client a partir do schema.
> - `prisma migrate dev` — Aplica todas as migrations pendentes (inclui `CREATE EXTENSION IF NOT EXISTS pg_trgm`).
> - `prisma db seed` — Popula o banco com dados de demonstracao. **Nao rode em producao.**

### 6. Setup do banco de teste

O banco `wsp_finance_test` tambem precisa receber migrations e seed antes de rodar a suite completa. Alguns testes DB-backed validam o estado demo (`joao@wsp.finance`, `auditoria@wsp.finance`, configuracoes de exportacao e dashboard), entao um banco de teste vazio nao e suficiente.

```bash
cd backend

# Aponte temporariamente para o banco de teste para rodar as migrations:
# No Windows PowerShell:
$env:DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
$env:DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
pnpm exec prisma migrate dev
pnpm exec prisma db seed

# Depois limpe as variaveis para voltar ao .env padrao:
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

> **Alternativa:** Se preferir, edite temporariamente o `.env` para apontar para
> `wsp_finance_test`, rode `pnpm exec prisma migrate dev` e `pnpm exec prisma db seed`, e depois reverta.

O `globalSetup` do Vitest (`src/test/setup-test-role.ts`) carrega o `.env.test` automaticamente
e cria a role restrita de teste no PostgreSQL. Ele nao executa migrations nem seed automaticamente; esses passos precisam ser feitos antes de `pnpm test` em uma maquina limpa.

### 7. Execucao local

```bash
# Terminal 1 (backend)
cd backend
pnpm run dev
# Aguarde iniciar na porta 3333

# Terminal 2 (frontend)
cd frontend
pnpm run dev
# Aguarde iniciar na porta 5173
```

- **URL Frontend:** http://localhost:5173
- **URL Backend API:** http://localhost:3333
- **Swagger/Documentacao da API:** http://localhost:3333/docs
- **Healthcheck:** `curl http://localhost:3333/health`

## Credenciais Demo

Apos rodar o seed (`pnpm exec prisma db seed`), os seguintes usuarios ficam disponiveis:

| Papel                | Email                     | Senha        | Descricao                          |
|----------------------|---------------------------|--------------|------------------------------------|
| Contador Senior      | `auditoria@wsp.finance`   | `password123`| 10 clientes na Torre de Comando    |
| Contadora Junior     | `fernanda@contabil.com`   | `password123`| 0 clientes (1 convite PENDING)     |
| Cliente              | `joao@wsp.finance`        | `password123`| Dropshipping - perfil saudavel     |
| Cliente              | `maria@wsp.finance`       | `password123`| Tech - perfil de risco             |
| Cliente              | `pedro@wsp.finance`       | `password123`| Logistics - perfil transicao       |
| Cliente              | `ana@wsp.finance`         | `password123`| Cafe Gourmet - perfil saudavel     |
| Cliente              | `lucas@wsp.finance`       | `password123`| Dev Studio - perfil saudavel       |

**Fluxo de demonstracao sugerido:**

1. Acesse o Frontend em http://localhost:5173.
2. Faca login como `joao@wsp.finance` / `password123`.
3. Visualize o Dashboard com os dados criados pelo seed.
4. Explore a area de Movimentacoes Bancarias.
5. Faca login como `auditoria@wsp.finance` para verificar a visao de Contador.

## Testes e Qualidade

O repositorio esta equipado com validacoes profundas. Sempre rode a suite antes de commits:

**Backend:**

```bash
cd backend
pnpm run prisma:validate
pnpm exec tsc --noEmit
pnpm test
```

**Frontend:**

```bash
cd frontend
pnpm run lint
pnpm test
pnpm run build
```

## Variaveis de Ambiente (`.env`)

- **Obrigatorias minimas:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_URL`.
- **Opcionais/Mocadas:** Chaves de R2 (`R2_ACCOUNT_ID`), Integracoes (`RECEITA_WS_TOKEN`), e mocks de Inteligencia (`AI_PROVIDER="fake"`, `OCR_PROVIDER="fake"`).
- **Gerando secrets localmente:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## Banco de Dados

- **`DATABASE_URL`**: Conexao primaria do banco de dados local. Caso haja um pooler em producao, isso geralmente aponta para ele. Localmente, aponta diretamente para o banco (porta `5432`).
- **`DIRECT_URL`**: Usado pelo Prisma para gerenciar *migrations* e *schema changes*. Sempre deve apontar diretamente para a porta do PostgreSQL.
- **Extensao `pg_trgm`**: Utilizada para pesquisa por similaridade/fuzzy match. Instalada automaticamente pela migration `20260412021800_enable_pg_trgm_fuzzy_index`. Requer que o usuario PostgreSQL tenha privilegio de `CREATE EXTENSION`.
- **Aviso de Seed**: O script `pnpm exec prisma db seed` destroi o estado local (cleanup agressivo) e recria dados para demonstracao. Nao rode em bancos de producao.

## Integracoes e Mocks

- **AI & OCR:** O sistema permite a configuracao de provedores falsos (`"fake"`) no arquivo `.env` para fins de desenvolvimento. Isso simula inferencia local sem custos ou chamadas externas.
- **Telegram:** A integracao do Bot e via POC S5-012. Mantem-se inativa (`TELEGRAM_BOT_ENABLED="false"`) por padrao para nao travar builds locais sem tokens reais.
- **Armazenamento de Arquivos:** Compativel com AWS S3 / Cloudflare R2, mas inteiramente opcional na fase atual.
- **Open Finance:** Mock de Webhooks locais para simulacao de recebimentos de lotes bancarios.

## Seguranca e Conformidade (LGPD)

- **Dados Ficticios:** O Seed so gera informacoes *mock*, sem vazamento de dados reais.
- **Manejo de Segredos:** O arquivo `.env` jamais deve ser comitado. Use `.env.example` sem credenciais veridicas.
- **Auditoria de Logs:** Transacoes criptografadas. Nunca logue Informacoes Pessoalmente Identificaveis (PII), textos *raw* de OCR ou strings base64 de Certificados no AuditLog.
- **Defesa de Dados (RLS):** Garantido pelo bloqueio em nivel de banco que nenhum workspace tenha visualizacao cruzada de registros.

## Troubleshooting

- **Erro de Conexao PostgreSQL (ECONNREFUSED):** Verifique se o servico/docker do banco esta de pe na porta apontada em `DATABASE_URL`.
- **Banco nao criado:** Crie-o manualmente (`CREATE DATABASE wsp_finance`). O Prisma Migrate nao cria a *database* automaticamente.
- **Erro de `pg_trgm`:** Verifique se o seu usuario PostgreSQL tem permissoes de `CREATE EXTENSION` (superusuario ou proprietario do banco).
- **Erro `DIRECT_URL` no Vercel/Ambiente Nuvem:** Em producao, se utilizar pgBouncer para o pool, o `DIRECT_URL` precisa apontar para a porta 5432 fisica do banco, desviando do PgBouncer.
- **Token Invalido / JWT_SECRET:** Confirme se copiou corretamente as variaveis `.env.example` e substituiu `CHANGE_ME...` por strings de 32 bytes geradas de forma aleatoria.
- **Portas Ocupadas:** O backend roda nativamente na `3333` e o frontend na `5173`. Finalize processos suspensos com `npx kill-port 3333 5173`.
- **Prisma generate com EPERM no Windows:** Erro com lock de `.dll.node`. Feche os processos Node, Vitest ou TS-Server/Vite, aguarde alguns segundos e repita `pnpm run prisma:generate`.
- **Frontend nao chama Backend:** Verifique o `.env.local` (ou arquivo equivalente do Vite) em `frontend` apontando para `VITE_API_URL=http://localhost:3333`.
- **Suite de testes backend serial (`fileParallelism: false`):** A suite de testes do backend roda arquivos de forma serial para evitar corrida em fixtures compartilhadas no banco de dados. Isso e intencional e configurado em `vitest.config.ts`.
- **Diferenca entre `.env` e `.env.test`:** O `.env` e usado para execucao local (dev server, migrations, seed). O `.env.test` e carregado pelo `globalSetup` do Vitest e aponta para o banco `wsp_finance_test`, garantindo isolamento total dos testes automatizados.

## Documentacao Complementar

O ecossistema WSP Finance documenta decisoes essenciais e definicoes de forma estruturada:

- **Guias Tecnicos:**
  - `BACKEND_GUIDELINES.md`
  - `FRONTEND_GUIDELINES.md`
- **Escopo e Planejamento:**
  - `PRODUCT_SCOPE_MASTER.md`
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
- **Engenharia Reversa / Documentacao Tecnica (`_reversa_sdd/`):**
  - `_reversa_sdd/architecture.md` (Arquitetura macro do projeto)
  - `_reversa_sdd/domain.md` (Design de Dominio Central)
  - `_reversa_sdd/erd-complete.md` (Diagrama Entidade-Relacionamento e Regras RLS)
  - `_reversa_sdd/permissions.md` (Regras de RBAC e Controle de Acesso)
  - `_reversa_sdd/deployment.md` (Estrategia de Infra/Deploy)
- **Historico e Decisoes:**
  - `documentacao/ADR_001_justificativa_refatoracao_pr1_pr4.md` (Justificativas de arquitetura)
