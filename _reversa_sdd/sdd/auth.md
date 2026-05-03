# SDD - Auth

## Visão Geral

🟢 **CONFIRMADO**: o componente `auth` implementa registro, autenticação, verificação de e-mail, rotação de refresh token, restauração de sessão e recuperação de senha.

🟢 **CONFIRMADO**: o componente também entrega ao frontend o snapshot de usuário com memberships e, para usuários `ACCOUNTANT`, o `dashboardCache`.

🟡 **INFERIDO**: o objetivo operacional é impedir uso de conta antes do opt-in de e-mail e manter sessões curtas por access token com renovação controlada.

## Responsabilidades

- 🟢 **CONFIRMADO**: validar payloads HTTP de autenticação com Zod em controllers.
- 🟢 **CONFIRMADO**: criar usuário, workspace pessoal e membership `OWNER` no registro.
- 🟢 **CONFIRMADO**: gerar hash de senha com `bcrypt.hash(password, 8)`.
- 🟢 **CONFIRMADO**: bloquear login quando `emailVerifiedAt` está vazio.
- 🟢 **CONFIRMADO**: emitir JWT de acesso com expiração de 15 minutos.
- 🟢 **CONFIRMADO**: persistir refresh token com validade de 30 dias.
- 🟢 **CONFIRMADO**: rotacionar refresh token a cada uso.
- 🟢 **CONFIRMADO**: gerar e validar códigos de verificação e reset de senha.
- 🟢 **CONFIRMADO**: invalidar refresh tokens após reset de senha.
- 🟢 **CONFIRMADO**: restaurar sessão no frontend com `wsp_refresh_token`.
- 🟢 **CONFIRMADO**: serializar refresh concorrente no Axios via fila.

## Interface

### Rotas HTTP

| Método | Rota | Entrada | Saída | Confiança |
|---|---|---|---|---|
| `POST` | `/auth/register` | `name`, `email`, `password`, `type?` | usuário sem tokens + mensagem | 🟢 |
| `POST` | `/auth/session` | `email`, `password` | `user`, `token`, `refreshToken`, `dashboardCache?` | 🟢 |
| `PATCH` | `/auth/refresh` | `refreshToken` | novo `token` e novo `refreshToken` | 🟢 |
| `GET` | `/auth/me` | Bearer JWT | usuário autenticado + memberships + `dashboardCache?` | 🟢 |
| `POST` | `/auth/verify` | `email`, `code` | confirmação sem payload relevante | 🟢 |
| `POST` | `/auth/resend-verification` | `email` | confirmação silenciosa ou erro de conta já verificada | 🟢 |
| `POST` | `/password/forgot` | `email` | resposta silenciosa | 🟢 |
| `POST` | `/password/reset` | `email`, `code`, `newPassword` | confirmação de reset | 🟢 |

### Tipos Persistidos

| Entidade | Campos principais | Confiança |
|---|---|---|
| `User` | `id`, `email`, `name`, `passwordHash`, `emailVerifiedAt`, `type` | 🟢 |
| `RefreshToken` | `id`, `userId`, `expiresIn`, `createdAt` | 🟢 |
| `AccountVerificationToken` | `id`, `code`, `userId`, `expiresAt` | 🟢 |
| `PasswordResetToken` | `id`, `code`, `userId`, `expiresAt`, `used` | 🟢 |
| `WorkspaceMember` | `userId`, `workspaceId`, `role` | 🟢 |

### Interface Frontend

| Item | Responsabilidade | Confiança |
|---|---|---|
| `AuthProvider` | mantém `user`, `dashboardCache`, `isAuthenticated`, `isLoading` | 🟢 |
| `setApiToken` | grava access token em memória do módulo Axios | 🟢 |
| `localStorage.wsp_refresh_token` | guarda refresh token para restauração | 🟢 |
| `localStorage.wsp_user_info` | guarda snapshot serializado do usuário | 🟢 |
| `localStorage.wsp_dashboard_cache` | guarda cache de contador quando presente | 🟢 |

## Regras de Negócio

