# Análise Técnica do Código - WSP-Finance

Gerado pelo Reversa Archaeologist em 2026-05-02.

Escala de confiança:

- 🟢 **CONFIRMADO** - extraído diretamente do código.
- 🟡 **INFERIDO** - baseado em padrão observado no código, pode exigir validação.
- 🔴 **LACUNA** - requer validação humana.

## Módulo `auth`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: o módulo `auth` cobre registro, autenticação, emissão/rotação de tokens, restauração de sessão, verificação de e-mail e recuperação de senha.

Arquivos principais:

- `backend/src/controllers/AuthController.ts`
- `backend/src/services/AuthService.ts`
- `backend/src/controllers/VerificationController.ts`
- `backend/src/services/VerificationService.ts`
- `backend/src/controllers/PasswordResetController.ts`
- `backend/src/services/PasswordResetService.ts`
- `backend/src/repositories/UserRepository.ts`
- `backend/src/middlewares/AuthMiddleware.ts`
- `frontend/src/app/AuthProvider.tsx`
- `frontend/src/features/auth/*`
- `frontend/src/shared/lib/axios.ts`

Rotas confirmadas em `backend/src/routes.ts`:

- `POST /auth/register`
- `POST /auth/session`
- `PATCH /auth/refresh`
- `POST /auth/verify`
- `POST /auth/resend-verification`
- `GET /auth/me`
- `POST /password/forgot`
- `POST /password/reset`

### Fluxo de registro

🟢 **CONFIRMADO**: `AuthController.register` valida `name`, `email`, `password` e `type` com Zod. `type` aceita `CLIENT` ou `ACCOUNTANT` e tem default `CLIENT`.

🟢 **CONFIRMADO**: `AuthService.register`:

1. Busca usuário por e-mail.
2. Bloqueia e-mail duplicado com erro `User already exists`.
3. Gera hash de senha com `bcrypt.hash(password, 8)`.
4. Cria usuário e workspace pessoal em transação via `UserRepository.createWithWorkspace`.
5. Envia código de verificação por `VerificationService.sendVerificationCode`.
6. Retorna usuário sem tokens de sessão.

🟢 **CONFIRMADO**: `UserRepository.createWithWorkspace` cria, na mesma transação Prisma, o `User`, um `Workspace` pessoal chamado `Meu Workspace Pessoal` e o vínculo `WorkspaceMember` com role `OWNER`.

🟢 **CONFIRMADO**: no frontend, `RegisterForm` exige confirmação de senha, seleciona persona `CLIENT` ou `ACCOUNTANT` e `useRegister` envia para `/auth/register`; em sucesso, navega para `/verify` levando o e-mail em `location.state`.

### Fluxo de login

🟢 **CONFIRMADO**: `AuthController.authenticate` valida `email` e `password`, chama `AuthService.authenticate` e retorna `user`, `token`, `refreshToken` e opcionalmente `dashboardCache`.

🟢 **CONFIRMADO**: `AuthService.authenticate`:

1. Busca usuário com memberships e workspaces.
2. Retorna `Invalid credentials` se o usuário não existir.
3. Bloqueia login quando `emailVerifiedAt` está vazio com erro `Email not verified`.
4. Compara senha com `bcrypt.compare`.
5. Gera access token JWT de 15 minutos.
6. Cria refresh token persistido com expiração de 30 dias.
7. Mapeia memberships para payload de frontend.
8. Para usuário `ACCOUNTANT`, carrega cache do dashboard por workspace.

🟢 **CONFIRMADO**: `LoginForm` redireciona para `/verify` quando a resposta de login tem status `403` ou mensagem contendo `not verified`.

🟢 **CONFIRMADO**: `useLogin` chama `POST /auth/session`, salva tokens/dados no `AuthProvider` e navega para `/`.

### Cache de dashboard para contador

🟢 **CONFIRMADO**: `AuthService.loadAccountantCache` importa `AccountantCacheService` dinamicamente.

Regras confirmadas:

- Se o contador não possui workspaces esperados, retorna array vazio.
- Lê cache atual via `getCachedDashboard`.
- Filtra cache por `workspaceId` esperado.
- Se a quantidade filtrada não bate com o conjunto de workspaces esperados, executa `refreshCache` de forma síncrona e lê novamente.
- Se continuar incompleto após refresh, lança erro `Accountant dashboard cache incomplete after refresh for user ${userId}`.
- Se o cache já está completo, dispara `refreshCache` em background sem bloquear login.

🟢 **CONFIRMADO**: `backend/tests/services/AuthService.test.ts` cobre cache frio, cache parcial com workspace obsoleto e exposição de `dashboardCache` em `/auth/me`.

### Refresh token e restauração de sessão

🟢 **CONFIRMADO**: `AuthService.refreshToken` busca refresh token por UUID, valida expiração por epoch seconds em `expiresIn`, apaga token expirado, apaga token usado e emite novo access token + novo refresh token.

🟢 **CONFIRMADO**: `AuthProvider.restoreSessionSnapshot` usa `wsp_refresh_token` no `localStorage`, chama `PATCH /auth/refresh`, injeta o novo access token no Axios e chama `GET /auth/me`.

🟢 **CONFIRMADO**: há proteção de concorrência em duas camadas:

- `restoreSessionInFlight` evita múltiplas restaurações simultâneas no `AuthProvider`.
- `frontend/src/shared/lib/axios.ts` usa `isRefreshing` e `failedQueue` para serializar refresh após respostas `401`.

🟢 **CONFIRMADO**: o access token fica apenas em memória no frontend (`accessToken` em `axios.ts`), enquanto refresh token, user info e dashboard cache são persistidos em `localStorage`.

### Verificação de e-mail

🟢 **CONFIRMADO**: `VerificationService.sendVerificationCode` gera código numérico de 6 dígitos com `Math.random`, expira em 24 horas e salva `AccountVerificationToken`.

🟢 **CONFIRMADO**: `VerificationService.verifyAccount`:

1. Busca usuário por e-mail.
2. Retorna sucesso silencioso se `emailVerifiedAt` já existe.
3. Busca token válido por `userId`, código e `expiresAt > now`.
4. Marca e-mail como verificado.
5. Remove o token usado.

🟢 **CONFIRMADO**: `VerificationService.resendVerification` não revela se o e-mail inexiste; retorna silenciosamente. Se a conta já está verificada, lança `Account already verified`.

🟢 **CONFIRMADO**: `VerifyForm` depende do e-mail em `location.state`; se ausente, mostra erro e link para login.

### Recuperação de senha

🟢 **CONFIRMADO**: `PasswordResetService.executeForgotPassword` busca usuário por e-mail e retorna silenciosamente se não existir.

🟢 **CONFIRMADO**: quando o usuário existe, o serviço gera código numérico de 6 dígitos, expira em 15 minutos, cria `PasswordResetToken` e envia e-mail.

🟢 **CONFIRMADO**: `PasswordResetService.executeResetPassword`:

1. Busca usuário por e-mail.
2. Rejeita usuário inexistente com erro genérico `Invalid credentials`.
3. Busca token não usado, não expirado e correspondente ao código.
4. Gera novo hash com `bcrypt.hash(newPassword, 8)`.
5. Atualiza senha.
6. Marca token como usado.
7. Remove todos os refresh tokens do usuário.

