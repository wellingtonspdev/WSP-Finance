# Dicionário de Dados - WSP-Finance

Gerado pelo Reversa Archaeologist em 2026-05-02.

Escala de confiança:

- 🟢 **CONFIRMADO** - extraído diretamente do código.
- 🟡 **INFERIDO** - baseado em padrão observado no código, pode exigir validação.
- 🔴 **LACUNA** - requer validação humana.

## Módulo `auth`

### Entidade `User`

Fonte: `backend/prisma/schema.prisma`

| Campo | Tipo | Obrigatório | Default/Restrição | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | `@id @default(autoincrement())` | 🟢 |
| `email` | `String` | Sim | `@unique` | 🟢 |
| `name` | `String` | Sim | - | 🟢 |
| `passwordHash` | `String` | Sim | Hash bcrypt gerado com cost 8 no serviço | 🟢 |
| `emailVerifiedAt` | `DateTime?` | Não | `null` até verificação | 🟢 |
| `type` | `UserType` | Sim | `CLIENT` | 🟢 |
| `cpf` | `String?` | Não | `@unique` | 🟢 |
| `phone` | `String?` | Não | - | 🟢 |
| `zipCode` | `String?` | Não | - | 🟢 |
| `street` | `String?` | Não | - | 🟢 |
| `number` | `String?` | Não | - | 🟢 |
| `complement` | `String?` | Não | - | 🟢 |
| `neighborhood` | `String?` | Não | - | 🟢 |
| `city` | `String?` | Não | - | 🟢 |
| `state` | `String?` | Não | - | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |
| `updatedAt` | `DateTime` | Sim | `@updatedAt` | 🟢 |

Relacionamentos confirmados:

- `memberships: WorkspaceMember[]`
- `refreshTokens: RefreshToken[]`
- `resetTokens: PasswordResetToken[]`
- `verifyTokens: AccountVerificationToken[]`
- `auditLogs: AuditLog[]`
- `notifications: Notification[]`
- `invitesSent: WorkspaceInvite[]`
- `dashboardCaches: AccountantDashboardCache[]`

### Enum `UserType`

| Valor | Uso | Confiança |
|---|---|---|
| `CLIENT` | Usuário cliente/empreendedor; default no backend e frontend | 🟢 |
| `ACCOUNTANT` | Usuário contador; habilita carga de `dashboardCache` no login/me | 🟢 |

### Entidade `WorkspaceMember`

Fonte: `backend/prisma/schema.prisma`

| Campo | Tipo | Obrigatório | Default/Restrição | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | `@id @default(autoincrement())` | 🟢 |
| `userId` | `Int` | Sim | FK `User`, cascade delete | 🟢 |
| `workspaceId` | `Int` | Sim | FK `Workspace`, cascade delete | 🟢 |
| `role` | `WorkspaceRole` | Sim | `VIEWER` | 🟢 |
| `joinedAt` | `DateTime` | Sim | `now()` | 🟢 |

Índices/restrições:

- `@@unique([userId, workspaceId])`
- `@@index([userId])`
- `@@index([workspaceId])`

### Entidade `RefreshToken`

Fonte: `backend/prisma/schema.prisma`, `UserRepository`, `AuthService`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID default; enviado ao frontend como refresh token | 🟢 |
| `userId` | `Int` | Sim | FK para `User`, cascade delete | 🟢 |
| `expiresIn` | `Int` | Sim | Epoch seconds; gerado com `now + 30 dias` | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |

### Entidade `PasswordResetToken`

Fonte: `backend/prisma/schema.prisma`, `PasswordResetService`, `UserRepository`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID default | 🟢 |
| `code` | `String` | Sim | Código numérico de 6 dígitos | 🟢 |
| `userId` | `Int` | Sim | FK para `User`, cascade delete | 🟢 |
| `expiresAt` | `DateTime` | Sim | `now + 15 minutos` | 🟢 |
| `used` | `Boolean` | Sim | Default `false`; vira `true` após reset | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |

### Entidade `AccountVerificationToken`

Fonte: `backend/prisma/schema.prisma`, `VerificationService`, `UserRepository`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID default | 🟢 |
| `code` | `String` | Sim | Código numérico de 6 dígitos | 🟢 |
| `userId` | `Int` | Sim | FK para `User`, cascade delete | 🟢 |
| `expiresAt` | `DateTime` | Sim | `now + 24 horas` | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |

