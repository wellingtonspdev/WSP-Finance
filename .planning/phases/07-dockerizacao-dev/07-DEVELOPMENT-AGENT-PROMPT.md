# Development Agent Prompt - Dockerizacao Dev

Implemente apenas a dockerizacao de desenvolvimento local do WSP Finance.

## Objetivo

Criar uma stack Docker dev com PostgreSQL, backend Express/Prisma, frontend Vite e Adminer. O backend deve aplicar migrations, rodar seed automatico e iniciar em modo dev. O runtime do backend deve usar uma role sem SUPERUSER/BYPASSRLS.

## Skills obrigatorias

- `dockerizacao`
- `wsp-gsd-phase-orchestrator`

## Arquivos permitidos

- `docker-compose.yml`
- `.env.docker.example`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/scripts/docker-dev-entrypoint.sh`
- `backend/scripts/docker-prepare-runtime-role.ts`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `README.md` somente para secao Docker
- `.planning/phases/07-dockerizacao-dev/*`

## Arquivos fora de escopo

- Prisma schema/migrations existentes.
- Controllers/services/repositories financeiros.
- Fluxos Telegram/OCR.
- Testes de negocio.
- Git stage/commit/push.

## Regras

- Nao usar `localhost` para DB dentro dos containers.
- Nao copiar `.env`, certificados, uploads, node_modules ou dist para imagens.
- Nao criar imagens de producao nesta fase.
- Nao rodar comandos destrutivos como `docker compose down -v` sem aprovacao.
- Nao alterar RLS/RBAC/finance-core.

## Validacoes

Executar quando possivel:

```powershell
docker compose config
cd backend
pnpm exec prisma validate
git diff --check
```

Se Docker nao estiver disponivel ou precisar de rede/daemon fora do sandbox, registrar bloqueio ambiental e deixar o comando exato para o operador.