🟢 **CONFIRMADO**: o frontend carrega o e-mail entre `/forgot-password` e `/reset-password` por `location.state`.

### Middleware de autenticação

🟢 **CONFIRMADO**: `AuthMiddleware` exige header `Authorization`, divide pelo espaço e verifica o JWT com `JWT_SECRET` ou fallback `super-secret-key-change-me`.

🟢 **CONFIRMADO**: quando o JWT é válido, injeta `req.user.id = Number(sub)`.

🔴 **LACUNA**: não foi validado nesta etapa se há tipagem global de Express garantindo `req.user`; o arquivo `backend/src/@types/express.d.ts` deve ser revisado em módulo de infraestrutura ou `rbac-rls`.

### Regras de negócio confirmadas

| Regra | Local | Confiança |
|---|---|---|
| Nome de registro deve ter mínimo de 3 caracteres | `AuthController.register`, `frontend/src/features/auth/types/index.ts` | 🟢 CONFIRMADO |
| Senha de registro deve ter mínimo de 6 caracteres | `AuthController.register`, `frontend/src/features/auth/types/index.ts` | 🟢 CONFIRMADO |
| Tipo de usuário permitido: `CLIENT` ou `ACCOUNTANT` | `AuthController.register`, `UserType` Prisma | 🟢 CONFIRMADO |
| Registro não emite token de sessão antes da verificação de e-mail | `AuthService.register` | 🟢 CONFIRMADO |
| Login exige `emailVerifiedAt` preenchido | `AuthService.authenticate` | 🟢 CONFIRMADO |
| Access token expira em 15 minutos | `AuthService.generateAccessToken` | 🟢 CONFIRMADO |
| Refresh token expira em 30 dias | `AuthService.generateRefreshToken` | 🟢 CONFIRMADO |
| Refresh token é rotacionado a cada uso | `AuthService.refreshToken` | 🟢 CONFIRMADO |
| Reset de senha invalida todos os refresh tokens do usuário | `PasswordResetService.executeResetPassword` | 🟢 CONFIRMADO |
| Código de verificação de conta expira em 24 horas | `VerificationService.sendVerificationCode` | 🟢 CONFIRMADO |
| Código de reset de senha expira em 15 minutos | `PasswordResetService.executeForgotPassword` | 🟢 CONFIRMADO |
| Conta inexistente em resend/forgot não deve vazar enumeração | `VerificationService.resendVerification`, `PasswordResetService.executeForgotPassword` | 🟢 CONFIRMADO |

### Algoritmos e transformações relevantes

🟢 **CONFIRMADO**: geração de OTP usa `Math.floor(100000 + Math.random() * 900000).toString()`, garantindo string numérica de 6 dígitos.

🟢 **CONFIRMADO**: mapeamento de memberships converte `WorkspaceMember` + `Workspace` em payload plano com `id`, `name`, `type`, `role`, `closedUntil` e `certificateExpiresAt`.

🟢 **CONFIRMADO**: filtro de cache do contador usa `Set<number>` de workspace IDs esperados e remove entradas de workspace obsoleto.

🟢 **CONFIRMADO**: fila de refresh no Axios guarda promises pendentes e as resolve com o novo token após `PATCH /auth/refresh`.

### Dependências do módulo

- `bcryptjs`: hash e comparação de senha.
- `jsonwebtoken`: emissão e validação de JWT.
- `zod`: validação de payloads HTTP.
- `@prisma/client`: entidades persistidas.
- `nodemailer`: envio via Ethereal.
- `@tanstack/react-query`: mutations frontend.
- `react-router-dom`: navegação entre login, verificação e reset.
- `axios`: client HTTP e interceptors de refresh.

### Lacunas para validação posterior

- 🔴 **LACUNA**: `JWT_SECRET` tem fallback hardcoded; esta etapa não validou variáveis obrigatórias em runtime.
- 🔴 **LACUNA**: `EtherealMailProvider` cria conta assíncrona no construtor; esta etapa não validou comportamento em ambiente de produção.
- 🔴 **LACUNA**: códigos OTP usam `Math.random`; esta etapa documenta o comportamento, mas não avaliou requisito criptográfico.

## Módulo `workspaces`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: o módulo `workspaces` cobre criação, listagem e edição de workspaces, seleção/estado de workspace no frontend, isolamento por membership, gestão de membros/convites e upload de certificado A1.

Arquivos principais:

- `backend/src/controllers/WorkspaceController.ts`
- `backend/src/services/WorkspaceService.ts`
- `backend/src/repositories/WorkspaceRepository.ts`
- `backend/src/middlewares/WorkspaceMiddleware.ts`
- `backend/src/middlewares/RbacMiddleware.ts`
- `backend/src/controllers/InviteController.ts`
- `backend/src/services/InviteService.ts`
- `backend/src/services/CertificateService.ts`
- `backend/src/providers/IStorageProvider.ts`
- `backend/src/providers/S3StorageProvider.ts`
- `frontend/src/features/workspaces/*`
- `frontend/src/shared/stores/useWorkspaceStore.ts`

Rotas confirmadas em `backend/src/routes.ts`:

- `GET /workspaces`
- `POST /workspaces`
- `PUT /workspaces/:id`
- `POST /workspaces/:id/certificate-a1`
- `POST /workspaces/:id/invites`
- `POST /workspaces/:id/invites/:inviteId/revoke`
- `POST /invites/accept`
- `GET /invites/received`
- `POST /invites/:id/reject`
- `GET /workspaces/:id/members`
- `GET /workspaces/:id/invites`
- `DELETE /workspaces/:id/members/:userId`

### Criação de workspace

🟢 **CONFIRMADO**: `WorkspaceController.create` valida `name`, `type`, `fiscalIdentity` e `address` com Zod. `type` usa `WorkspaceType` e tem default `PERSONAL`.

🟢 **CONFIRMADO**: `WorkspaceService.create` exige `payload.name` e cria workspace + membership `OWNER` na mesma transação Prisma.

🟢 **CONFIRMADO**: para workspace `BUSINESS` com `fiscalIdentity.cnae`, o serviço limpa caracteres não numéricos e infere `taxRate`:

- CNAE iniciado por `620`, `6911` ou `7112`: `6.00`.
- CNAE iniciado por `5320`: `0.00`.
- Demais casos: mantém `0.00`.

🟢 **CONFIRMADO**: o frontend `CreateWorkspaceForm` usa default `BUSINESS` com `documentType: CNPJ`, busca dados de CNPJ em blur quando há 14 dígitos e busca endereço por CEP quando há 8 dígitos.

### Listagem e seleção de workspace

🟢 **CONFIRMADO**: `WorkspaceService.list` delega para `WorkspaceRepository.findManyByUserId`, que retorna workspaces onde existe `WorkspaceMember` do usuário, ordenados por `createdAt asc`.

🟢 **CONFIRMADO**: `WorkspaceProvider` não faz request próprio; deriva `workspaces` diretamente de `user.memberships` carregado pelo módulo `auth`.

🟢 **CONFIRMADO**: `WorkspaceProvider` tenta restaurar `wsp_active_workspace` do `localStorage`; se não encontrar membership correspondente, escolhe o primeiro workspace disponível.

🟢 **CONFIRMADO**: `useWorkspaceStore` persiste somente `activeWorkspaceId` em `localStorage` sob a chave `wsp-workspace-storage`.