### DTO `RegisterDTO`

Fontes: `AuthController.register`, `frontend/src/features/auth/types/index.ts`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `name` | `string` | Sim | mínimo 3 caracteres | 🟢 |
| `email` | `string` | Sim | formato de e-mail | 🟢 |
| `password` | `string` | Sim | mínimo 6 caracteres | 🟢 |
| `confirmPassword` | `string` | Sim no frontend | deve ser igual a `password`; não enviado como regra backend | 🟢 |
| `type` | `CLIENT` ou `ACCOUNTANT` | Sim no frontend, default no backend | default backend `CLIENT` | 🟢 |

### DTO `LoginDTO`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `email` | `string` | Sim | formato de e-mail | 🟢 |
| `password` | `string` | Sim | frontend exige não vazio | 🟢 |

### DTO `VerifyDTO`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `email` | `string` | Sim | formato de e-mail | 🟢 |
| `code` | `string` | Sim | exatamente 6 caracteres | 🟢 |

### DTO `ResetPasswordDTO`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `email` | `string` | Sim no payload enviado pelo hook | vem de `location.state` | 🟢 |
| `code` | `string` | Sim | exatamente 6 caracteres | 🟢 |
| `newPassword` | `string` | Sim | mínimo 6 caracteres | 🟢 |
| `confirmNewPassword` | `string` | Sim no frontend | deve ser igual a `newPassword`; não enviado ao backend | 🟢 |

### Payload `AuthUser`

Fonte: `frontend/src/features/auth/types/index.ts`, `AuthService.authenticate`, `AuthService.getMe`

| Campo | Tipo | Obrigatório | Confiança |
|---|---|---:|---|
| `id` | `number` | Sim | 🟢 |
| `name` | `string` | Sim | 🟢 |
| `email` | `string` | Sim | 🟢 |
| `type` | `CLIENT` ou `ACCOUNTANT` | Sim | 🟢 |
| `memberships` | `AuthMembership[]` | Sim | 🟢 |

### Payload `AuthMembership`

| Campo | Tipo | Obrigatório | Observação | Confiança |
|---|---|---:|---|---|
| `id` | `number` | Sim | ID do workspace | 🟢 |
| `name` | `string` | Sim | Nome do workspace | 🟢 |
| `type` | `PERSONAL` ou `BUSINESS` | Sim | Tipo do workspace | 🟢 |
| `role` | `OWNER`, `EDITOR`, `VIEWER`, `ACCOUNTANT` | Sim | Role do vínculo | 🟢 |
| `closedUntil` | `string \| null` | Sim | Prisma retorna Date/null; frontend tipa string/null | 🟡 |
| `certificateExpiresAt` | `Date \| null` no backend map | Sim no retorno de serviço | Campo não aparece em `AuthMembership` frontend nesta etapa | 🔴 |

### Payload `AuthResponse`

| Campo | Tipo | Obrigatório | Observação | Confiança |
|---|---|---:|---|---|
| `user` | `AuthUser` | Sim | Dados de sessão | 🟢 |
| `token` | `string` | Sim | JWT access token | 🟢 |
| `refreshToken` | `string` | Sim | UUID persistido em `RefreshToken.id` | 🟢 |
| `dashboardCache` | `DashboardCacheEntry[]` | Não | Só para `ACCOUNTANT` quando carregado | 🟢 |

## Módulo `workspaces`

### Entidade `Workspace`

Fonte: `backend/prisma/schema.prisma`