- 🟢 **CONFIRMADO**: registro exige `name` com mínimo de 3 caracteres.
- 🟢 **CONFIRMADO**: registro exige e-mail válido.
- 🟢 **CONFIRMADO**: registro exige senha com mínimo de 6 caracteres.
- 🟢 **CONFIRMADO**: `type` aceita `CLIENT` ou `ACCOUNTANT` e usa `CLIENT` como padrão.
- 🟢 **CONFIRMADO**: e-mail duplicado bloqueia registro com `User already exists`.
- 🟢 **CONFIRMADO**: registro cria usuário, workspace pessoal e membership `OWNER` em transação.
- 🟢 **CONFIRMADO**: registro envia código de verificação e não retorna tokens de sessão.
- 🟢 **CONFIRMADO**: login de conta não verificada é bloqueado com `Email not verified`.
- 🟢 **CONFIRMADO**: credenciais inválidas retornam erro genérico `Invalid credentials`.
- 🟢 **CONFIRMADO**: access token expira em 15 minutos.
- 🟢 **CONFIRMADO**: refresh token expira em 30 dias.
- 🟢 **CONFIRMADO**: refresh token usado é apagado e substituído por outro.
- 🟢 **CONFIRMADO**: refresh token expirado é apagado e rejeitado.
- 🟢 **CONFIRMADO**: código de verificação de conta tem 6 dígitos e expira em 24 horas.
- 🟢 **CONFIRMADO**: verificação de conta já verificada retorna sucesso silencioso.
- 🟢 **CONFIRMADO**: resend de verificação não revela e-mail inexistente.
- 🟢 **CONFIRMADO**: código de reset de senha tem 6 dígitos e expira em 15 minutos.
- 🟢 **CONFIRMADO**: forgot password não revela e-mail inexistente.
- 🟢 **CONFIRMADO**: reset de senha marca token como usado e remove todos os refresh tokens do usuário.
- 🟢 **CONFIRMADO**: usuário `ACCOUNTANT` recebe `dashboardCache` no login e em `/auth/me`.
- 🔴 **LACUNA**: `JWT_SECRET` possui fallback hardcoded; esta spec não comprova política de variável obrigatória em produção.
- 🔴 **LACUNA**: OTP usa `Math.random`; esta spec não comprova requisito criptográfico forte.
- 🔴 **LACUNA**: provider Ethereal é usado no código analisado; esta spec não comprova provider de e-mail produtivo.

## Fluxo Principal

### Registro e Verificação

1. 🟢 **CONFIRMADO**: usuário envia `name`, `email`, `password` e `type?` para `/auth/register`.
2. 🟢 **CONFIRMADO**: controller valida o payload com Zod.
3. 🟢 **CONFIRMADO**: service rejeita e-mail duplicado.
4. 🟢 **CONFIRMADO**: service cria hash da senha.
5. 🟢 **CONFIRMADO**: repository cria usuário, workspace pessoal e membership `OWNER`.
6. 🟢 **CONFIRMADO**: `VerificationService` gera código de 6 dígitos e persiste `AccountVerificationToken`.
7. 🟢 **CONFIRMADO**: usuário confirma código em `/auth/verify`.
8. 🟢 **CONFIRMADO**: service preenche `emailVerifiedAt` e remove token usado.

### Login e Sessão

1. 🟢 **CONFIRMADO**: usuário envia `email` e `password` para `/auth/session`.
2. 🟢 **CONFIRMADO**: service busca usuário com memberships.
3. 🟢 **CONFIRMADO**: service bloqueia conta não verificada.
4. 🟢 **CONFIRMADO**: service compara senha via bcrypt.
5. 🟢 **CONFIRMADO**: service gera access token e refresh token.
6. 🟢 **CONFIRMADO**: frontend salva refresh token e usuário em `localStorage`, e access token em memória.
7. 🟢 **CONFIRMADO**: usuário autenticado entra nas rotas privadas.

### Refresh e Restauração

1. 🟢 **CONFIRMADO**: `AuthProvider` lê `wsp_refresh_token`.
2. 🟢 **CONFIRMADO**: frontend chama `PATCH /auth/refresh`.
3. 🟢 **CONFIRMADO**: backend apaga refresh token usado e retorna novo par de tokens.
4. 🟢 **CONFIRMADO**: frontend injeta o novo access token no Axios.
5. 🟢 **CONFIRMADO**: frontend chama `/auth/me` e restaura usuário/cache.