### Edição de workspace

🟢 **CONFIRMADO**: `WorkspaceController.update` define schema com `name` e `type` opcionais, mas depois exige os dois campos antes de chamar o service. Se faltar um deles, retorna `400 Name and Type are required for update`.

🟢 **CONFIRMADO**: `WorkspaceService.update` usa `WorkspaceRepository.findByIdAndUserId`, que exige membership `OWNER`, e depois atualiza `name` e `type`.

### Isolamento por workspace e RBAC

🟢 **CONFIRMADO**: `WorkspaceMiddleware` exige header `x-workspace-id`, valida número, exige `req.user.id`, busca membership pela constraint `userId_workspaceId` e retorna `403` quando não há vínculo.

🟢 **CONFIRMADO**: `WorkspaceMiddleware` bloqueia `ACCOUNTANT` acessando workspace `PERSONAL` e registra warning com `[ZERO TRUST BLOCK]`.

🟢 **CONFIRMADO**: após validar membership, `WorkspaceMiddleware` injeta `req.workspaceId` e executa o restante da cadeia dentro de `tenantContext.run({ currentWorkspaceId, userRole, workspaceType })`.

🟢 **CONFIRMADO**: `RbacMiddleware` define hierarquia `VIEWER=1`, `EDITOR=2`, `ACCOUNTANT=2.5`, `OWNER=3` e bloqueia quando o nível do usuário é menor que o requerido.

### Convites e membros

🟢 **CONFIRMADO**: `InviteService.createInvite` permite convite apenas quando o solicitante é `OWNER` do workspace.

🟢 **CONFIRMADO**: antes de criar convite, o service bloqueia usuário que já é membro e bloqueia convite `PENDING` duplicado para o mesmo e-mail/workspace.

🟢 **CONFIRMADO**: convite usa `crypto.randomBytes(32).toString('hex')` como token e expira em 7 dias.

🟢 **CONFIRMADO**: `InviteService.acceptInvite` implementa double handshake:

1. Busca convite por token.
2. Bloqueia convite revogado, aceito ou expirado.
3. Quando expirado, atualiza status para `EXPIRED`.
4. Busca usuário logado e exige que `acceptingUser.email === invite.email`.
5. Cria `WorkspaceMember` com `role` vindo do convite, não do request.
6. Marca convite como `ACCEPTED` na mesma transação.

🟢 **CONFIRMADO**: `rejectInvite` também exige que o e-mail do usuário logado seja o e-mail do convite e muda status para `REJECTED`.

🟢 **CONFIRMADO**: `removeMember` exige requester `OWNER`, impede auto-remoção e apaga o vínculo `WorkspaceMember` do alvo.

🟢 **CONFIRMADO**: `TeamSettingsPage` mostra formulário de convite apenas quando `activeMembership.role === 'OWNER'`, lista membros, lista convites enviados e permite remoção de membros que não sejam `OWNER`.

### Certificado A1

🟢 **CONFIRMADO**: a rota `POST /workspaces/:id/certificate-a1` encadeia `AuthMiddleware`, `WorkspaceMiddleware`, `RbacMiddleware('OWNER')`, `multer.memoryStorage()` e filtro de extensão `.p12`/`.pfx`.

🟢 **CONFIRMADO**: `WorkspaceController.uploadCertificate` exige `req.file.buffer` e `req.body.password`, transforma `params.id` em número e chama `WorkspaceService.uploadCertificate(targetWorkspaceId, userId, reqWorkspaceId, buffer, password)`.

🟢 **CONFIRMADO**: `WorkspaceService.uploadCertificate` valida que `workspaceId === reqWorkspaceId`, busca workspace, valida membership, parseia validade do certificado, faz upload seguro do buffer, persiste `certificateObjectKey` e `certificateExpiresAt`, atualiza caches de contadores em best effort e apaga o certificado antigo somente após sucesso da persistência do novo.

🟢 **CONFIRMADO**: `CertificateService.parseAndExtractValidity` usa `node-forge` para abrir PFX/P12, seleciona preferencialmente certificado leaf, extrai `notAfter`, calcula `expiresInDays` e classifica `alertLevel` como `ok`, `warning` ou `expired`.

🟢 **CONFIRMADO**: `S3StorageProvider.uploadSecureBuffer` gera object key `workspaces/{workspaceId}/vault/{uuid}.p12`, exige `VAULT_MASTER_KEY` com ao menos 32 caracteres para storage de certificado e usa SSE-C AES256.

🟢 **CONFIRMADO**: `CertificateUploadSection` valida extensão no frontend (`.pfx`/`.p12`), envia `FormData` com campos `certificate` e `password`, mostra estado de certificado ativo quando `activeMembership.certificateExpiresAt` existe e exibe erro retornado pelo backend.

🟡 **INFERIDO**: Cloudflare R2 é o backend S3 compatível pretendido, porque `S3StorageProvider` usa endpoint `r2.cloudflarestorage.com` e variáveis `R2_*`.

### Regras de negócio confirmadas

| Regra | Local | Confiança |
|---|---|---|
| Workspace novo cria membership `OWNER` para o usuário criador | `WorkspaceService.create` | 🟢 CONFIRMADO |
| `taxRate` é inferido por prefixos de CNAE para alguns casos | `WorkspaceService.create` | 🟢 CONFIRMADO |
| Listagem de workspaces é baseada em membership | `WorkspaceRepository.findManyByUserId` | 🟢 CONFIRMADO |
| Edição de workspace exige usuário `OWNER` | `WorkspaceRepository.findByIdAndUserId` | 🟢 CONFIRMADO |
| Header `x-workspace-id` é obrigatório para rotas protegidas por workspace | `WorkspaceMiddleware` | 🟢 CONFIRMADO |
| Contador não acessa workspace pessoal | `WorkspaceMiddleware` | 🟢 CONFIRMADO |
| Apenas `OWNER` cria/revoga convite | `InviteService.createInvite`, `InviteService.revokeInvite` | 🟢 CONFIRMADO |
| Convite pendente duplicado para mesmo e-mail/workspace é bloqueado | `InviteService.createInvite` | 🟢 CONFIRMADO |
| Aceite de convite exige e-mail do usuário logado igual ao e-mail convidado | `InviteService.acceptInvite` | 🟢 CONFIRMADO |
| Remoção de membro exige `OWNER` e bloqueia auto-remoção | `InviteService.removeMember` | 🟢 CONFIRMADO |
| Upload A1 exige `.pfx` ou `.p12`, senha e buffer em memória | `routes.ts`, `WorkspaceController.uploadCertificate` | 🟢 CONFIRMADO |
| Certificado novo só substitui o antigo após persistência bem-sucedida | `WorkspaceService.uploadCertificate` | 🟢 CONFIRMADO |
| Falha de refresh de cache de contador não reverte upload de certificado | `WorkspaceService.uploadCertificate` | 🟢 CONFIRMADO |

### Algoritmos e transformações relevantes

🟢 **CONFIRMADO**: inferência fiscal por CNAE remove não dígitos e compara prefixos.

🟢 **CONFIRMADO**: token de convite é aleatório criptográfico de 32 bytes codificado em hexadecimal.

🟢 **CONFIRMADO**: double handshake de convite cruza token persistido com usuário logado e e-mail do convite.