| Campo | Tipo | Obrigatório | Default/Restrição | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | `@id @default(autoincrement())` | 🟢 |
| `name` | `String` | Sim | - | 🟢 |
| `type` | `WorkspaceType` | Sim | `PERSONAL` | 🟢 |
| `taxRate` | `Decimal(5,2)` | Sim | `0`; pode ser inferido por CNAE | 🟢 |
| `document` | `String?` | Não | Documento fiscal | 🟢 |
| `documentType` | `DocumentType?` | Não | `CPF`, `CNPJ`, `PASSPORT` | 🟢 |
| `cnae` | `String?` | Não | Usado para inferência de `taxRate` | 🟢 |
| `zipCode` | `String?` | Não | Endereço comercial | 🟢 |
| `street` | `String?` | Não | Endereço comercial | 🟢 |
| `number` | `String?` | Não | Endereço comercial | 🟢 |
| `complement` | `String?` | Não | Endereço comercial | 🟢 |
| `neighborhood` | `String?` | Não | Endereço comercial | 🟢 |
| `city` | `String?` | Não | Endereço comercial | 🟢 |
| `state` | `String?` | Não | Endereço comercial | 🟢 |
| `closedUntil` | `DateTime?` | Não | Fechamento fiscal | 🟢 |
| `certificateObjectKey` | `String?` | Não | Object key do certificado A1 no vault | 🟢 |
| `certificateExpiresAt` | `DateTime?` | Não | Validade extraída do certificado | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |
| `updatedAt` | `DateTime` | Sim | `@updatedAt` | 🟢 |

Relacionamentos confirmados:

- `members: WorkspaceMember[]`
- `accounts: Account[]`
- `categories: Category[]`
- `transactions: Transaction[]`
- `invites: WorkspaceInvite[]`
- `bankMovements: BankMovement[]`
- `dashboardCaches: AccountantDashboardCache[]`

### Enum `WorkspaceType`

| Valor | Uso | Confiança |
|---|---|---|
| `PERSONAL` | Workspace pessoal/CPF; default | 🟢 |
| `BUSINESS` | Workspace empresarial/CNPJ | 🟢 |

### Enum `DocumentType`

| Valor | Uso | Confiança |
|---|---|---|
| `CPF` | Documento pessoa física | 🟢 |
| `CNPJ` | Documento pessoa jurídica | 🟢 |
| `PASSPORT` | Presente no schema, não observado nos forms de workspace | 🟢 |

### Entidade `WorkspaceMember`

| Campo | Tipo | Obrigatório | Default/Restrição | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | `@id @default(autoincrement())` | 🟢 |
| `userId` | `Int` | Sim | FK `User`, cascade delete | 🟢 |
| `workspaceId` | `Int` | Sim | FK `Workspace`, cascade delete | 🟢 |
| `role` | `WorkspaceRole` | Sim | `VIEWER` | 🟢 |
| `joinedAt` | `DateTime` | Sim | `now()` | 🟢 |

Restrições:

- `@@unique([userId, workspaceId])`
- `@@index([userId])`
- `@@index([workspaceId])`

### Enum `WorkspaceRole`

| Valor | Nível no RBAC | Observação | Confiança |
|---|---:|---|---|
| `VIEWER` | 1 | Leitura | 🟢 |
| `EDITOR` | 2 | Edição operacional | 🟢 |
| `ACCOUNTANT` | 2.5 | Contador B2B2C; bloqueado em workspace pessoal pelo middleware | 🟢 |
| `OWNER` | 3 | Controle total | 🟢 |

### Entidade `WorkspaceInvite`

| Campo | Tipo | Obrigatório | Default/Restrição | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID default | 🟢 |
| `email` | `String` | Sim | E-mail convidado | 🟢 |
| `role` | `WorkspaceRole` | Sim | `ACCOUNTANT` | 🟢 |
| `token` | `String` | Sim | `@unique`; gerado com 32 bytes aleatórios em hex | 🟢 |
| `status` | `InviteStatus` | Sim | `PENDING` | 🟢 |
| `workspaceId` | `Int` | Sim | FK `Workspace`, cascade delete | 🟢 |
| `inviterId` | `Int` | Sim | FK `User` | 🟢 |
| `expiresAt` | `DateTime` | Sim | `now + 7 dias` na criação | 🟢 |
| `createdAt` | `DateTime` | Sim | `now()` | 🟢 |
| `updatedAt` | `DateTime` | Sim | `@updatedAt` | 🟢 |

Índices:

- `@@index([token])`
- `@@index([workspaceId])`
- `@@index([email])`

### Enum `InviteStatus`

| Valor | Regra observada | Confiança |
|---|---|---|
| `PENDING` | Estado inicial | 🟢 |
| `ACCEPTED` | Definido no aceite transacional | 🟢 |
| `EXPIRED` | Definido quando convite vencido é usado | 🟢 |
| `REVOKED` | Definido por revogação de OWNER | 🟢 |
| `REJECTED` | Definido pelo destinatário | 🟢 |

### DTO `CreateWorkspaceDTO`

