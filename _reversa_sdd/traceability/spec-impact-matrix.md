# Spec Impact Matrix

| Mudança/Requisito | Backend | Frontend | Banco | Storage | Testes/CI | Observações |
|---|---|---|---|---|---|---|
| Novo campo em `Transaction` | `TransactionController/Service/Repository` | types/hooks/modal/history | Prisma model + migration | N/A | backend service tests + frontend tests | Impacta saldo/auditoria se monetário. |
| Nova role RBAC | `RbacMiddleware`, `WorkspaceMiddleware`, services | `useCapabilities`, guards, layout | enum `WorkspaceRole` + migrations | N/A | auth/RLS/guards | Revisar matriz de permissões. |
| Alterar regra `closedUntil` | Transaction, BankMovement, Bridge services | `fiscalLock`, LockIcon, UI actions | `Workspace.closedUntil` | N/A | service tests + UI tests | Alto risco contábil. |
| Novo provider Open Finance | webhook/service/ingestion engine | inbox talvez sem mudança | BankMovement source/hash | N/A | ingestion/fuzzy tests | Preservar staging sem impacto em saldo. |
| OCR/WhatsApp receipts | novo ingest endpoint/service | documentos/inbox/anexos | `MovementSource.OCR`, attachment fields | R2/S3 | e2e + ingestion | Escopo citado, não implementado completo. |
| Certificado A1 | WorkspaceService, CertificateService, S3 provider | upload section, badges, accountant hub | `Workspace.certificate*` | vault SSE-C | certificate/upload tests | Material sensível. |
| Cache contador | AccountantCacheService/Cron/AuthService | AuthProvider, Hub | `AccountantDashboardCache` | N/A | cache integration + e2e login | Dados podem ficar defasados. |
| External CNPJ/CEP | ExternalDataService/controllers | CreateWorkspaceForm/useExternalData | workspace fiscal/address fields | N/A | contract tests recomendados | Há divergência do contrato CEP. |
| RLS/policies | Prisma client, middleware, migrations | headers por URL | RLS policies/indexes | N/A | integration RLS | Alteração crítica de segurança. |
| Upload/anexos | UploadService/provider | uploadCloudflare, AttachmentPreview | `attachmentUrl/attachmentSize` | R2/S3 | upload/e2e attachment | Quota e headers SSE-C. |
| Bridge | BridgeController/Service/AuditLog | useCreateBridge/UX | Transactions + AuditLog | N/A | balance-audit tests | Deve permanecer atômico. |
| CI/release | package scripts | package scripts | migrate/seed in CI | N/A | workflows | Não confundir CI com deploy real. |