🟢 **CONFIRMADO**: seleção de certificado leaf ignora certificados CA quando possível, via extensão `basicConstraints`.

🟢 **CONFIRMADO**: upload seguro usa SSE-C derivado de SHA-256 de `VAULT_MASTER_KEY` e MD5 do material da chave.

### Testes relacionados

🟢 **CONFIRMADO**:

- `backend/tests/services/WorkspaceService.certificate.test.ts`
- `backend/tests/routes/WorkspaceCertificate.route.test.ts`
- `backend/tests/controllers/WorkspaceController.certificate.test.ts`
- `frontend/tests/app/CertificateUploadSection.test.tsx`
- `frontend/tests/hooks/useUploadCertificate.test.tsx`

### Lacunas e pontos de atenção

- 🔴 **LACUNA**: a rota de certificado exige `RbacMiddleware('OWNER')`, mas `WorkspaceService.uploadCertificate` permite `OWNER` ou `ACCOUNTANT`; a regra efetiva da API é mais restritiva que a regra do service.
- 🔴 **LACUNA**: `WorkspaceController.update` tem schema parcial, mas exige `name` e `type` ao final; não foi validado se o frontend usa essa rota.
- 🔴 **LACUNA**: não há evidência nesta etapa de teste automatizado para convites/membros, apenas leitura estática do service/controller.

## Módulo `rbac-rls`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: o módulo `rbac-rls` implementa autenticação de request, autorização por role, isolamento por workspace na API, propagação de contexto tenant via `AsyncLocalStorage`, injeção de `app.current_workspace_id` no Prisma e policies PostgreSQL RLS.

Arquivos principais:

- `backend/src/middlewares/AuthMiddleware.ts`
- `backend/src/middlewares/WorkspaceMiddleware.ts`
- `backend/src/middlewares/RbacMiddleware.ts`
- `backend/src/lib/tenantContext.ts`
- `backend/src/lib/prisma.ts`
- `backend/src/lib/checkEnvironment.ts`
- `backend/src/@types/express.d.ts`
- `backend/prisma/migrations/20260310203000_enable_rls_multi_tenant/migration.sql`
- `backend/prisma/migrations/20260413052239_optimize_rls_and_statistics/migration.sql`
- `backend/src/test/prisma-test-clients.ts`
- `backend/src/test/setup-test-role.ts`

### Autenticação HTTP

🟢 **CONFIRMADO**: `AuthMiddleware` exige o header `Authorization`. Se ausente, retorna `401 Token not provided`.

🟢 **CONFIRMADO**: o middleware divide o header por espaço, verifica o JWT com `process.env.JWT_SECRET || 'super-secret-key-change-me'`, extrai `sub` e injeta `req.user.id = Number(sub)`.

🟢 **CONFIRMADO**: token inválido ou expirado retorna `401 Token invalid or expired`.

🟢 **CONFIRMADO**: a tipagem global em `backend/src/@types/express.d.ts` declara `Request.user.id: number` e `Request.workspaceId?: number`.

### Workspace middleware e tenant context

🟢 **CONFIRMADO**: `WorkspaceMiddleware` exige `x-workspace-id`, aceita header array pegando o primeiro item, converte para `Number` e rejeita `NaN`.

🟢 **CONFIRMADO**: o middleware exige `req.user.id`, busca `workspaceMember` por chave composta `userId_workspaceId` e inclui `workspace.type`.

🟢 **CONFIRMADO**: sem membership, retorna `403 Access to this workspace is denied`.

🟢 **CONFIRMADO**: membership `ACCOUNTANT` em workspace `PERSONAL` é bloqueado com `403 Accountants cannot access personal workspaces.` e warning `[ZERO TRUST BLOCK]`.

🟢 **CONFIRMADO**: quando autorizado, injeta `req.workspaceId` e executa `next()` dentro de `tenantContext.run({ currentWorkspaceId, userRole, workspaceType })`.

🟢 **CONFIRMADO**: `tenantContext` é um `AsyncLocalStorage<TenantContext>` com campos `currentWorkspaceId`, `userRole`, `workspaceType`, `bypassRls` e `inTransaction`.

### RBAC hierárquico

🟢 **CONFIRMADO**: `RbacMiddleware(requiredRole)` resolve `userId` por `req.user?.id` e `workspaceId` por header `x-workspace-id` ou fallback `req.workspaceId`.

🟢 **CONFIRMADO**: se faltar usuário ou workspace, retorna `400 Contexto de usuário ou workspace inválido para validação de permissão.`

🟢 **CONFIRMADO**: busca membership por `userId_workspaceId`; sem membership retorna `403 Acesso negado: Você não é membro deste workspace.`

🟢 **CONFIRMADO**: hierarquia de roles:

- `VIEWER`: 1
- `EDITOR`: 2
- `ACCOUNTANT`: 2.5
- `OWNER`: 3

🟢 **CONFIRMADO**: se `roleHierarchy[membership.role] < roleHierarchy[requiredRole]`, retorna `403 Permissão insuficiente`.

🟢 **CONFIRMADO**: em sucesso, injeta `(req as any).userRole = membership.role`.

### Prisma extendido e injeção RLS

🟢 **CONFIRMADO**: `backend/src/lib/prisma.ts` cria `basePrisma`, exporta `sysPrisma = basePrisma` e exporta `prisma = basePrisma.$extends(...)`.

🟢 **CONFIRMADO**: antes de criar o client, `DATABASE_URL` recebe `connection_limit` quando a URL ainda não contém esse parâmetro. O valor vem de `PRISMA_CONNECTION_LIMIT || '5'`.

🟢 **CONFIRMADO**: no `$transaction` estendido:

- Se não há `currentWorkspaceId` ou `bypassRls` está ativo, delega para `basePrisma.$transaction`.
- Para transação interativa, roda `tenantContext.run({ ...store, inTransaction: true })`, abre `basePrisma.$transaction`, executa `SELECT set_config('app.current_workspace_id', workspaceId, true)` no mesmo `tx` e chama a função do usuário.
- Para array transaction, antepõe `basePrisma.$executeRaw set_config(...)` antes das queries.

🟢 **CONFIRMADO**: no hook global `$allModels.$allOperations`, se há `currentWorkspaceId` e não há `bypassRls` nem `inTransaction`, executa uma transação com `set_config` seguido da query.

🟢 **CONFIRMADO**: se `inTransaction` já está ativo, o hook global não reinjeta contexto e deixa a query seguir, evitando duplicação dentro da transação interativa.

### Policies PostgreSQL RLS

🟢 **CONFIRMADO**: a migration `20260310203000_enable_rls_multi_tenant` habilita e força RLS em `Transaction`, `Account` e `Category`.

🟢 **CONFIRMADO**: a migration inicial cria policies que comparam `workspaceId` com `current_setting('app.current_workspace_id', true)::int`.

🟢 **CONFIRMADO**: para `Category`, a policy permite leitura quando `workspaceId IS NULL` ou quando bate com o workspace atual; o `WITH CHECK` exige workspace atual.

🟢 **CONFIRMADO**: a migration `20260413052239_optimize_rls_and_statistics` troca as policies por versão com subquery estável `(SELECT current_setting(...))` e adiciona policy para `BankMovement`.

🟢 **CONFIRMADO**: `prisma_migration` recebe `BYPASSRLS` condicionalmente na migration inicial quando a role existe.

