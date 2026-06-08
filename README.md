# WSP Finance

[![CI](https://github.com/wellingtonspdev/WSP-Finance/actions/workflows/ci.yml/badge.svg)](https://github.com/wellingtonspdev/WSP-Finance/actions/workflows/ci.yml)

**WSP Finance** e um SaaS de gestao financeira multi-tenant projetado para organizar operacoes financeiras de empresas, pessoas fisicas e contadores, com isolamento por workspace, RBAC, RLS, auditoria e fluxos de conciliacao antes do lancamento definitivo no ledger.

## Visao Geral

O objetivo do WSP Finance e resolver o problema de gestao financeira pulverizada enfrentado por pequenas e medias empresas, profissionais independentes e escritorios contabeis. O sistema oferece uma visao unificada do fluxo de caixa, permite registrar receitas e despesas, e separa movimentos bancarios crus em uma camada de staging (`BankMovement`) antes de transforma-los em lancamentos definitivos (`Transaction`).

## Publico-Alvo

- **Pequenas e medias empresas:** organizam financas em workspaces do tipo `BUSINESS`.
- **Profissionais autonomos e pessoas fisicas:** gerenciam contas e recebiveis em workspaces `PERSONAL`.
- **Contadores e auditores:** recebem acesso delegado como `ACCOUNTANT` para consultar, validar, aprovar fluxos permitidos e exportar informacoes contabeis de multiplos workspaces.

## Principais Funcionalidades

- **Autenticacao:** login com JWT e refresh token.
- **Usuarios demo:** seed com usuarios simulados para validacao local.
- **Workspaces:** separacao de dados entre `PERSONAL` e `BUSINESS`.
- **RBAC:** permissoes de workspace com `OWNER`, `EDITOR`, `VIEWER` e `ACCOUNTANT`; permissao de plataforma com `systemRole` `USER` ou `ADMIN`.
- **RLS:** isolamento em nivel de banco PostgreSQL para reduzir risco de acesso cruzado entre tenants.
- **Dashboard financeiro:** saldo, entradas, saidas e atividade recente baseados nos dados do workspace ativo.
- **Transactions:** ledger definitivo de entradas e saidas financeiras.
- **BankMovement:** staging de movimentos bancarios pendentes antes de aprovacao, rejeicao ou consolidacao.
- **Extrato:** listagem e filtros de transacoes, incluindo ordenacao por data.
- **Bridge / Pro-labore:** transferencia entre workspace PJ e PF com transacoes cruzadas e auditoria.
- **Pro-labore recorrente:** agenda recorrencias e gera pendencias; a movimentacao financeira acontece somente apos confirmacao manual.
- **Exportacao contabil:** validacao e geracao de exportacao TXT Dominio para contadores.
- **Anexos e certificado A1:** suporte a upload e armazenamento seguro via provider S3/R2 quando configurado.
- **AI Insights:** provider fake/local para demonstracao de alertas e analises pedagogicas.
- **OCR / Telegram:** POC para ingestao via Telegram/OCR, mantendo movimentos como `BankMovement` pendente.
- **Open Finance:** webhook/mock local para simulacao de recebimento de lotes bancarios.
- **Auditoria:** registro de acoes sensiveis sem gravar PII, OCR bruto, certificados ou payloads sensiveis em logs.

## Arquitetura

O projeto e uma aplicacao fullstack em um unico repositorio, com `backend/` e `frontend/` como raizes independentes. Nao ha `package.json` raiz.

- **Backend:** Node.js, Express e TypeScript, organizado em controllers, services, repositories, middlewares e rotas.
- **ORM:** Prisma para schema, migrations, client tipado e seed.
- **Banco de dados:** PostgreSQL 15+ com RLS, migrations Prisma e extensao `pg_trgm`.
- **Seguranca:** middlewares de autenticacao, workspace, RBAC e uso de contexto tenant no Prisma.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Query e Zustand.
- **Documentacao:** `_reversa_sdd/`, `.planning/`, `documentacao/`, `PRODUCT_SCOPE_MASTER.md`, `BACKEND_GUIDELINES.md` e `FRONTEND_GUIDELINES.md`.

## Estrutura de Pastas

```text
backend/                 API Node.js/Express
backend/prisma/          schema.prisma, migrations e seed
backend/src/             controllers, services, repositories, middlewares e rotas
backend/tests/           testes backend unitarios e de integracao
frontend/                SPA React/Vite
frontend/src/            features, componentes, hooks, stores e clients
frontend/tests/          testes frontend
_reversa_sdd/            documentacao tecnica e processo Reversa
.planning/               artefatos GSD de projeto, requisitos e roadmap
documentacao/            ADRs e documentacao historica
```

## Stack e Versoes

- **Node.js:** homologado localmente em `v22.16.0`.
- **pnpm:** homologado localmente em `10.27.0`.
- **PostgreSQL:** `15+`.
- **Prisma:** `6+`.
- **Backend:** Express, TypeScript, Zod, Vitest.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Query, Zustand.

As versoes exatas de bibliotecas ficam nos arquivos `backend/package.json` e `frontend/package.json`.

## Setup do Zero

### 1. Clone o repositorio

```bash
git clone <URL_DO_REPOSITORIO>
cd WSP-Finance
```

### 2. Instale as dependencias

```bash
cd backend
pnpm install

cd ../frontend
pnpm install
```

### 3. Crie os bancos PostgreSQL

```sql
CREATE DATABASE wsp_finance;
CREATE DATABASE wsp_finance_test;
```

O usuario PostgreSQL usado nas variaveis de ambiente precisa conseguir executar `CREATE EXTENSION`, pois as migrations instalam `pg_trgm`.

### 4. Configure o backend

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env` com as credenciais reais do seu PostgreSQL local.

O `.env.example` do backend tambem documenta configuracoes opcionais de R2, Telegram, OCR, AI provider e integracoes. Em desenvolvimento local direto, aponte `DATABASE_URL` e `DIRECT_URL` para o banco local. Se estiver usando pooler, `DATABASE_URL` pode apontar para o pool e `DIRECT_URL` deve apontar diretamente para o PostgreSQL.

Exemplo local direto:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance?schema=public"
DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance?schema=public"
JWT_SECRET="troque-por-um-segredo-local"
JWT_REFRESH_SECRET="troque-por-outro-segredo-local"
APP_URL="http://localhost:3333"
```

Secrets locais podem ser gerados com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Configure o frontend

```bash
cd frontend
cp .env.example .env
```

Valor local esperado:

```env
VITE_API_URL="http://localhost:3333"
```

### 6. Rode migrations e seed do banco principal

```bash
cd backend
pnpm run prisma:generate
pnpm exec prisma migrate dev
pnpm exec prisma db seed
```

O seed recria dados de demonstracao e pode limpar dados locais. Nao rode seed em producao.

### 7. Configure o banco de teste

O repositorio possui `backend/.env.example`, mas pode nao possuir `backend/.env.test.example` em todas as branches. Se o arquivo de exemplo de teste nao existir, crie `backend/.env.test` manualmente com as mesmas chaves minimas do `.env`, apontando para `wsp_finance_test`.

Exemplo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
JWT_SECRET="segredo-de-teste"
JWT_REFRESH_SECRET="refresh-de-teste"
APP_URL="http://localhost:3333"
```

Em maquina limpa, aplique migrations e seed tambem no banco de teste:

```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
$env:DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/wsp_finance_test?schema=public"
pnpm exec prisma migrate dev
pnpm exec prisma db seed
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

O `globalSetup` do Vitest (`backend/src/test/setup-test-role.ts`) carrega o `.env.test` e prepara a role restrita de teste. Ele nao substitui migrations e seed em um banco vazio.

## Execucao Local

Terminal 1:

```bash
cd backend
pnpm run dev
```

Terminal 2:

```bash
cd frontend
pnpm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3333
- Swagger/API docs: http://localhost:3333/docs

## Execucao Local Com Docker

Esta stack Docker e apenas para desenvolvimento/demo local. O backend aplica migrations e roda o seed automaticamente no startup; o seed pode recriar dados locais e nao deve ser usado em producao.

Servicos:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3333
- Swagger/API docs: http://localhost:3333/docs
- Adminer: http://localhost:8081
- PostgreSQL no host: `localhost:6543`
- PostgreSQL dentro do Docker: `db:5432`

Subir tudo:

```powershell
docker compose up -d --build
```

Verificar estado e logs:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

Validar o banco:

```powershell
docker compose exec db pg_isready -U wsp_admin -d wsp_finance
```

Credenciais padrao de desenvolvimento ficam em `.env.docker.example`. Para customizar localmente sem versionar segredos, copie para `.env.docker` e rode o compose com `--env-file`:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

O backend usa duas conexoes:

- `DIRECT_URL`: usuario admin local para migrations, seed e preparacao da role.
- `DATABASE_URL`: usuario restrito de runtime, sem `SUPERUSER` e sem `BYPASSRLS`.

Adminer:

- Sistema: `PostgreSQL`
- Servidor: `db`
- Usuario: `wsp_admin`
- Senha: `wsp_admin_dev_password`
- Banco: `wsp_finance`

Resetar completamente o banco Docker remove o volume e apaga os dados locais. Execute somente quando quiser recriar tudo do zero:

```powershell
docker compose down -v
docker compose up -d --build
```

## Credenciais Demo

Apos rodar `pnpm exec prisma db seed`, estes usuarios ficam disponiveis:

| Papel | Email | Senha | Descricao |
| --- | --- | --- | --- |
| Admin de plataforma | `admin@wsp.finance` | `password123` | Backoffice/admin isolado |
| Contador senior | `auditoria@wsp.finance` | `password123` | Torre de comando com clientes |
| Contadora junior | `fernanda@contabil.com` | `password123` | Contadora sem clientes ativos |
| Cliente | `joao@wsp.finance` | `password123` | Perfil demo com PF e PJ |
| Cliente | `maria@wsp.finance` | `password123` | Perfil demo empresarial |
| Cliente | `pedro@wsp.finance` | `password123` | Perfil demo empresarial |
| Cliente | `ana@wsp.finance` | `password123` | Perfil demo empresarial |
| Cliente | `lucas@wsp.finance` | `password123` | Perfil demo empresarial |

Fluxo sugerido:

1. Acesse http://localhost:5173.
2. Entre como `joao@wsp.finance` / `password123`.
3. Verifique Dashboard, Extrato, Nova Transacao e Pro-labore.
4. Entre como `auditoria@wsp.finance` / `password123`.
5. Verifique a visao de contador, clientes, pendencias e exportacao contabil.

## Testes e Qualidade

Backend:

```bash
cd backend
pnpm run prisma:validate
pnpm exec tsc --noEmit
pnpm test
```

Frontend:

```bash
cd frontend
pnpm run lint
pnpm test
pnpm run build
```

Validacoes Git recomendadas antes de finalizar uma fase:

```bash
git branch --show-current
git status --short -uall
git diff --stat
git diff --check
```

## Banco de Dados

- `Account` e infraestrutura interna para saldo e origem de dinheiro.
- `Transaction` e o ledger definitivo.
- `BankMovement` e staging de movimentos pendentes.
- `Workspace.id` e `Account.id` sao numericos.
- `Transaction.id` e UUID/string.
- `DATABASE_URL` e a conexao principal do runtime.
- `DIRECT_URL` deve apontar diretamente para o PostgreSQL para migrations.
- `pg_trgm` e habilitado por migration para busca fuzzy.

## Regras de Seguranca e Produto

- Preserve RLS/RBAC em qualquer alteracao.
- Nao use `sysPrisma` por conveniencia em fluxos tenant.
- Nao crie `Transaction` diretamente a partir de OCR/Telegram; use `BankMovement`.
- Nao grave PII, OCR bruto, TXT bruto, base64 de certificado ou payload sensivel em `AuditLog`.
- Nao automatize movimentacao financeira de pro-labore recorrente por cron. O cron gera pendencias; a confirmacao manual executa a transferencia.
- Nao rode seed em producao.
- Nao comite `.env`, certificados, anexos reais ou segredos.

## Integracoes e Mocks

- `AI_PROVIDER="fake"` permite insights locais sem chamadas externas.
- `OCR_PROVIDER="fake"` permite validar OCR sem provider real.
- `TELEGRAM_BOT_ENABLED="false"` mantem a POC Telegram desativada por padrao.
- R2/S3 e opcional para desenvolvimento local.
- Open Finance pode ser simulado via webhook/mock local.

## Troubleshooting

- **PostgreSQL `ECONNREFUSED`:** confirme host, porta e se o servico esta rodando.
- **Banco inexistente:** crie `wsp_finance` e `wsp_finance_test` manualmente.
- **Erro em `pg_trgm`:** use usuario com permissao de `CREATE EXTENSION`.
- **`DIRECT_URL` em ambiente com pooler:** mantenha `DIRECT_URL` direto no banco, sem PgBouncer/pooler.
- **JWT invalido:** gere novos valores para `JWT_SECRET` e `JWT_REFRESH_SECRET`.
- **Portas ocupadas:** backend usa `3333`; frontend usa `5173`.
- **Prisma generate com `EPERM` no Windows:** feche processos Node/Vite/Vitest/TS Server que estejam segurando a DLL e rode novamente.
- **Frontend nao chama backend:** confira `frontend/.env` e `VITE_API_URL`.
- **Testes DB-backed falhando em maquina limpa:** aplique migrations e seed no banco de teste antes de `pnpm test`.

## Documentacao Complementar

- `PRODUCT_SCOPE_MASTER.md`
- `BACKEND_GUIDELINES.md`
- `FRONTEND_GUIDELINES.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `_reversa_sdd/architecture.md`
- `_reversa_sdd/domain.md`
- `_reversa_sdd/erd-complete.md`
- `_reversa_sdd/permissions.md`
- `_reversa_sdd/deployment.md`
- `documentacao/ADR_001_justificativa_refatoracao_pr1_pr4.md`

## Plano Seguro Para Substituir a `main` Remota

Como a branch atual e a funcional e a `main` remota esta quebrada, a forma mais segura e preservar historico e publicar um commit em `main` que substitua o conteudo pelo estado validado desta branch, sem force push inicialmente.

Plano recomendado:

1. Fechar e validar esta branch funcional, incluindo este README.
2. Commitar seletivamente apenas os arquivos aprovados da branch funcional.
3. Fazer push da branch funcional para o remoto.
4. Criar uma referencia de backup da `main` remota antes da troca.
5. Atualizar a branch local `main` a partir de `origin/main`.
6. Substituir o conteudo da `main` pelo conteudo da branch funcional.
7. Gerar um commit convencional na `main`, por exemplo `chore: substitui main pelo estado funcional`.
8. Rodar validacoes minimas antes do push.
9. Fazer push normal para `origin main`.

Use force push apenas se houver decisao explicita de reescrever historico remoto.
