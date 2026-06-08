# Issue Understanding - Dockerizacao Dev

## Identificacao

- Issue: Dockerizacao completa para desenvolvimento local
- Tipo: chore
- Prioridade: media-alta
- Solicitante: Wellington
- Data: 2026-06-07
- Agente responsavel: Codex

## Resumo em uma frase

> Criar uma stack Docker de desenvolvimento que suba PostgreSQL, backend, frontend e Adminer, com migrations e seed automaticos para demo local.

## Contexto da issue

- Descricao original: dockerizar o projeto por completo usando a skill `dockerizacao`, respeitando o fluxo GSD.
- Comportamento esperado: `docker compose up -d --build` deve preparar banco, aplicar migrations, rodar seed e expor backend/frontend.
- Comportamento atual: nao ha Dockerfiles, compose ou `.dockerignore` no projeto.
- Usuarios/atores afetados: desenvolvedores locais, avaliadores e operadores tecnicos de demo.
- Ambiente afetado: desenvolvimento local Windows/PowerShell com Docker Desktop.

## Escopo

### Dentro do escopo

- Docker Compose dev com `db`, `backend`, `frontend` e `adminer`.
- Dockerfiles dev para backend e frontend.
- Configuracao externa via `.env.docker`.
- `.dockerignore` por contexto de build.
- Bootstrap dev com migrate e seed automaticos.
- Documentacao de uso local.

### Fora do escopo

- Imagens otimizadas de producao.
- Deploy em cloud.
- Alteracoes de schema Prisma.
- Alteracoes funcionais em RLS/RBAC/finance-core.
- Commit, push ou finalizacao Git.

### Suposicoes

- Seed automatico e aceitavel apenas para dev/demo.
- Adminer sera usado como ferramenta auxiliar local.
- Porta externa do PostgreSQL sera `6543` para reduzir conflito com instalacoes locais.

### Lacunas que exigem confirmacao

- Nenhuma para a implementacao dev aprovada.

## Documentacao Reversa consultada

- `_reversa_sdd/process/issue-development-workflow.md`
- `_reversa_sdd/process/issue-analysis-template.md`
- `_reversa_sdd/process/technical-analysis-template.md`
- `_reversa_sdd/process/tdd-plan-template.md`
- `_reversa_sdd/deployment.md`

## Criterios de aceite

- `docker compose config` valida a configuracao.
- `docker compose up -d --build` sobe todos os servicos.
- Backend responde em `http://localhost:3333/docs`.
- Frontend responde em `http://localhost:5173`.
- Banco fica healthy e acessivel via Adminer em `http://localhost:8081`.
- `.env` real nao e copiado para imagens nem versionado.

## Riscos iniciais

| Risco | Impacto | Como validar |
|---|---|---|
| Runtime usar superuser e quebrar `checkPrivileges` | Backend nao inicia | Separar `DIRECT_URL` admin e `DATABASE_URL` restrito |
| Seed automatico limpar dados | Perda de dados locais dev | Documentar que e somente demo/dev |
| Frontend apontar para URL errada | UI nao chama API | Validar `VITE_API_URL=http://localhost:3333` |
| Secrets vazarem no build | Risco LGPD/seguranca | `.dockerignore` e `.env.docker.example` sem segredos reais |

## Resultado da etapa

- Status: pronto para analise tecnica
- Motivo: escopo e aceite definidos
- Proximo passo: technical analysis e matching