### Check de privilégio runtime

🟢 **CONFIRMADO**: `checkPrivileges` consulta `pg_roles` para o `current_user` e lança erro se `rolsuper === true` ou `rolbypassrls === true`.

🟢 **CONFIRMADO**: `backend/src/server.ts` chama `checkPrivileges(prisma as any)` antes de iniciar cron jobs e `app.listen`.

🟢 **CONFIRMADO**: falha nesse check impede startup com `process.exit(1)`.

### Infra de testes RLS

🟢 **CONFIRMADO**: `backend/src/test/setup-test-role.ts` cria/normaliza role `wsp_test_user` com `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOINHERIT` e grants de schema/tabelas/sequences.

🟢 **CONFIRMADO**: `backend/src/test/prisma-test-clients.ts` separa `managementClient` por `DIRECT_URL` e `applicationClient` por URL derivada com usuário restrito.

🟢 **CONFIRMADO**: `applicationClient` de teste usa `AsyncLocalStorage` própria e injeta `app.current_workspace_id` em `$allOperations`.

🟢 **CONFIRMADO**: `withEphemeralTransaction` injeta contexto RLS opcional em transação e força rollback lançando `TRANSACTION_ROLLBACK`.

### Testes relacionados

🟢 **CONFIRMADO**:

- `backend/tests/middlewares/WorkspaceIsolator.test.ts`: valida bloqueio de `ACCOUNTANT` em workspace `PERSONAL` e permissão em `BUSINESS`.
- `backend/tests/integration/RLS.integration.test.ts`: insere em workspace A com application client restrito e confirma que workspace B não lê o dado.
- `backend/tests/integration/role-audit.test.ts`: confirma role restrita sem `SUPERUSER`/`BYPASSRLS`, clientes DB distintos e URL restrita derivada.
- `backend/tests/integration/prisma-runtime-role.test.ts`: valida erro fatal para `rolbypassrls` e `rolsuper`.

### Regras de negócio confirmadas

| Regra | Local | Confiança |
|---|---|---|
| Request autenticado precisa de JWT válido para rotas com `AuthMiddleware` | `AuthMiddleware.ts` | 🟢 CONFIRMADO |
| Rotas de workspace precisam de header `x-workspace-id` numérico | `WorkspaceMiddleware.ts` | 🟢 CONFIRMADO |
| Usuário só acessa workspace onde possui membership | `WorkspaceMiddleware.ts` | 🟢 CONFIRMADO |
| Contador não acessa workspace pessoal | `WorkspaceMiddleware.ts` | 🟢 CONFIRMADO |
| Role `OWNER` supera `ACCOUNTANT`, `EDITOR` e `VIEWER` | `RbacMiddleware.ts` | 🟢 CONFIRMADO |
| Prisma injeta `app.current_workspace_id` quando há tenant context | `prisma.ts` | 🟢 CONFIRMADO |
| Runtime não deve usar role `SUPERUSER` ou `BYPASSRLS` | `checkEnvironment.ts` | 🟢 CONFIRMADO |
| RLS protege `Transaction`, `Account`, `Category` e `BankMovement` | migrations RLS | 🟢 CONFIRMADO |

### Algoritmos e transformações relevantes

🟢 **CONFIRMADO**: propagação de tenant context via `AsyncLocalStorage` em toda cadeia async do request.

🟢 **CONFIRMADO**: injeção RLS por `SELECT set_config('app.current_workspace_id', workspaceId, true)` no mesmo contexto transacional/query.

🟢 **CONFIRMADO**: role hierarchy usa valores numéricos, com `ACCOUNTANT` como nível intermediário `2.5`.

🟢 **CONFIRMADO**: derivação de URL restrita de teste troca usuário e senha de `DATABASE_URL` para `wsp_test_user`.

### Lacunas e pontos de atenção

- 🔴 **LACUNA**: `AuthMiddleware` não valida explicitamente o prefixo `Bearer`; se `authorization.split(' ')` não tiver token, a falha cai no `jwt.verify`.
- 🔴 **LACUNA**: há rotas autenticadas sem `WorkspaceMiddleware`, como `/transactions/all`, `/bridge/transfer` e `/accountant/bank-movements/pending`; esta etapa documenta a presença, mas a autorização interna delas pertence a outros módulos.
- 🔴 **LACUNA**: esta etapa não executou os testes de integração RLS contra banco real; o resultado aqui é leitura estática dos testes e código.

## Módulo `finance-core`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `finance-core` cobre contas, categorias, transações, saldo bancário, dashboard financeiro, auditoria de mutações monetárias e ponte entre workspaces.

Arquivos principais:

- `backend/src/controllers/AccountController.ts`
- `backend/src/services/AccountService.ts`
- `backend/src/repositories/AccountRepository.ts`
- `backend/src/controllers/CategoryController.ts`
- `backend/src/services/CategoryService.ts`
- `backend/src/repositories/CategoryRepository.ts`
- `backend/src/controllers/TransactionController.ts`
- `backend/src/services/TransactionService.ts`
- `backend/src/repositories/TransactionRepository.ts`
- `backend/src/controllers/DashboardController.ts`
- `backend/src/services/DashboardService.ts`
- `backend/src/repositories/DashboardRepository.ts`
- `backend/src/controllers/BridgeController.ts`
- `backend/src/services/BridgeService.ts`
- `backend/src/services/AuditLogService.ts`
- `frontend/src/features/transactions/*`
- `frontend/src/features/dashboard/*`

### Contas

🟢 **CONFIRMADO**: `AccountController.create` valida `name`, `type`, `initialBalance` e `isIncludedInTotal`, usa `req.workspaceId` e chama `AccountService.create`.

🟢 **CONFIRMADO**: `AccountService.create` converte `initialBalance` para `Decimal` e conecta a conta ao workspace.

🟢 **CONFIRMADO**: listagem de contas usa `AccountRepository.findManyByWorkspace`, ordenada por `name asc`.

🟢 **CONFIRMADO**: update/delete validam que a conta pertence ao workspace por `findByIdAndWorkspace`.

### Categorias

🟢 **CONFIRMADO**: categorias customizadas são criadas conectadas ao workspace.

🟢 **CONFIRMADO**: `CategoryRepository.findManyByWorkspace` retorna categorias do workspace e globais (`workspaceId = null`).

🟢 **CONFIRMADO**: `CategoryService.list` adiciona `isGlobal` para o frontend com base em `workspaceId === null`.

🟢 **CONFIRMADO**: delete só permite remover categoria do workspace; categoria global não é retornada pela verificação e gera erro `Category not found or cannot be deleted`.

### Transações e cálculo financeiro

🟢 **CONFIRMADO**: `TransactionController.create` valida descrição, valor positivo, data, tipo, conta, categoria, `isPaid`, campos marketplace opcionais e anexo.

🟢 **CONFIRMADO**: `TransactionService.create` valida pertencimento de conta e categoria ao workspace antes de criar transação.

🟢 **CONFIRMADO**: quando `workspace.closedUntil` existe, transações em data igual ou anterior ao fechamento são bloqueadas, exceto quando o contexto tem `userRole === 'ACCOUNTANT'` e workspace `BUSINESS`.

🟢 **CONFIRMADO**: cenário marketplace com `grossAmount` calcula:

- taxa de plataforma por `platformFeeRate` quando presente, ou usa `marketplaceFee`;
- imposto sobre faturamento bruto: `grossAmount * taxRate / 100`;
- valor líquido: `grossAmount - fee - taxAmount`;
- valor final que entra no saldo: `grossAmount - fee - shipping`.

🟢 **CONFIRMADO**: cenário simples sem `grossAmount` calcula imposto e valor líquido apenas para `INCOME`.

🟢 **CONFIRMADO**: criação de transação é atômica: cria `Transaction`, atualiza saldo se `isPaid`, e grava auditoria síncrona com saldo antes/depois e delta.

🟢 **CONFIRMADO**: exclusão reverte saldo quando a transação estava paga, grava auditoria síncrona e depois apaga a transação. Se houver `attachmentUrl`, chama `UploadService.deleteRemoteFile` em background.

### Listagem e paginação

🟢 **CONFIRMADO**: `TransactionService.list` pede `limit + 1`, corta para `limit`, calcula `hasMore` e `nextCursor` pelo último item retornado.

🟢 **CONFIRMADO**: `TransactionRepository.findManyByWorkspace` filtra por datas, conta, categoria e tipo; usa cursor opcional, `skip: 1`, ordenação `date desc` e inclui nomes de categoria/conta.

🟢 **CONFIRMADO**: `listAllByUser` lista transações de qualquer workspace onde o usuário é membro.

### Dashboard

🟢 **CONFIRMADO**: `DashboardService.getSummary` usa mês/ano atual por default ou query params.

🟢 **CONFIRMADO**: executa em paralelo saldo total, fluxo mensal e despesas fixas.

🟢 **CONFIRMADO**: saldo total soma contas com `isIncludedInTotal: true`.

🟢 **CONFIRMADO**: fluxo mensal agrupa transações pagas por `INCOME`/`EXPENSE`.

🟢 **CONFIRMADO**: métricas retornam despesas fixas, break-even igual às despesas fixas e coverage ratio como `income / fixedExpenses * 100`.

### Bridge entre workspaces

🟢 **CONFIRMADO**: `BridgeController.transfer` valida origem/destino, contas, valor positivo, descrição e data, e bloqueia origem/destino iguais.

🟢 **CONFIRMADO**: `BridgeService.executeTransfer` exige role `OWNER` ou `ACCOUNTANT` nos dois workspaces.

🟢 **CONFIRMADO**: valida `closedUntil` em ambos os workspaces com bypass apenas para contador em workspace empresarial.

🟢 **CONFIRMADO**: valida contas origem/destino por workspace, saldo suficiente na origem e categoria válida em cada workspace.

🟢 **CONFIRMADO**: ponte é atômica: cria transação de débito, transação de crédito, decrementa/incrementa saldos, e grava duas auditorias `BRIDGE_TRANSFER` com mesmo `bridgeId`.

### Regras de negócio confirmadas

| Regra | Local | Confiança |
|---|---|---|
| Conta pertence a um workspace e usa `Decimal(19,4)` para saldo | Prisma/AccountService | 🟢 CONFIRMADO |
| Categoria global tem `workspaceId = null` e não pode ser deletada via workspace | CategoryRepository | 🟢 CONFIRMADO |
| Transação paga atualiza saldo imediatamente | TransactionService | 🟢 CONFIRMADO |
| Transação em período fiscal fechado é bloqueada, exceto contador em BUSINESS | TransactionService/BridgeService | 🟢 CONFIRMADO |
| Marketplace recalcula valor final, imposto e líquido | TransactionService | 🟢 CONFIRMADO |
| Exclusão de transação paga reverte saldo e audita delta | TransactionService | 🟢 CONFIRMADO |
| Dashboard só inclui contas marcadas em `isIncludedInTotal` | DashboardRepository | 🟢 CONFIRMADO |
| Bridge exige permissão em ambos os workspaces e saldo suficiente | BridgeService | 🟢 CONFIRMADO |

### Lacunas e pontos de atenção

- 🔴 **LACUNA**: o frontend tipa `Transaction.id` como `number`, mas o schema Prisma define `Transaction.id` como `String` UUID.
- 🔴 **LACUNA**: `BridgeService` usa `crypto.randomUUID()` sem import explícito de `crypto` no arquivo analisado; não foi validado por build nesta etapa.
- 🔴 **LACUNA**: `fixedExpenses` considera mês atual do servidor, enquanto `getSummary` aceita mês/ano alvo; isso pode divergir para consultas históricas.

## Modulo `uploads-storage`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `uploads-storage` cobre presigned upload para Cloudflare R2/S3, fallback local de desenvolvimento, quota por workspace, validacao MIME, assinatura temporaria para visualizacao de anexos e storage seguro de certificados A1.

Arquivos principais:

- `backend/src/controllers/UploadController.ts`
- `backend/src/services/UploadService.ts`
- `backend/src/providers/IStorageProvider.ts`
- `backend/src/providers/S3StorageProvider.ts`
- `backend/src/providers/LocalStorageProvider.ts`
- `backend/src/routes.ts`
- `frontend/src/services/uploadCloudflare.ts`
- `frontend/src/features/transactions/hooks/useAttachment.ts`
- `frontend/src/features/transactions/components/AttachmentPreview.tsx`

### Upload presigned e quota

🟢 **CONFIRMADO**: `POST /uploads/presigned` exige `AuthMiddleware`, `WorkspaceMiddleware` e `uploadRateLimiter` de 10 requisicoes por minuto por IP.

🟢 **CONFIRMADO**: `UploadController.requestUploadUrl` valida `fileName`, `contentType`, `folderType` em `AVATAR | RECEIPT | INVOICE | CERTIFICATE | ASSET` e `fileSize` positivo com teto de 10 MB.

🟢 **CONFIRMADO**: `UploadService.requestUpload` soma `Transaction.attachmentSize` do workspace e bloqueia nova URL se o total ultrapassar 1 GB, retornando erro com `status = 402`.

🟢 **CONFIRMADO**: a chave de objeto segue `workspaces/{workspaceId}/{folderType}/{yyyy-mm}/{date}_{folderType}_{hash}.{ext}`; certificados usam `workspaces/{workspaceId}/vault/...`.

🟢 **CONFIRMADO**: `S3StorageProvider.generateUploadUrl` sanitiza object key, fixa `ContentType`, fixa `ContentLength` quando informado e retorna headers exigidos pelo cliente.

### Seguranca de certificado e visualizacao

🟢 **CONFIRMADO**: quando `folderType` e `CERTIFICATE` ou MIME e PKCS12/PEM, o provider exige `VAULT_MASTER_KEY` com minimo de 32 caracteres e deriva chave SSE-C AES256 por SHA-256.

🟢 **CONFIRMADO**: assinatura de download (`GET /transactions/:id/attachment`) valida que a transacao pertence ao workspace, exige `attachmentUrl`, registra auditoria async `ATTACHMENT_VIEW` e retorna URL temporaria de 5 minutos.

