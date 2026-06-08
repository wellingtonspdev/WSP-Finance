# TDD Plan - Dockerizacao Dev

## Identificacao

- Issue: Dockerizacao completa para desenvolvimento local
- Agente: Codex
- Data: 2026-06-07
- Modulo: infraestrutura dev
- Matching Report: `.planning/phases/07-dockerizacao-dev/07-MATCHING-REPORT.md`

## Objetivo testavel

> Provar que a stack Docker dev sobe banco, backend e frontend, aplica migrations/seed e expõe URLs locais funcionais sem usar superuser no runtime da API.

## Estrategia TDD

- Primeiro teste/validacao: `docker compose config`.
- Falha esperada antes da implementacao: ausencia de `docker-compose.yml`.
- Mudanca minima para passar: criar compose, Dockerfiles e env example.
- Refatoracao permitida: nenhuma em fluxos de negocio.

## Cenarios de teste

### Caminho feliz

- Dado `.env.docker` criado a partir de `.env.docker.example`.
- Quando `docker compose up -d --build` for executado.
- Entao `db` fica healthy, backend inicia na porta `3333`, frontend inicia na `5173`, Adminer abre na `8081`.

### Erros e validacoes

- `docker compose config` deve resolver variaveis e servicos.
- `backend` deve falhar se `DATABASE_URL` usar superuser; a configuracao planejada evita isso.
- `.dockerignore` deve excluir `.env`, uploads sensiveis, node_modules e dist.

### Permissao/RBAC/RLS

- `DATABASE_URL` aponta para `APP_DATABASE_USER`.
- `DIRECT_URL` aponta para admin apenas durante migrate/seed/bootstrap.
- Script de preparo valida `NOSUPERUSER + NOBYPASSRLS`.

### Regressao

- `cd backend; pnpm exec prisma validate`.
- `git diff --check`.

### UI/E2E

- Smoke manual em `http://localhost:5173`.
- Login demo apos seed com `joao@wsp.finance` / `password123`.

## Comandos planejados

```powershell
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs backend
docker compose exec db pg_isready -U wsp_admin -d wsp_finance
```

```powershell
cd backend
pnpm exec prisma validate
```

```powershell
git diff --check
git status --short -uall
```

## Criterios de conclusao

- [ ] Compose valido.
- [ ] Prisma schema valido.
- [ ] Backend e frontend sobem em containers.
- [ ] Seed automatico registrado e documentado como dev/demo.
- [ ] Falhas ambientais registradas sem mascarar regressao.