Fontes: `WorkspaceController.create`, `frontend/src/features/workspaces/types/index.ts`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `name` | `string` | Sim | mínimo 1 caractere | 🟢 |
| `type` | `PERSONAL` ou `BUSINESS` | Não no backend | default backend `PERSONAL`; default form `BUSINESS` | 🟢 |
| `fiscalIdentity.documentType` | `CPF`/`CNPJ` backend; `CPF`/`CNPJ` frontend | Opcional | `PASSPORT` existe no backend, mas não no form | 🟢 |
| `fiscalIdentity.document` | `string` | Opcional | frontend exige mínimo 11 quando presente | 🟢 |
| `fiscalIdentity.cnae` | `string \| null` | Não | usado para inferir alíquota | 🟢 |
| `address.*` | `string` | Não | campos opcionais de endereço | 🟢 |

### Payload `CertificateUploadResponse`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `workspaceId` | `number` | Sim | Workspace atualizado | 🟢 |
| `certificateExpiresAt` | `Date` backend / `string` frontend | Sim | Data `notAfter` do certificado | 🟢 |
| `expiresInDays` | `number` | Sim | `ceil((notAfter-now)/1 dia)` | 🟢 |
| `alertLevel` | `ok`/`warning`/`expired` | Sim | `expired` se <0; `warning` se <=30; senão `ok` | 🟢 |

### DTO `Invite`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `email` | `string` | Sim | e-mail válido | 🟢 |
| `role` | `ACCOUNTANT`/`EDITOR`/`VIEWER` | Não | default `ACCOUNTANT`; não permite convidar OWNER pelo controller | 🟢 |

### Payload `WorkspaceMember` no frontend

| Campo | Tipo | Obrigatório | Confiança |
|---|---|---:|---|
| `userId` | `number` | Sim | 🟢 |
| `workspaceId` | `number` | Sim | 🟢 |
| `role` | `OWNER`/`EDITOR`/`VIEWER`/`ACCOUNTANT` | Sim | 🟢 |
| `user.id` | `number` | Sim | 🟢 |
| `user.name` | `string` | Sim | 🟢 |
| `user.email` | `string` | Sim | 🟢 |
| `user.type` | `string` | Sim | 🟢 |

## Módulo `rbac-rls`

### `Express.Request` estendido

Fonte: `backend/src/@types/express.d.ts`

| Campo | Tipo | Obrigatório | Origem | Confiança |
|---|---|---:|---|---|
| `user.id` | `number` | Sim em rotas autenticadas | `AuthMiddleware` a partir do JWT `sub` | 🟢 |
| `workspaceId` | `number` | Não globalmente; sim após `WorkspaceMiddleware` | Header `x-workspace-id` validado | 🟢 |

### `TenantContext`

Fonte: `backend/src/lib/tenantContext.ts`

| Campo | Tipo | Obrigatório | Uso | Confiança |
|---|---|---:|---|---|
| `currentWorkspaceId` | `number` | Não | Valor usado para `app.current_workspace_id` | 🟢 |
| `userRole` | `string` | Não | Role do membership atual | 🟢 |
| `workspaceType` | `string` | Não | Tipo do workspace atual | 🟢 |
| `bypassRls` | `boolean` | Não | Permite pular injeção RLS no client estendido | 🟢 |
| `inTransaction` | `boolean` | Não | Evita reinjeção no hook global durante transação interativa | 🟢 |

### Header `x-workspace-id`

| Propriedade | Valor | Confiança |
|---|---|---|
| Nome | `x-workspace-id` | 🟢 |
| Tipo esperado | string numérica ou primeiro item de array de strings | 🟢 |
| Erro quando ausente | `400 Workspace ID header (x-workspace-id) is required` | 🟢 |
| Erro quando inválido | `400 Workspace ID must be a number` | 🟢 |

### Role hierarchy

Fonte: `backend/src/middlewares/RbacMiddleware.ts`

| Role | Nível | Observação | Confiança |
|---|---:|---|---|
| `VIEWER` | 1 | menor nível | 🟢 |
| `EDITOR` | 2 | escrita operacional | 🟢 |
| `ACCOUNTANT` | 2.5 | acima de editor, abaixo de owner | 🟢 |
| `OWNER` | 3 | maior nível | 🟢 |

### Tabelas protegidas por RLS

