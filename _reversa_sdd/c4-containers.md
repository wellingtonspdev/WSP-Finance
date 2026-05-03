# C4 Containers - WSP Finance

```mermaid
flowchart TB
  browser["Browser<br/>React/Vite SPA"] -->|REST JSON + Bearer JWT| api["Backend API<br/>Express TypeScript"]
  browser -->|PUT presigned| storage["Object Storage<br/>Cloudflare R2/S3"]
  api -->|Prisma Client| db["PostgreSQL<br/>RLS + indexes"]
  api -->|AWS SDK S3| storage
  api -->|HTTP fetch| ext["External Data APIs<br/>BrasilAPI/ViaCEP/ReceitaWS"]
  ofx["OFX file uploaded locally"] --> api
  openfinance["Open Finance webhook"] -->|Bearer JSON| api
  api -->|SMTP| mail["Mail Provider"]
  ci["GitHub Actions"] -->|pnpm test/build/e2e| browser
  ci -->|pnpm test/tsc/prisma| api
```

## Containers

| Container | Deploy/Runtime | Observações |
|---|---|---|
| Browser SPA | Vite build estático | Rotas privadas, workspace guard, Axios interceptors. |
| Backend API | Node.js | Express, Swagger, cron, fail-fast RLS. |
| PostgreSQL | Supabase/Postgres inferido pelo código e docs | RLS, Prisma migrations, `DIRECT_URL`. |
| Object Storage | R2/S3 | SSE-C para vault. |
| CI | GitHub Actions Ubuntu | Backend tests, frontend tests, Playwright smoke, SonarCloud. |