## Fluxos Alternativos

- 🟢 **CONFIRMADO**: se login retornar `403` ou mensagem `not verified`, `LoginForm` redireciona para `/verify`.
- 🟢 **CONFIRMADO**: se `VerifyForm` não receber e-mail por `location.state`, mostra erro e link para login.
- 🟢 **CONFIRMADO**: se várias requests recebem `401` durante refresh, Axios coloca requests em `failedQueue` e reexecuta após novo token.
- 🟢 **CONFIRMADO**: se refresh falhar sem token local, frontend limpa token e redireciona para `/login`.
- 🟢 **CONFIRMADO**: se contador tem cache parcial/obsoleto, `AuthService.loadAccountantCache` executa refresh síncrono e relê o cache.
- 🟢 **CONFIRMADO**: se contador já tem cache completo, refresh em background não bloqueia login.

## Dependências

- 🟢 **CONFIRMADO**: `bcryptjs` é usado para hash e comparação de senha.
- 🟢 **CONFIRMADO**: `jsonwebtoken` é usado para JWT.
- 🟢 **CONFIRMADO**: `zod` é usado para validação de entrada.
- 🟢 **CONFIRMADO**: Prisma persiste `User`, tokens e memberships.
- 🟢 **CONFIRMADO**: provider de e-mail envia códigos de verificação e reset.
- 🟢 **CONFIRMADO**: `AccountantCacheService` fornece cache para usuário contador.
- 🟢 **CONFIRMADO**: Axios faz refresh automático e injeta Bearer token.
- 🟢 **CONFIRMADO**: React Router transporta e-mail entre telas de auth por `location.state`.

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|---|---|---|---|
| Segurança | Senha deve ser armazenada como hash, não texto puro. | `backend/src/services/AuthService.ts` usa `bcrypt.hash(password, 8)` | 🟢 |
| Segurança | Login deve exigir e-mail verificado. | `AuthService.authenticate` verifica `emailVerifiedAt` | 🟢 |
| Segurança | Access token deve ter vida curta. | `AuthService.generateAccessToken` expira em 15 minutos | 🟢 |
| Segurança | Refresh token deve ser rotacionado. | `AuthService.refreshToken` apaga token usado e cria novo | 🟢 |
| Segurança | Reset de senha deve invalidar sessões existentes. | `PasswordResetService.executeResetPassword` remove refresh tokens | 🟢 |
| Privacidade | Forgot/resend não deve enumerar contas inexistentes. | `PasswordResetService` e `VerificationService` retornam silenciosamente | 🟢 |
| Disponibilidade | Refresh concorrente deve evitar múltiplas chamadas simultâneas. | `failedQueue` em `frontend/src/shared/lib/axios.ts` | 🟢 |
| Performance | Login de contador não deve recalcular cache completo se cache está completo. | `AuthService.loadAccountantCache` usa cache e refresh em background | 🟢 |

## Critérios de Aceitação

```gherkin
Dado um visitante com nome válido, e-mail novo e senha válida
Quando ele cria uma conta CLIENT em /auth/register
Então o sistema cria User, Workspace PERSONAL, WorkspaceMember OWNER e envia código de verificação

Dado uma conta registrada sem emailVerifiedAt
Quando o usuário tenta autenticar em /auth/session
Então o sistema rejeita o login com erro de e-mail não verificado

Dado uma conta verificada com senha correta
Quando o usuário autentica em /auth/session
Então o sistema retorna user, token e refreshToken

Dado um refresh token válido
Quando o frontend chama PATCH /auth/refresh
Então o backend apaga o refresh token usado e retorna novo access token e novo refresh token

Dado um refresh token expirado
Quando o frontend chama PATCH /auth/refresh
Então o backend remove o token expirado e rejeita a renovação

Dado um usuário que esqueceu a senha
Quando ele solicita /password/forgot com e-mail existente
Então o sistema cria um código de 6 dígitos com expiração de 15 minutos e envia e-mail

Dado um usuário que redefiniu a senha com código válido
Quando o reset é concluído
Então o sistema marca o token como usado e invalida todos os refresh tokens do usuário

Dado múltiplas requests recebendo 401 durante uma renovação
Quando o primeiro refresh ainda está em andamento
Então as demais requests aguardam na fila e são reexecutadas com o novo token
```

