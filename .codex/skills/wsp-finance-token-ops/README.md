# WSP Finance Token Ops

Project-local Codex skill for working inside `WSP-Finance` with strict token economy.

This skill is designed for the real shape of the repository:

- `backend/` is a Node.js + TypeScript + Express API with Prisma and PostgreSQL
- `frontend/` is a React 19 + Vite app with TanStack Query, Zustand, and Playwright
- The product is multi-tenant and accountant-centric, so `RLS`, `workspace` scope, and `dashboardCache` are not optional details

What the skill does:

- Routes the task to the smallest useful part of the monorepo
- Avoids expensive repo-wide reading by starting from route, service, or store anchors
- Preserves the main invariants of the project:
  - `decimal.js` for money
  - Prisma singleton from `backend/src/lib/prisma.ts`
  - `BankMovement -> Transaction` approval flow
  - accountant cache instead of live fan-out dashboard queries
- Pushes validation toward the smallest relevant test suite before broader commands

What it is optimized for:

- Auth and session restore
- Accountant Hub and approval inbox
- Workspace and tenant isolation
- Transactions, uploads, bridge, and financial ingestion
- Prisma/RLS work
- Fast debugging on dirty branches

How to use it well:

1. Mention the repo or the area you want to change.
2. Let the skill choose the smallest code slice first.
3. Only load the reference docs when the task crosses backend, frontend, and database boundaries.

Reference files:

- `references/project-map.md` gives the architectural and operational map.
- `references/command-matrix.md` gives targeted commands for discovery, tests, Prisma, and Playwright.

This skill is intentionally repo-specific. It should stay close to the current WSP Finance architecture instead of trying to be a generic full-stack guide.
