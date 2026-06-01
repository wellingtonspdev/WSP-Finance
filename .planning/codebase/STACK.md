# Technology Stack

**Analysis Date:** 2026-05-31

## Languages

**Primary:**
- TypeScript - Backend API in `backend/src/**/*.ts`, Prisma seed/scripts in `backend/prisma/seed.ts`, frontend app in `frontend/src/**/*.ts` and `frontend/src/**/*.tsx`.
- TSX/React - Frontend route and component tree in `frontend/src/**/*.tsx`.

**Secondary:**
- SQL - Database maintenance, RLS, and benchmarking scripts in `scripts/*.sql` and Prisma migrations under `backend/prisma/migrations/`.
- JavaScript/CommonJS - Tooling and generated/support scripts in `backend/swagger.js`, `backend/swagger.config.js`, `backend/scripts/vite-no-net-use.cjs`, and `frontend/scripts/vite-no-net-use.cjs`.
- YAML - GitHub Actions workflows in `.github/workflows/ci.yml` and `.github/workflows/release-please.yml`.

## Runtime

**Environment:**
- Node.js 20 in CI via `.github/workflows/ci.yml`.
- Backend runtime is Node.js + Express from `backend/src/server.ts`.
- Frontend runtime is browser-based React served by Vite from `frontend/vite.config.ts` and `frontend/index.html`.

**Package Manager:**
- pnpm 9.0.0 in CI via Corepack in `.github/workflows/ci.yml`.
- Lockfiles: `backend/pnpm-lock.yaml` present; `frontend/pnpm-lock.yaml` present.
- No root `package.json` detected; install and run commands from `backend/` and `frontend/`.

## Frameworks

**Core:**
- Express `^4.21.2` - Backend HTTP API and middleware pipeline in `backend/src/server.ts` and `backend/src/routes.ts`.
- React `^19.2.0` - Frontend UI in `frontend/src/`.
- Vite `^7.3.1` with `@vitejs/plugin-react` `^5.1.1` - Frontend dev/build/test config in `frontend/vite.config.ts`.
- Prisma `^6.2.1` / `@prisma/client` `^6.2.1` - PostgreSQL ORM, schema, migrations, seed, and generated client in `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, and `backend/src/lib/prisma.ts`.
- Tailwind CSS `^4.1.18` - Frontend styling pipeline through `frontend/tailwind.config.js`, `frontend/postcss.config.js`, and `@tailwindcss/postcss`.

**Testing:**
- Vitest `^4.0.18` - Backend tests via `backend/vitest.config.mjs`; frontend unit/integration tests via `frontend/vitest.config.mjs`.
- Playwright `^1.58.2` - Frontend E2E smoke tests via `frontend/playwright.config.ts` and `frontend/tests/e2e/`.
- Supertest `^7.2.2` - Backend HTTP tests in `backend/tests/`.
- Testing Library React `^16.3.2`, jest-dom `^6.9.1`, user-event `^14.6.1`, jsdom `^28.1.0` - Frontend component tests.

**Build/Dev:**
- TypeScript `^5.7.3` in `backend/package.json` and `~5.9.3` in `frontend/package.json`.
- `ts-node-dev` `^2.0.0` - Backend development server script `backend/package.json` -> `pnpm dev`.
- Swagger tooling `swagger-jsdoc`, `swagger-ui-express`, `swagger-autogen` - API docs mounted in `backend/src/server.ts` and generated through `backend/swagger.js`.
- ESLint `^9.39.1` with TypeScript ESLint and React hooks plugins - Frontend linting via `frontend/eslint.config.js`.
- SonarCloud - CI quality analysis in `.github/workflows/ci.yml` and `sonar-project.properties`.
- Release Please - release automation in `.github/workflows/release-please.yml`, `release-please-config.json`, and `.release-please-manifest.json`.

## Key Dependencies

**Critical:**
- `@prisma/client` / `prisma` - Database access, migrations, tenant-aware client extension, and PostgreSQL RLS context in `backend/src/lib/prisma.ts`.
- `jsonwebtoken` - JWT session access tokens in `backend/src/services/AuthService.ts` and frontend token handling in `frontend/src/shared/lib/axios.ts`.
- `bcryptjs` - Password hashing in backend authentication services under `backend/src/services/`.
- `zod` - Request validation and typed schemas in `backend/src/controllers/OpenFinanceWebhookController.ts`, `backend/src/server.ts`, and frontend forms.
- `decimal.js` - Money arithmetic in backend financial ingestion and frontend finance UI; project invariant from `.codex/skills/wsp-finance-token-ops/SKILL.md` requires Decimal for money.
- `axios` - Frontend API client in `frontend/src/shared/lib/axios.ts`; backend uses `axios` in service integrations where needed.
- `@tanstack/react-query` - Frontend server-state management in `frontend/src/`.
- `zustand` - Frontend workspace/UI state stores such as `frontend/src/shared/stores/useWorkspaceStore.ts`.

**Infrastructure:**
- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` - Cloudflare R2/S3-compatible upload and download signing in `backend/src/providers/S3StorageProvider.ts`.
- `multer` - In-memory certificate upload filtering in `backend/src/routes.ts`.
- `express-rate-limit` - Upload URL rate limiting in `backend/src/routes.ts`.
- `node-cron` - Scheduled financial health and accountant cache refresh in `backend/src/services/CronService.ts`.
- `node-cache` - In-process cache dependency available to backend services.
- `node-telegram-bot-api` - Optional Telegram bot polling integration started in `backend/src/server.ts`.
- `nodemailer` - Ethereal test mail provider in `backend/src/providers/EtherealMailProvider.ts`.
- `ofx-js` - OFX import support through `backend/src/services/ImportService.ts`.
- `opossum` - Circuit breaker dependency for external-data resilience.
- `node-forge` - Certificate handling dependency used by certificate-related backend code.
- `browser-image-compression` - Frontend client-side image compression for uploads.
- `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge` - Frontend UI interaction, icons, and class composition.

