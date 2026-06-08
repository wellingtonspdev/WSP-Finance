# Technical Analysis - Dockerizacao Dev

## Identificacao

- Issue: Dockerizacao completa para desenvolvimento local
- Agente: Codex
- Data: 2026-06-07
- Branch: 144-s5-012-poctelegram-ocr-ingestao-telegram-ocr-para-bankmovement-pending
- Estado do git: working tree ja possuia alteracoes anteriores em README, backend e frontend antes desta fase.

## Modulos afetados

- [x] infraestrutura local
- [x] backend runtime
- [x] frontend dev server
- [x] banco PostgreSQL
- [ ] finance-core
- [ ] rbac-rls funcional

## Evidencias consultadas

| Fonte | Caminho | Observacao |
|---|---|---|
| Codigo | `backend/package.json` | `dev`, `prisma:generate`, `prisma:migrate:status`, seed Prisma |
| Codigo | `frontend/package.json` | Vite dev/build/test |
| Codigo | `backend/src/server.ts` | porta `3333`, CORS por `FRONTEND_URL`, `checkPrivileges` no startup |
| Codigo | `backend/src/lib/checkEnvironment.ts` | runtime nao pode usar SUPERUSER/BYPASSRLS |
| Codigo | `backend/prisma/seed.ts` | seed usa `DIRECT_URL` quando configurada |
| Documentacao | `_reversa_sdd/deployment.md` | confirma lacuna de Dockerfile/docker-compose |

## Fluxo tecnico atual

1. Backend Express/TypeScript roda `src/server.ts` com `pnpm run dev`.
2. Prisma usa `DATABASE_URL` para runtime e `DIRECT_URL` para migrations/seed/admin.
3. Startup do backend valida privilegios e aborta se o usuario atual for superuser ou bypass RLS.
4. Frontend Vite usa `VITE_API_URL` e roda na porta `5173`.
5. Banco esperado e PostgreSQL com migrations Prisma e extensao `pg_trgm`.

## Diagnostico

- Causa confirmada: nao existem artefatos Docker no repo.
- Causa provavel: onboarding depende de PostgreSQL local manual e dois processos Node separados.
- O que foi descartado: dockerizacao de producao nesta fase.
- Lacunas ainda abertas: validacao real com Docker depende de Docker Desktop e rede para baixar imagens.

## Contratos e regras que nao podem quebrar

- `DATABASE_URL` de runtime deve usar role sem SUPERUSER/BYPASSRLS.
- `DIRECT_URL` pode usar admin apenas para migrations/seed/bootstrap.
- `Transaction.id` continua UUID/string; `Account.id` e `Workspace.id` continuam number.
- OCR/Telegram continua usando `BankMovement` como staging; nenhum fluxo financeiro sera alterado.
- `.env`, certificados, uploads sensiveis e caches nao devem entrar nas imagens.

## Arquivos envolvidos

| Arquivo | Motivo | Tipo de mudanca esperada |
|---|---|---|
| `docker-compose.yml` | Orquestracao dev | novo |
| `.env.docker.example` | Config local sem segredos reais | novo |
| `backend/Dockerfile` | Imagem dev backend | novo |
| `backend/scripts/docker-dev-entrypoint.sh` | migrate/seed/start dev | novo |
| `backend/scripts/docker-prepare-runtime-role.ts` | role runtime restrita | novo |
| `frontend/Dockerfile` | Imagem dev frontend | novo |
| `backend/.dockerignore`, `frontend/.dockerignore` | reduzir contexto e proteger secrets | novo |
| `README.md` | onboarding Docker | adicao de secao |

## Testes existentes encontrados

| Teste | Cobre o que | Lacuna |
|---|---|---|
| Backend Vitest | regras de servicos e rotas | nao cobre Docker |
| Frontend Vitest/Build | UI e build | nao cobre compose |
| Prisma validate | schema Prisma | nao valida runtime Docker |

## Riscos tecnicos

| Risco | Severidade | Mitigacao |
|---|---|---|
| Backend falhar por superuser | alta | criar role `APP_DATABASE_USER` sem superuser/bypass e usar no `DATABASE_URL` |
| `docker compose up` baixar dependencias/imagens | media | validar quando autorizado/ambiente permitir rede |
| Seed automatico destrutivo em volume existente | media | documentar reset e uso dev/demo |
| CORS incorreto | media | configurar `FRONTEND_URL=http://localhost:5173` |

## Resultado da etapa

- Status: pronto para Matching/TDD
- Decisoes necessarias: nenhuma pendente para dev
- Proximo passo: implementar artefatos e validar
