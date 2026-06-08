# Verification - Dockerizacao Dev

## Veredito

Parcialmente aprovado. A implementacao da stack Docker dev foi criada e as validacoes estaticas principais passaram. A validacao full runtime ficou limitada por instabilidade do Docker Desktop/daemon durante a leitura de logs e comandos finais.

## Comandos executados

```powershell
docker compose config
```

Resultado: passou apos ajuste para nao expor envs de backend no frontend.

```powershell
cd backend
pnpm exec prisma validate
```

Resultado: passou. Prisma schema valido.

```powershell
git diff --check
```

Resultado: passou; apenas avisos de conversao LF/CRLF do Git para arquivos ja modificados no workspace.

```powershell
docker compose up -d --build
```

Resultado: passou apos correcoes nos Dockerfiles/entrypoints. Imagens backend/frontend foram construidas e containers foram criados.

```powershell
docker compose ps
docker compose exec db pg_isready -U wsp_admin -d wsp_finance
```

Resultado inicial: `db` healthy, `frontend` up, `adminer` up, `backend` up. `pg_isready` retornou accepting connections em uma execucao.

## Correcoes feitas durante a verificacao

- Fixado `pnpm@10.27.0` nos Dockerfiles para evitar comportamento do `pnpm 11` com build scripts.
- Backend Dockerfile passou a instalar dependencias com `--ignore-scripts` antes de copiar o schema, e a rodar `prisma generate` explicitamente depois do `COPY . .`.
- Frontend passou a iniciar com `pnpm exec vite --host 0.0.0.0`, evitando `vite -- --host`.
- Backend entrypoint deixou de reinstalar dependencias no startup para evitar boot lento e dependencia de rede.
- Volume backend de `node_modules` foi renomeado para inicializar limpo a partir da imagem.
- `backend/.pnpm-store` foi adicionado a `.gitignore` e `.dockerignore` para estabilizar Git/status e reduzir contexto Docker.

## Evidencias de runtime

- `docker compose up -d --build` criou:
  - `wsp_finance_db`
  - `wsp_finance_backend`
  - `wsp_finance_frontend`
  - `wsp_finance_adminer`
- `db` ficou healthy e exposto em `localhost:6543`.
- `frontend` ficou exposto em `localhost:5173`; logs mostraram Vite com `Network: http://172.x.x.x:5173/`.
- Backend iniciou bootstrap, aplicou fluxo de seed e chegou a registrar criacao de contas/categorias/transacoes.

## Limitacoes ambientais

- Durante a coleta final, Docker retornou erro de I/O lendo `json.log` do container backend:

```text
Error response from daemon: open /var/lib/docker/containers/...-json.log: input/output error
```

- Em seguida, alguns comandos Docker falharam ou travaram com:

```text
Falha ao inicializar o thread.
Falha na inicializacao do CLR com HRESULT 80004005.
```

- Por isso, nao foi possivel confirmar de forma conclusiva nesta sessao:
  - resposta final de `http://localhost:3333/docs`;
  - conclusao completa do seed;
  - login demo pelo browser.

## Riscos

- P0: nenhum identificado.
- P1: nenhum identificado.
- P2: validacao full runtime precisa ser repetida apos estabilizar/reiniciar Docker Desktop.
- P3: seed automatico e pesado; primeiro boot pode demorar varios minutos e recria dados de demo.

## Proximo passo recomendado

Reiniciar Docker Desktop se necessario e repetir:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose exec db pg_isready -U wsp_admin -d wsp_finance
Invoke-WebRequest -UseBasicParsing http://localhost:3333/docs
Invoke-WebRequest -UseBasicParsing http://localhost:5173
```
