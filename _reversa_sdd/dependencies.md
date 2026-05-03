# Dependencias - WSP-Finance

Gerado pelo Reversa Scout em 2026-05-02T18:27:56-03:00.

## Gerenciadores e manifests

- Backend manifest: `backend/package.json`
- Backend lockfile: `backend/pnpm-lock.yaml`
- Frontend manifest: `frontend/package.json`
- Frontend lockfile: `frontend/pnpm-lock.yaml`
- CI: Corepack com `pnpm@9.0.0`

## Backend

Manifest: `backend/package.json`

Scripts:

| Script | Comando |
|---|---|
| `dev` | `ts-node-dev --respawn --transpile-only src/server.ts` |
| `build` | `tsc` |
| `start` | `node dist/src/server.js` |
| `test` | `node --require ./scripts/vite-no-net-use.cjs ./node_modules/vitest/vitest.mjs run --config vitest.config.mjs --configLoader runner` |
| `test:watch` | `node --require ./scripts/vite-no-net-use.cjs ./node_modules/vitest/vitest.mjs --config vitest.config.mjs --configLoader runner` |
| `swagger` | `node swagger.js` |
| `postinstall` | `prisma generate` |
| `prisma:validate` | `prisma validate` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate:status` | `prisma migrate status` |

Dependencias principais:

| Pacote | Versao |
|---|---|
| `express` | `^4.21.2` |
| `@prisma/client` | `^6.2.1` |
| `prisma` | `^6.2.1` |
| `typescript` | `^5.7.3` |
| `vitest` | `^4.0.18` |
| `@vitest/coverage-v8` | `4.0.18` |
| `supertest` | `^7.2.2` |
| `zod` | `^3.24.1` |
| `jsonwebtoken` | `^9.0.2` |
| `bcryptjs` | `^2.4.3` |
| `cors` | `^2.8.5` |
| `dotenv` | `^16.4.7` |
| `multer` | `^1.4.5-lts.1` |
| `express-rate-limit` | `^8.2.1` |
| `swagger-ui-express` | `^5.0.1` |
| `swagger-jsdoc` | `^6.2.8` |
| `swagger-autogen` | `^2.23.7` |
| `@aws-sdk/client-s3` | `^3.726.1` |
| `@aws-sdk/s3-request-presigner` | `^3.999.0` |
| `axios` | `^1.7.9` |
| `decimal.js` | `^10.6.0` |
| `date-fns` | `^4.1.0` |
| `dayjs` | `^1.11.19` |
| `node-cache` | `^5.1.2` |
| `node-cron` | `^3.0.3` |
| `node-forge` | `^1.4.0` |
| `nodemailer` | `^6.9.16` |
| `ofx-js` | `^0.2.0` |
| `opossum` | `^9.0.0` |
| `uuid` | `^13.0.0` |

Leitura inicial:

- API HTTP em Express.
- Prisma como ORM e client PostgreSQL.
- Zod para validacao.
- Swagger gerado por `swagger-autogen` e servido por `swagger-ui-express`.
- Armazenamento externo/local abstraido por providers, com AWS S3/Cloudflare R2 plausivel pelo uso de S3 SDK e comentarios de rota.
- Testes com Vitest e Supertest.

## Frontend

Manifest: `frontend/package.json`

Scripts:

| Script | Comando |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `test` | `node --require ./scripts/vite-no-net-use.cjs ./node_modules/vitest/vitest.mjs run --config vitest.config.mjs --configLoader runner` |
| `test:watch` | `node --require ./scripts/vite-no-net-use.cjs ./node_modules/vitest/vitest.mjs --config vitest.config.mjs --configLoader runner` |
| `test:e2e` | `playwright test` |

Dependencias principais:

| Pacote | Versao |
|---|---|
| `react` | `^19.2.0` |
| `react-dom` | `^19.2.0` |
| `vite` | `^7.3.1` |
| `typescript` | `~5.9.3` |
| `@vitejs/plugin-react` | `^5.1.1` |
| `react-router-dom` | `^7.13.0` |
| `@tanstack/react-query` | `^5.90.21` |
| `zustand` | `^5.0.11` |
| `react-hook-form` | `^7.71.1` |
| `@hookform/resolvers` | `^5.2.2` |
| `zod` | `^4.3.6` |
| `axios` | `^1.13.5` |
| `decimal.js` | `^10.6.0` |
| `date-fns` | `^4.1.0` |
| `dayjs` | `^1.11.19` |
| `framer-motion` | `^12.35.2` |
| `lucide-react` | `^0.564.0` |
| `tailwindcss` | `^4.1.18` |
| `@tailwindcss/postcss` | `^4.1.18` |
| `tailwind-merge` | `^3.4.0` |
| `clsx` | `^2.1.1` |
| `browser-image-compression` | `^2.0.2` |
| `vitest` | `^4.0.18` |
| `@vitest/coverage-v8` | `^4.0.18` |
| `@testing-library/react` | `^16.3.2` |
| `@testing-library/jest-dom` | `^6.9.1` |
| `@testing-library/user-event` | `^14.6.1` |
| `jsdom` | `^28.1.0` |
| `@playwright/test` | `^1.58.2` |
| `eslint` | `^9.39.1` |
| `typescript-eslint` | `^8.48.0` |

Leitura inicial:

- SPA React com Vite.
- Roteamento por `react-router-dom`.
- Estado remoto via TanStack Query e estado local/global por Zustand/context providers.
- Forms com React Hook Form + Zod.
- Testes unitarios/integracao com Vitest/Testing Library e smoke E2E com Playwright.

## Dependencias de infraestrutura e qualidade

- GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `SonarSource/sonarcloud-github-action@v2`, `googleapis/release-please-action@v4`.
- Banco CI: `postgres:16-alpine`.
- SonarCloud: configurado por `sonar-project.properties`.
- Release automation: `release-please-config.json` e `.release-please-manifest.json`.

## Possiveis riscos para analise posterior

- Backend usa Prisma `^6.2.1` e frontend usa TypeScript `~5.9.3`; validar compatibilidade real apenas em build/test, nao inferir pelo manifest.
- Backend e frontend usam major diferente de Zod (`3.x` no backend, `4.x` no frontend); contratos compartilhados nao parecem centralizados neste Scout.
- Lockfiles separados indicam dois workspaces independentes, nao um monorepo pnpm workspace na raiz.