🟢 **CONFIRMADO**: `AttachmentPreview` usa `fetch(downloadUrl, { headers })` para suportar SSE-C, gera `blobUrl`, renderiza via `iframe` e revoga URL local ao fechar.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: `LocalStorageProvider.generateUploadUrl` ignora a chave ja montada pelo backend e gera `Date.now()-filename`; isso muda a semantica entre local e R2.
- 🔴 **LACUNA**: `UploadController.localUploadHandler` recebe `filename` direto da rota e grava em `uploads`; a protecao principal do fluxo local vem do nome gerado anteriormente, nao ha validacao forte nessa rota.
- 🔴 **LACUNA**: a Fase 2 documentou testes existentes (`UploadService`, `UploadService.audit`, `S3StorageProvider`, `attachmentViewer`, `useAttachment`), mas nao executou a suite.

## Modulo `imports-open-finance`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `imports-open-finance` converte OFX local e webhooks Open Finance em `BankMovement` de staging por meio de uma engine unica de ingestao financeira.

Arquivos principais:

- `backend/src/controllers/ImportController.ts`
- `backend/src/services/ImportService.ts`
- `backend/src/controllers/OpenFinanceWebhookController.ts`
- `backend/src/services/OpenFinanceWebhookService.ts`
- `backend/src/services/FinancialIngestionEngine.ts`
- `backend/src/repositories/BankMovementRepository.ts`
- `backend/src/routes.ts`

### OFX

🟢 **CONFIRMADO**: `POST /transactions/import` usa `AuthMiddleware` e `WorkspaceMiddleware`; o body valida `fileName` e `accountId`.

🟢 **CONFIRMADO**: `ImportController.importOFX` resolve o arquivo em `backend/uploads/{fileName}` e chama `ImportService.importOFX(filePath, workspaceId, accountId)`.

🟢 **CONFIRMADO**: `ImportService` rejeita path vazio, path com `..` e arquivo sem extensao `.ofx`; depois parseia `BANKMSGSRSV1` ou `CREDITCARDMSGSRSV1` via `ofx-js`.

### Webhook Open Finance

🟢 **CONFIRMADO**: `POST /api/webhooks/open-finance` fica fora de `AuthMiddleware`; a autorizacao vem de bearer token comparado com `OPEN_FINANCE_WEBHOOK_KEY` ou fallback `webhook-auth-key-mock`.

🟢 **CONFIRMADO**: payload Open Finance exige `workspaceId`, `accountId` e lista nao vazia de movimentos com `date`, `description`, `amount` e `transactionId` opcional.

### Engine de ingestao

🟢 **CONFIRMADO**: `FinancialIngestionEngine.ingest` normaliza payload unitario/lista, extrai campos conforme `MovementSource.OFX` ou `OPEN_FINANCE`, converte valor com `Decimal`, normaliza data para UTC e gera `hashDeduplication` SHA-256.

🟢 **CONFIRMADO**: antes de inserir, a engine chama `FuzzyDeduplicationService.findCandidates`; duplicatas fuzzy nao entram no lote.

🟢 **CONFIRMADO**: insercao ocorre em chunks de 50 com `prisma.$transaction` e `BankMovementRepository.createBatch(... skipDuplicates: true)`.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: webhook usa um segredo default (`webhook-auth-key-mock`) quando a variavel de ambiente nao existe; isso deve ser revisado antes de producao.
- 🔴 **LACUNA**: `ImportService` valida extensao e `..`, mas recebe `fileName` vindo do body e resolve caminho local; nao foi feita validacao runtime contra path traversal codificado ou symlink.
- 🔴 **LACUNA**: nao ha validacao explicita, neste modulo, de que `accountId` pertence ao `workspaceId` antes da ingestao; a engine persiste ambos diretamente no staging.

## Modulo `bank-movements`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `bank-movements` e a area de staging/conciliacao: lista pendencias, agrupa/mescla duplicatas, aprova movimento para `Transaction` real e rejeita movimentos sem impacto contabil.

Arquivos principais:

- `backend/src/controllers/BankMovementController.ts`
- `backend/src/services/BankMovementService.ts`
- `backend/src/repositories/BankMovementRepository.ts`
- `backend/src/services/FuzzyDeduplicationService.ts`
- `frontend/src/features/accountant/api/bankMovements.ts`
- `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx`
- `frontend/src/features/accountant/components/MovementCard.tsx`

### Listagem e inbox

🟢 **CONFIRMADO**: listagem por workspace (`GET /bank-movements`) exige `WorkspaceMiddleware`, filtra `status = PENDING`, pagina por cursor UUID e limite 1..100.

🟢 **CONFIRMADO**: listagem global do contador (`GET /accountant/bank-movements/pending`) usa `AuthMiddleware`, busca memberships `ACCOUNTANT` via `sysPrisma`, aplica `set_config('app.current_workspace_id', ...)` por tenant e unifica resultados em memoria.

🟢 **CONFIRMADO**: frontend `ApprovalInboxPage` usa endpoint global quando nao ha `workspaceId` na rota e endpoint por workspace quando ha `/accountant/inbox/:workspaceId`.

### Merge, approve e reject

🟢 **CONFIRMADO**: `merge` exige `keepId` igual ao parametro `:id`, `discardIds` nao vazio, todos os movimentos do mesmo workspace e todos `PENDING`.

🟢 **CONFIRMADO**: merge e atomico com isolation `Serializable`; grava payload consolidado no keepId, marca descartados como `MERGED` e deleta os descartados.

🟢 **CONFIRMADO**: `approve` e idempotente para movimento ja `APPROVED`, cria `Transaction` para `PENDING`, atualiza saldo, grava `AuditLogService.logSync` e marca o movimento como `APPROVED` com `updateMany` protegido por status.

🟢 **CONFIRMADO**: `approve` aplica guardiao `closedUntil`, com bypass apenas para `ACCOUNTANT` em workspace `BUSINESS`.

🟢 **CONFIRMADO**: `reject` exige movimento existente e `PENDING`, depois atualiza status para `REJECTED`.

### Deduplicacao fuzzy

🟢 **CONFIRMADO**: `FuzzyDeduplicationService` exclui valores abaixo de R$ 1,00, usa janela temporal de +/- 2 horas, filtra status `PENDING` e trabalha por workspace.

🟢 **CONFIRMADO**: modo preferencial usa `pg_trgm` com `similarity > 0.6`; modo fallback usa palavras significativas com `LOWER(description) LIKE` e similaridade de Jaccard por trigramas no app.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: a listagem global do contador depende de `sysPrisma` e set_config manual por tenant; nao foi executado teste runtime nesta etapa para provar isolamento em banco real.
- 🔴 **LACUNA**: a tela agrupa duplicatas client-side por valor/data em 2 horas, mas ignora similaridade textual; pode divergir do fuzzy do backend.
- 🔴 **LACUNA**: `approve` procura transacao existente por workspace/account/description/date no caso idempotente; se houver colisoes legitimas, a resposta de idempotencia pode ser ambigua.

## Modulo `accountant`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `accountant` concentra persona de contador, torre de comando, convites recebidos, inbox de aprovacao e cache multi-workspace de KPIs para login/restauracao de sessao.

Arquivos principais:

- `backend/src/services/AccountantCacheService.ts`
- `backend/src/repositories/AccountantCacheRepository.ts`
- `backend/src/services/AuthService.ts`
- `frontend/src/features/accountant/routes/AccountantHubPage.tsx`
- `frontend/src/features/accountant/routes/InviteInboxPage.tsx`
- `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx`
- `frontend/src/features/accountant/components/*`
- `frontend/src/app/AuthProvider.tsx`