Fontes: migrations `20260310203000_enable_rls_multi_tenant` e `20260413052239_optimize_rls_and_statistics`

| Tabela | Policy | Regra `USING` | Regra `WITH CHECK` | Confiança |
|---|---|---|---|---|
| `Transaction` | `tenant_isolation_policy` | `workspaceId = current_setting(...)` | mesmo workspace | 🟢 |
| `Account` | `tenant_isolation_policy` | `workspaceId = current_setting(...)` | mesmo workspace | 🟢 |
| `Category` | `tenant_isolation_policy_categories` | `workspaceId IS NULL OR workspaceId = current_setting(...)` | mesmo workspace | 🟢 |
| `BankMovement` | `tenant_isolation_policy` | `workspaceId = current_setting(...)` | mesmo workspace | 🟢 |

### Variáveis de ambiente relacionadas

Fonte: `backend/.env.example`, `backend/src/lib/prisma.ts`, `backend/src/lib/checkEnvironment.ts`

| Variável | Uso | Obrigatória pelo código? | Confiança |
|---|---|---:|---|
| `DATABASE_URL` | Prisma runtime URL; recebe `connection_limit` se ausente | Sim na prática para Prisma conectar | 🟢 |
| `DIRECT_URL` | Cliente de management/testes/migrations | Usada nos testes e Prisma workflows | 🟢 |
| `PRISMA_CONNECTION_LIMIT` | Limite aplicado à URL runtime; default `5` | Não, tem default | 🟢 |
| `JWT_SECRET` | Verificação JWT | Não, há fallback hardcoded | 🟢 |

### Role de teste restrita

Fonte: `backend/src/test/test-role-config.ts`, `backend/src/test/setup-test-role.ts`

| Campo | Valor | Confiança |
|---|---|---|
| Role | `wsp_test_user` | 🟢 |
| Senha | `wsp_test_password` | 🟢 |
| Atributos exigidos | `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOINHERIT` | 🟢 |
| Grants | connect, usage schema, select/insert/update/delete tables, usage/select sequences | 🟢 |

## Módulo `finance-core`

### Entidade `Account`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | autoincrement | 🟢 |
| `name` | `String` | Sim | - | 🟢 |
| `type` | `AccountType` | Sim | default `CHECKING` | 🟢 |
| `balance` | `Decimal(19,4)` | Sim | default `0` | 🟢 |
| `isIncludedInTotal` | `Boolean` | Sim | default `true` | 🟢 |
| `workspaceId` | `Int` | Sim | FK workspace | 🟢 |
| `createdAt`/`updatedAt` | `DateTime` | Sim | automáticos | 🟢 |

### Entidade `Category`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `Int` | Sim | autoincrement | 🟢 |
| `name` | `String` | Sim | - | 🟢 |
| `icon` | `String?` | Não | - | 🟢 |
| `color` | `String?` | Não | - | 🟢 |
| `workspaceId` | `Int?` | Não | `null` indica categoria global | 🟢 |

### Entidade `Transaction`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID | 🟢 |
| `description` | `String` | Sim | mínimo 1 no backend; mínimo 3 no frontend | 🟢 |
| `amount` | `Decimal(19,4)` | Sim | valor final calculado | 🟢 |
| `date` | `DateTime` | Sim | coerce date no controller | 🟢 |
| `type` | `INCOME`/`EXPENSE` | Sim | - | 🟢 |
| `status` | `TransactionStatus` | Sim | default `COMPLETED` | 🟢 |
| `grossAmount` | `Decimal?` | Não | marketplace | 🟢 |
| `marketplaceFee` | `Decimal?` | Não | marketplace | 🟢 |
| `shippingCost` | `Decimal?` | Não | marketplace | 🟢 |
| `productCost` | `Decimal?` | Não | marketplace | 🟢 |
| `taxAmount` | `Decimal?` | Não | calculado | 🟢 |
| `netValue` | `Decimal?` | Não | calculado | 🟢 |
| `feeAmount` | `Decimal?` | Não | calculado/fee | 🟢 |
| `platformFeeRate` | `Decimal(5,2)?` | Não | percentual | 🟢 |
| `isPaid` | `Boolean` | Sim | default `true` | 🟢 |
| `isFixed` | `Boolean` | Sim | default `false` | 🟢 |
| `isTaxDeductible` | `Boolean` | Sim | default `false` | 🟢 |
| `attachmentUrl` | `String?` | Não | anexo R2/local | 🟢 |
| `attachmentSize` | `Int?` | Não | default `0` | 🟢 |
| `fitid` | `String?` | Não | deduplicação/bridge | 🟢 |
| `hashDeduplication` | `String?` | Não | deduplicação | 🟢 |
| `accountId`/`categoryId`/`workspaceId` | `Int` | Sim | FKs | 🟢 |
| `deletedAt` | `DateTime?` | Não | campo existe, delete atual é físico | 🟢 |

