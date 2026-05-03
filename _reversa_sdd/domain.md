# Domain Model - WSP Finance

> Gerado pelo Reversa Detective. Base: código, schema Prisma, contratos, histórico Git e artefatos da Fase 2.

## Visão de Domínio

🟢 **CONFIRMADO**: WSP Finance é um sistema financeiro multi-tenant para separar contextos pessoais e empresariais, apoiar contadores em modelo B2B2C, importar movimentos bancários, aprovar lançamentos, auditar saldo e preservar isolamento por workspace.

🟡 **INFERIDO**: a direção estratégica atual prioriza o contador como persona operacional primária, com o cliente final usando menos entrada manual e mais ingestão passiva por OFX/Open Finance/OCR.

## Glossário

| Termo | Significado | Confiança |
|---|---|---|
| Workspace | Contexto financeiro isolado. Pode ser `PERSONAL` ou `BUSINESS`. | 🟢 |
| Membership | Relação usuário-workspace com role RBAC. | 🟢 |
| Cliente | Usuário final ou empresa auditada pelo contador. | 🟢 |
| Contador | Usuário `ACCOUNTANT`, persona B2B que opera múltiplos clientes. | 🟢 |
| Bridge | Transferência formal entre workspaces, normalmente PJ -> PF, com lançamentos espelhados. | 🟢 |
| BankMovement | Movimento importado em staging, ainda sem impacto em saldo. | 🟢 |
| Approval Inbox | Caixa de aprovação onde contador transforma BankMovement em Transaction. | 🟢 |
| Transaction | Lançamento financeiro real, com impacto opcional no saldo. | 🟢 |
| Closed Until | Data limite de período fiscal fechado. Bloqueia alterações retroativas. | 🟢 |
| A1 Vault | Área de storage seguro de certificado digital A1. | 🟢 |
| Accountant Dashboard Cache | Cache materializado de KPIs por contador e workspace. | 🟢 |
| Fuzzy Dedup | Deduplicação aproximada de movimentos por valor, data e descrição. | 🟢 |

## Regras de Negócio Principais

| Regra | Evidência | Confiança |
|---|---|---|
| Todo usuário registrado recebe workspace pessoal e membership `OWNER`. | `UserRepository.create` | 🟢 |
| Login exige e-mail verificado. | `AuthService.authenticate` | 🟢 |
| Access token é curto e refresh token é rotacionado. | `AuthService` | 🟢 |
| Rotas operacionais por workspace exigem `x-workspace-id` e membership. | `WorkspaceMiddleware` | 🟢 |
| `ACCOUNTANT` não pode acessar workspace `PERSONAL`. | `WorkspaceMiddleware`, `WorkspaceGuard` | 🟢 |
| Roles seguem hierarquia `VIEWER < EDITOR < ACCOUNTANT < OWNER`. | `RbacMiddleware` | 🟢 |
| RLS no PostgreSQL isola `Transaction`, `Account`, `Category` e `BankMovement`. | migrations RLS | 🟢 |
| Runtime deve falhar se usuário do banco for superuser ou bypass RLS. | `checkEnvironment.ts`, `server.ts` | 🟢 |
| `BankMovement` importado não altera saldo até aprovação. | `FinancialIngestionEngine`, `BankMovementService.approve` | 🟢 |
| Aprovar BankMovement cria Transaction, atualiza saldo e audita em transação serializável. | `BankMovementService.approve` | 🟢 |
| Transação paga atualiza saldo; exclusão de transação paga reverte saldo. | `TransactionService` | 🟢 |
| Período fiscal fechado bloqueia alteração em data igual/anterior a `closedUntil`. | `TransactionService`, `BankMovementService`, `BridgeService` | 🟢 |
| Contador pode bypassar fechamento apenas em workspace `BUSINESS`. | services financeiros | 🟢 |
| Bridge exige permissão em origem e destino, saldo suficiente e categorias válidas nos dois lados. | `BridgeService` | 🟢 |
| Certificado A1 deve ser `.p12`/`.pfx`, validado em memória e armazenado com SSE-C. | `routes.ts`, `WorkspaceService`, `S3StorageProvider` | 🟢 |
| Upload transacional tem limite de 10 MB por arquivo e quota de 1 GB por workspace. | `UploadController`, `UploadService` | 🟢 |
| Cache do contador é atualizado em lotes de 5 e cron a cada 30 minutos. | `AccountantCacheService`, `CronService` | 🟢 |
| CNPJ/CEP usam cache de 24h e fallback BrasilAPI -> ReceitaWS/ViaCEP. | `ExternalDataService` | 🟢 |

## Regras Implícitas e Decisões de Produto

| Regra/Intenção | Evidência | Confiança |
|---|---|---|
| O produto migrou de finanças pessoais para BPO financeiro centrado no contador. | `PRODUCT_SCOPE_MASTER.md`, módulos `accountant`, commits #15/#16 | 🟡 |
| Supabase Free/baixo custo influencia desenho de conexão, cache e índices. | ADR existente, CI, `connection_limit`, benchmark pg_trgm | 🟢 |
| Open Finance/OCR são fontes planejadas; OFX/Open Finance estão implementados, OCR ainda é enum/escopo. | `MovementSource.OCR`, escopo produto, ausência de controller OCR | 🟢/🔴 |
| O saldo contábil é tratado como dado auditável, não apenas visual. | `AuditLog` com `balanceBefore/After/delta`, ADR estabilização | 🟢 |
| Frontend emula capabilities, mas autoridade final deve ser backend. | `useCapabilities`, RBAC middleware | 🟢 |

## Lacunas de Domínio

- 🔴 **LACUNA**: módulos citados no escopo mestre como IA fiscal, NFS-e, WhatsApp/OCR, exportação ERP e billing ainda não aparecem como implementação completa na Fase 2.
- 🔴 **LACUNA**: `Transaction.status` tem `PENDING`, `COMPLETED`, `RECONCILED`, mas os fluxos analisados criam principalmente `COMPLETED`; reconciliação completa não foi encontrada como máquina implementada.
- 🔴 **LACUNA**: `Notification` existe e `CronService` cria alertas, mas a Fase 2 não encontrou uma experiência completa de leitura/acknowledge no frontend.
- 🔴 **LACUNA**: rotas externas de CEP/CNPJ não exigem autenticação no código atual.