## Cenários de Borda

| Cenário | Comportamento Esperado | Confiança |
|---|---|---|
| E-mail inexistente em forgot password | Resposta silenciosa sem revelar existência da conta. | 🟢 |
| E-mail inexistente em resend verification | Resposta silenciosa sem revelar existência da conta. | 🟢 |
| Conta já verificada em `/auth/verify` | Retorna sucesso sem erro. | 🟢 |
| Conta já verificada em resend | Lança `Account already verified`. | 🟢 |
| Cache de contador incompleto após refresh síncrono | Lança erro de cache incompleto. | 🟢 |
| Refresh token ausente no frontend | Limpa sessão e redireciona para login. | 🟢 |
| `JWT_SECRET` ausente | Usa fallback hardcoded. | 🔴 |
| OTP gerado por `Math.random` | Funciona, mas força criptográfica não foi comprovada. | 🔴 |

## Prioridade

| Requisito | MoSCoW | Justificativa | Confiança |
|---|---|---|---|
| Registro com workspace pessoal | Must | Base de todo uso multi-workspace. | 🟢 |
| Verificação de e-mail antes do login | Must | Bloqueia sessão antes do opt-in. | 🟢 |
| Login e emissão de tokens | Must | Caminho crítico de acesso ao produto. | 🟢 |
| Refresh token rotacionado | Must | Sustenta sessão com access token curto. | 🟢 |
| AuthMiddleware | Must | Protege rotas privadas. | 🟢 |
| Reset de senha com invalidação de sessões | Must | Segurança de recuperação. | 🟢 |
| Dashboard cache para contador no login | Should | Importante para persona contador, mas módulo pode autenticar sem cache se usuário não for contador. | 🟢 |
| Resend verification | Should | Necessário para recuperação de onboarding. | 🟢 |
| Persistência local de dashboard cache | Could | Melhora experiência, mas pode ser refeito via `/auth/me`. | 🟢 |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---|---|---|
| `backend/src/controllers/AuthController.ts` | `register`, `authenticate`, `refresh`, `me` | 🟢 |
| `backend/src/services/AuthService.ts` | `register`, `authenticate`, `refreshToken`, `getMe`, `loadAccountantCache` | 🟢 |
| `backend/src/controllers/VerificationController.ts` | `verify`, `resend` | 🟢 |
| `backend/src/services/VerificationService.ts` | `sendVerificationCode`, `verifyAccount`, `resendVerification` | 🟢 |
| `backend/src/controllers/PasswordResetController.ts` | `forgotPassword`, `resetPassword` | 🟢 |
| `backend/src/services/PasswordResetService.ts` | `executeForgotPassword`, `executeResetPassword` | 🟢 |
| `backend/src/repositories/UserRepository.ts` | `createWithWorkspace`, `findByEmail`, `markEmailAsVerified` | 🟢 |
| `backend/src/middlewares/AuthMiddleware.ts` | `AuthMiddleware` | 🟢 |
| `frontend/src/app/AuthProvider.tsx` | `restoreSessionSnapshot`, `login`, `logout` | 🟢 |
| `frontend/src/shared/lib/axios.ts` | request/response interceptors, refresh queue | 🟢 |
| `frontend/src/features/auth/types/index.ts` | schemas e tipos de auth | 🟢 |
| `frontend/src/features/auth/hooks/useLogin.ts` | login mutation | 🟢 |
| `frontend/src/features/auth/hooks/useRegister.ts` | register mutation | 🟢 |
| `frontend/src/features/auth/hooks/useVerify.ts` | verify/resend mutations | 🟢 |
| `frontend/src/features/auth/hooks/usePasswordRecovery.ts` | forgot/reset mutations | 🟢 |
| `backend/tests/services/AuthService.test.ts` | cache de contador e auth service | 🟢 |
| `frontend/tests/app/AuthRestore.integration.test.tsx` | restauração de sessão | 🟢 |