### Entidade `AuditLog`

| Campo | Tipo | Obrigatório | Regra | Confiança |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID/randomUUID na inserção raw | 🟢 |
| `userId` | `Int` | Sim | FK user | 🟢 |
| `workspaceId` | `Int?` | Não | escopo do evento | 🟢 |
| `action` | `AuditAction` | Sim | `CREATE`, `DELETE`, `BRIDGE_TRANSFER`, etc. | 🟢 |
| `entity` | `String` | Sim | entidade auditada | 🟢 |
| `entityId` | `String` | Sim | id lógico | 🟢 |
| `oldState`/`newState` | `Json?` | Não | serializado pelo service | 🟢 |
| `balanceBefore`/`balanceAfter`/`delta` | `Decimal(19,4)?` | Não | auditoria de saldo | 🟢 |
| `fromAccount`/`toAccount` | `Int?` | Não | FKs opcionais para conta | 🟢 |
## Modulos `uploads-storage`, `imports-open-finance`, `bank-movements`, `accountant`, `external-data`, `frontend-shell`

### Entidade `BankMovement`

Fonte: `backend/prisma/schema.prisma`, `backend/src/services/FinancialIngestionEngine.ts`, `backend/src/services/BankMovementService.ts`

| Campo | Tipo | Obrigatorio | Regra | Confianca |
|---|---|---:|---|---|
| `id` | `String` | Sim | UUID | 🟢 |
| `workspaceId` | `Int` | Sim | FK workspace e chave de isolamento RLS | 🟢 |
| `accountId` | `Int` | Sim | FK conta bancaria | 🟢 |
| `amount` | `Decimal(19,4)` | Sim | valor bruto do movimento importado | 🟢 |
| `date` | `DateTime` | Sim | normalizado para UTC pela engine | 🟢 |
| `description` | `String` | Sim | vem de MEMO/description ou fallback | 🟢 |
| `source` | `MovementSource` | Sim | `OFX`, `OPEN_FINANCE`, `OCR`, `MANUAL` | 🟢 |
| `status` | `MovementStatus` | Sim | default `PENDING`; pode virar `APPROVED`, `REJECTED`, `MERGED` | 🟢 |
| `fitid` | `String?` | Nao | ID transacional do banco quando fornecido | 🟢 |
| `hashDeduplication` | `String?` | Nao | SHA-256 de data UTC + valor + descricao | 🟢 |
| `rawPayload` | `Json` | Sim | payload original persistido para auditoria/consulta | 🟢 |
| `createdAt` | `DateTime` | Sim | default `now()` | 🟢 |

### Enums de movimentos bancarios

| Enum | Valores | Confianca |
|---|---|---|
| `MovementSource` | `OFX`, `OPEN_FINANCE`, `OCR`, `MANUAL` | 🟢 |
| `MovementStatus` | `PENDING`, `APPROVED`, `REJECTED`, `MERGED` | 🟢 |

### Entidade `AccountantDashboardCache`

Fonte: `backend/prisma/schema.prisma`, `backend/src/services/AccountantCacheService.ts`

| Campo | Tipo | Obrigatorio | Regra | Confianca |
|---|---|---:|---|---|
| `id` | `Int` | Sim | autoincrement | 🟢 |
| `userId` | `Int` | Sim | contador dono do cache | 🟢 |
| `workspaceId` | `Int` | Sim | cliente/workspace agregado | 🟢 |
| `pendingMovements` | `Int` | Sim | count de `BankMovement.PENDING` | 🟢 |
| `missingAttachments` | `Int` | Sim | count de transacoes sem anexo | 🟢 |
| `cashRiskAlert` | `Boolean` | Sim | `true` quando saldo total agregado e negativo | 🟢 |
| `totalBalance` | `Decimal(19,4)` | Sim | soma de contas incluidas no total | 🟢 |
| `certificateExpiresAt` | `DateTime?` | Nao | vencimento do certificado A1 do workspace | 🟢 |
| `updatedAt` | `DateTime` | Sim | atualizado no upsert | 🟢 |

