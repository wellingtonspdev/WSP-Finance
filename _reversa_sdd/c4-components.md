# C4 Components - Backend and Frontend

## Backend API

```mermaid
flowchart TB
  routes["routes.ts"] --> auth["Auth/Verification/Password Controllers"]
  routes --> workspace["Workspace/Invite Controllers"]
  routes --> finance["Account/Category/Transaction/Dashboard/Bridge Controllers"]
  routes --> upload["Upload Controller"]
  routes --> ingest["Import/OpenFinance/BankMovement Controllers"]
  routes --> external["ExternalData Controller"]

  auth --> authSvc["Auth Services + UserRepository"]
  workspace --> wsSvc["Workspace/Invite/Certificate Services"]
  finance --> finSvc["Finance Services + Repositories"]
  upload --> uploadSvc["UploadService + StorageProvider"]
  ingest --> ingestSvc["FinancialIngestionEngine + BankMovementService + FuzzyDedup"]
  external --> extSvc["ExternalDataService + API Clients"]

  finSvc --> prisma["Prisma extended client"]
  wsSvc --> prisma
  authSvc --> prisma
  ingestSvc --> prisma
  uploadSvc --> storage["R2/S3"]
  extSvc --> providers["BrasilAPI/ViaCEP/ReceitaWS"]
  prisma --> db["PostgreSQL RLS"]
```

## Frontend SPA

```mermaid
flowchart TB
  main["main.tsx Providers"] --> app["App.tsx Routes"]
  app --> authPages["Auth Pages"]
  app --> workspaceRoutes["Workspace Routes"]
  app --> accountantRoutes["Accountant Routes"]
  app --> guard["PrivateRoute + WorkspaceGuard"]
  guard --> layout["AppLayout"]
  layout --> clientNav["Client Sidebar/Header/BottomNav"]
  layout --> accountantNav["Accountant Sidebar/Header/BottomNav"]
  authProvider["AuthProvider"] --> axios["Axios interceptors"]
  workspaceStore["Zustand WorkspaceStore"] --> axios
  query["TanStack Query"] --> hooks["Feature hooks"]
  hooks --> axios
```

## Observações

- 🟢 Controllers concentram validação Zod e HTTP.
- 🟢 Services concentram regras de negócio.
- 🟢 Repositories concentram Prisma.
- 🟡 Há uso de `sysPrisma` para operações globais/contador que precisam atravessar tenants com `set_config` manual.