## Configuration

**Environment:**
- Backend loads environment with `dotenv/config` in `backend/src/server.ts` and `backend/src/lib/prisma.ts`.
- Backend `.env` file present at `backend/.env` - contains environment configuration and was not read.
- Backend `.env.example` file present at `backend/.env.example` - environment template present and was not read because `.env.*` files are forbidden for content reads.
- Frontend `.env.example` file present at `frontend/.env.example` - environment template present and was not read because `.env.*` files are forbidden for content reads.
- Required backend variables are referenced in code: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`, `NODE_ENV`, `PRISMA_CONNECTION_LIMIT`, `APP_URL`, `OPEN_FINANCE_WEBHOOK_KEY`, `TELEGRAM_BOT_ENABLED`, `TELEGRAM_BOT_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DEV_URL`, `VAULT_MASTER_KEY`, and `E2E_STORAGE_PROVIDER`.
- Required frontend variable is `VITE_API_URL`, defaulting to `http://localhost:3333` in `frontend/src/config/env.ts`.

**Build:**
- Backend TypeScript config: `backend/tsconfig.json` targets ES2020, CommonJS modules, strict mode, `outDir` `backend/dist`, and includes `backend/src/**/*` plus `backend/prisma/seed.ts`.
- Frontend TypeScript configs: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, and `frontend/tsconfig.node.json`.
- Frontend Vite config: `frontend/vite.config.ts`.
- Backend Vitest config: `backend/vitest.config.mjs` and `backend/vitest.config.ts`.
- Frontend Vitest config: `frontend/vitest.config.mjs` and test settings also present in `frontend/vite.config.ts`.
- Frontend Playwright config: `frontend/playwright.config.ts`.
- Swagger config/generator: `backend/swagger.config.js`, `backend/swagger.js`, and generated docs import `backend/src/swagger-output.json` from `backend/src/server.ts`.
- CI config: `.github/workflows/ci.yml`.
- Release config: `.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`.

## Platform Requirements

**Development:**
- Use Node.js compatible with CI Node 20.
- Use pnpm from each package directory: `backend/` and `frontend/`.
- PostgreSQL is required for backend runtime and tests; CI uses `postgres:16-alpine` in `.github/workflows/ci.yml`.
- Run Prisma generation/migrations from `backend/`: `pnpm prisma:generate`, `pnpm prisma:validate`, and `pnpm prisma:migrate:status`.
- Backend development entry: `backend/package.json` script `dev` runs `src/server.ts` through `ts-node-dev`.
- Frontend development entry: `frontend/package.json` script `dev` runs Vite.
- Project-specific invariant from `.codex/skills/wsp-finance-token-ops/SKILL.md`: instantiate Prisma only through `backend/src/lib/prisma.ts`; use `Decimal(19,4)`/`decimal.js` for money; preserve workspace/RLS boundaries.

**Production:**
- Backend starts from compiled output with `backend/package.json` script `start`: `node dist/src/server.js`.
- Frontend builds static assets with `frontend/package.json` script `build`: `tsc -b && vite build`.
- Database target is PostgreSQL with Prisma migrations under `backend/prisma/migrations/`.
- File/object storage target is Cloudflare R2 using S3-compatible AWS SDK configuration in `backend/src/providers/S3StorageProvider.ts`, with local filesystem fallback for E2E/local mode via `backend/src/providers/LocalStorageProvider.ts`.
- Deployment platform is not detected in repository configuration; no Dockerfile, docker-compose, Vercel, Render, Fly.io, or cloud deployment config was detected in the scanned root.

---

*Stack analysis: 2026-05-31*