### Contrato `PresignedResponse`

Fonte: `backend/src/providers/IStorageProvider.ts`, `frontend/src/services/uploadCloudflare.ts`

| Campo | Tipo | Obrigatorio | Regra | Confianca |
|---|---|---:|---|---|
| `uploadUrl` | `string` | Sim | destino PUT direto para storage | 🟢 |
| `publicUrl` | `string` | Sim | object key salva no banco | 🟢 |
| `headers` | `Record<string,string>?` | Nao | inclui `Content-Type` e SSE-C quando necessario | 🟢 |

### Contrato `SignedAttachmentResponse`

Fonte: `backend/src/services/UploadService.ts`, `frontend/src/features/transactions/hooks/useAttachment.ts`

| Campo | Tipo | Obrigatorio | Regra | Confianca |
|---|---|---:|---|---|
| `downloadUrl` | `string` | Sim | URL temporaria de 5 minutos | 🟢 |
| `headers` | `Record<string,string>?` | Nao | necessario para objetos SSE-C/vault | 🟢 |

### Contrato Open Finance webhook

Fonte: `backend/src/controllers/OpenFinanceWebhookController.ts`

| Campo | Tipo | Obrigatorio | Regra | Confianca |
|---|---|---:|---|---|
| `source` | `'OPEN_FINANCE'?` | Nao | default `OPEN_FINANCE` | 🟢 |
| `workspaceId` | `number` | Sim | inteiro positivo | 🟢 |
| `accountId` | `number` | Sim | inteiro positivo | 🟢 |
| `movements` | `OpenFinanceWebhookMovement[]` | Sim | lista minima de 1 item | 🟢 |
| `movements[].transactionId` | `string?` | Nao | usado como `fitid` fallback | 🟢 |
| `movements[].date` | `string` | Sim | data parseada pela engine | 🟢 |
| `movements[].description` | `string` | Sim | descricao do movimento | 🟢 |
| `movements[].amount` | `string | number` | Sim | transformado para string e depois Decimal | 🟢 |

### Contratos externos CNPJ/CEP

Fonte: `backend/src/infra/external/ExternalDataService.ts`

| Contrato | Campo | Tipo | Regra | Confianca |
|---|---|---|---|---|
| `CnpjResult` | `document` | `string` | CNPJ limpo | 🟢 |
| `CnpjResult` | `name` | `string` | razao social/nome | 🟢 |
| `CnpjResult` | `tradeName` | `string` | nome fantasia/fantasia | 🟢 |
| `CnpjResult` | `cnae` | `string` | CNAE fiscal/atividade principal | 🟢 |
| `CnpjResult` | `address` | `Address` | endereco normalizado | 🟢 |
| `CepResult` | `address` | `Address` | endereco normalizado | 🟢 |
| `ExternalMetadata` | `provider` | `cache | brasilapi | viacep | receitaws` | origem dos dados | 🟢 |
| `ExternalMetadata` | `cached` | `boolean` | indica cache local | 🟢 |

### Estado frontend de shell

Fonte: `frontend/src/shared/stores/useWorkspaceStore.ts`, `frontend/src/app/AuthProvider.tsx`, `frontend/src/shared/lib/axios.ts`

| Item | Tipo | Persistencia | Regra | Confianca |
|---|---|---|---|---|
| `accessToken` | `string | null` | memoria do modulo Axios | injetado em `Authorization` | 🟢 |
| `wsp_refresh_token` | `string` | localStorage | usado para refresh/restauracao | 🟢 |
| `wsp_user_info` | `AuthUser` serializado | localStorage | snapshot do usuario | 🟢 |
| `wsp_dashboard_cache` | `DashboardCacheEntry[]` | localStorage | cache do contador | 🟢 |
| `wsp-workspace-storage.activeWorkspaceId` | `number | null` | Zustand persist | ultimo workspace ativo | 🟢 |
| `x-workspace-id` | header HTTP | request | derivado da URL ou fornecido manualmente em APIs de contador | 🟢 |