### Cache do contador

🟢 **CONFIRMADO**: `AccountantCacheService.refreshCache` busca workspaces do usuario, processa em lotes de 5 e retorna erros por workspace sem falhar o lote inteiro.

🟢 **CONFIRMADO**: quando o contador nao tem memberships, o cache dele e apagado.

🟢 **CONFIRMADO**: `aggregateWorkspace` usa `sysPrisma.$transaction` com `set_config`, conta movimentos pendentes, transacoes sem anexo, soma saldo de contas incluidas no total e captura vencimento de certificado.

🟢 **CONFIRMADO**: `AccountantCacheRepository.upsertCache` usa chave unica `userId_workspaceId`.

### Hub e inbox

🟢 **CONFIRMADO**: `AuthService.authenticate` e `/auth/me` retornam `dashboardCache` para usuario `ACCOUNTANT`; `AuthProvider` persiste em `wsp_dashboard_cache`.

🟢 **CONFIRMADO**: `AccountantHubPage` limpa workspace ativo ao entrar, filtra memberships `ACCOUNTANT`, calcula pendencias por `pendingMovements + missingAttachments` e alertas por `cashRiskAlert`.

🟢 **CONFIRMADO**: contador acessa cliente por `/:workspaceId/dashboard`, documentos por `/:workspaceId/documents`, inbox global por `/accountant/inbox` e inbox de cliente por `/accountant/inbox/:workspaceId`.

🟢 **CONFIRMADO**: `InviteInboxPage` usa `useInvites` para listar, aceitar e rejeitar convites recebidos.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: `AccountantHubPage` contem `mockEvents` no feed lateral; a atividade exibida nao vem de backend neste trecho.
- 🔴 **LACUNA**: o cache so remove entradas obsoletas quando nao ha erros; falhas parciais mantem caches antigos para outros workspaces.
- 🔴 **LACUNA**: esta fase leu testes de cache/hub/certificado por nome, mas nao executou Vitest/Playwright.

## Modulo `external-data`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `external-data` fornece autocomplete de CNPJ e CEP para criacao de workspace, usando BrasilAPI como primaria e ReceitaWS/ViaCEP como fallback.

Arquivos principais:

- `backend/src/controllers/ExternalDataController.ts`
- `backend/src/infra/external/ExternalDataService.ts`
- `backend/src/infra/external/BrasilApiClient.ts`
- `backend/src/infra/external/ReceitaWsClient.ts`
- `backend/src/infra/external/ViaCepClient.ts`
- `frontend/src/features/workspaces/hooks/useExternalData.ts`
- `frontend/src/features/workspaces/components/CreateWorkspaceForm.tsx`

### Consulta e fallback

🟢 **CONFIRMADO**: `GET /external/document/:cnpj` valida minimo de 14 caracteres e chama `ExternalDataService.fetchCnpj`.

🟢 **CONFIRMADO**: `GET /external/location/:cep` valida minimo de 8 caracteres e chama `ExternalDataService.fetchCep`.

🟢 **CONFIRMADO**: `ExternalDataService` usa `node-cache` com TTL de 24 horas e `opossum` com timeout de 5 segundos, threshold de 50% e reset de 30 segundos.

🟢 **CONFIRMADO**: CEP tenta BrasilAPI e cai para ViaCEP; CNPJ tenta BrasilAPI e cai para ReceitaWS.

🟢 **CONFIRMADO**: CNPJ e mascarado nos logs por `maskCnpj`, preservando apenas trecho intermediario.

🟢 **CONFIRMADO**: `CreateWorkspaceForm` dispara CNPJ no blur quando documento tem 14 digitos e CEP no blur quando tem 8 digitos, preenchendo nome, CNAE e endereco.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: rotas externas nao usam `AuthMiddleware`; qualquer cliente que alcance a API pode acionar consultas externas.
- 🔴 **LACUNA**: controller retorna status 500 para erros de validacao Zod e indisponibilidade externa, sem distinguir bad request de falha de provider.
- 🔴 **LACUNA**: `useExternalLocation` tipa resposta como `LocationResponse`, mas backend retorna `{ address, metadata }`; o formulario espera campos na raiz (`data.street`, `data.city`), potencial divergencia de contrato.

## Modulo `frontend-shell`

### Escopo e responsabilidade

🟢 **CONFIRMADO**: `frontend-shell` organiza bootstrap React, providers globais, roteamento, lazy loading, autenticacao, workspace ativo, interceptors Axios, layouts e guardas de navegacao.

Arquivos principais:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app/AuthProvider.tsx`
- `frontend/src/shared/lib/axios.ts`
- `frontend/src/shared/lib/react-query.ts`
- `frontend/src/shared/stores/useWorkspaceStore.ts`
- `frontend/src/shared/components/guards/WorkspaceGuard.tsx`
- `frontend/src/shared/components/layout/AppLayout.tsx`
- `frontend/src/config/env.ts`
- `frontend/src/config/queryKeys.ts`

### Bootstrap e rotas

🟢 **CONFIRMADO**: `main.tsx` monta `QueryClientProvider`, `ToastProvider`, `AuthProvider`, `WorkspaceProvider` e `App`.

🟢 **CONFIRMADO**: `App.tsx` usa `React.lazy` e `Suspense` para paginas auth, contador, workspace, dashboard, transacoes, documentos e team settings.

🟢 **CONFIRMADO**: `PrivateRoute` bloqueia rotas privadas quando `useAuth().isAuthenticated` e falso, redirecionando para `/login`.

🟢 **CONFIRMADO**: `WorkspaceGuard` sincroniza `workspaceId` da URL com Zustand e `WorkspaceProvider`, redireciona contador sem contexto para `/accountant/hub` e bloqueia contador em workspace `PERSONAL`.

### Axios, sessao e query

🟢 **CONFIRMADO**: `axios.ts` guarda access token em memoria, injeta `Authorization` quando presente e deriva `x-workspace-id` da URL; em `/accountant/inbox/:workspaceId`, usa o quarto segmento da rota.

🟢 **CONFIRMADO**: 401 dispara refresh token com fila (`failedQueue`) para evitar refresh concorrente; refresh token fica em `localStorage` como `wsp_refresh_token`.

🟢 **CONFIRMADO**: 403 dispara `useWorkspaceStore.getState().setForbidden(true)`.

🟢 **CONFIRMADO**: `react-query.ts` define `retry: 1`, `staleTime` de 5 minutos e `refetchOnWindowFocus: false`.

🟢 **CONFIRMADO**: `queryKeys.ts` padroniza chaves por workspace para transacoes, dashboard e bank movements.

### Layout

🟢 **CONFIRMADO**: `AppLayout` alterna navegacao de cliente e contador por persona, exibe `AuditBanner` quando permitido e carrega `TransactionModal` sob demanda.

### Lacunas e pontos de atencao

- 🔴 **LACUNA**: `accessToken` fica apenas em memoria; apos reload a restauracao depende de refresh token local e chamada `/auth/me`.
- 🔴 **LACUNA**: `WorkspaceGuard` usa casts temporarios (`as any`) para memberships, indicando contrato frontend ainda nao totalmente unificado.
- 🔴 **LACUNA**: estado `isForbidden` e setado no store, mas esta fase nao confirmou uma tela/fluxo final de exibicao para esse estado.
