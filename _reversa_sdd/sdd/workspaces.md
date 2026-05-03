# SDD - Workspaces

## Visão Geral

[CONFIRMADO] O componente `workspaces` implementa o contexto multi-tenant central do WSP Finance: criação e edição de workspaces, associação de usuários por membership, seleção de workspace ativo no frontend, gestão de membros/convites e upload seguro de certificado A1.

[CONFIRMADO] Um workspace pode representar um contexto `PERSONAL` ou `BUSINESS`. O acesso operacional depende de `WorkspaceMember`, do header `x-workspace-id` e de validações complementares de RBAC.

[INFERIDO] O objetivo arquitetural é fazer do workspace a fronteira primária de isolamento de dados, permissões e contexto fiscal/contábil.

## Responsabilidades

- [CONFIRMADO] Criar workspace com membership `OWNER` para o usuário solicitante.
- [CONFIRMADO] Listar apenas workspaces nos quais o usuário possui membership.
- [CONFIRMADO] Editar nome e tipo de workspace quando o usuário é `OWNER`.
- [CONFIRMADO] Restaurar e sincronizar workspace ativo no frontend.
- [CONFIRMADO] Exigir `x-workspace-id` em rotas escopadas por workspace.
- [CONFIRMADO] Bloquear acesso sem membership.
- [CONFIRMADO] Bloquear usuário com role `ACCOUNTANT` acessando workspace `PERSONAL`.
- [CONFIRMADO] Executar rotas escopadas dentro de `tenantContext`.
- [CONFIRMADO] Criar, listar, revogar, aceitar e rejeitar convites.
- [CONFIRMADO] Remover membros com proteção contra auto-remoção.
- [CONFIRMADO] Receber certificado A1 `.pfx`/`.p12`, validar senha/validade e armazenar em vault S3/R2 com SSE-C.
- [CONFIRMADO] Atualizar validade do certificado no workspace e propagar refresh best effort do cache de contadores.

## Interface

### Rotas HTTP

| Método | Rota | Entrada | Saída | Confiança |
|---|---|---|---|---|
| `GET` | `/workspaces` | Bearer JWT | lista de workspaces por membership | CONFIRMADO |
| `POST` | `/workspaces` | `name`, `type?`, `fiscalIdentity?`, `address?` | workspace criado | CONFIRMADO |
| `PUT` | `/workspaces/:id` | `name`, `type` | workspace atualizado | CONFIRMADO |
| `POST` | `/workspaces/:id/certificate-a1` | multipart `certificate`, `password` | validade/status do certificado | CONFIRMADO |
| `GET` | `/workspaces/:id/members` | `x-workspace-id` | membros do workspace | CONFIRMADO |
| `DELETE` | `/workspaces/:id/members/:userId` | `x-workspace-id` | remoção do membro | CONFIRMADO |
| `POST` | `/workspaces/:id/invites` | `email`, `role` | convite criado | CONFIRMADO |
| `GET` | `/workspaces/:id/invites` | `x-workspace-id` | convites enviados | CONFIRMADO |
| `POST` | `/workspaces/:id/invites/:inviteId/revoke` | `x-workspace-id` | convite revogado | CONFIRMADO |
| `GET` | `/invites/received` | Bearer JWT | convites recebidos pelo e-mail do usuário | CONFIRMADO |
| `POST` | `/invites/accept` | `token` | membership criado e convite aceito | CONFIRMADO |
| `POST` | `/invites/:id/reject` | invite id | convite rejeitado | CONFIRMADO |

### Tipos Persistidos

| Entidade | Campos principais | Confiança |
|---|---|---|
| `Workspace` | `id`, `name`, `type`, `closedUntil`, `taxRate`, `certificateObjectKey`, `certificateExpiresAt`, `fiscalIdentity`, `address` | CONFIRMADO |
| `WorkspaceMember` | `userId`, `workspaceId`, `role` | CONFIRMADO |
| `WorkspaceInvite` | `id`, `workspaceId`, `email`, `role`, `token`, `status`, `expiresAt` | CONFIRMADO |
| `User` | `id`, `email`, `type` | CONFIRMADO |

### Interface Frontend

| Item | Responsabilidade | Confiança |
|---|---|---|
| `WorkspaceProvider` | deriva workspaces de `user.memberships` e escolhe workspace ativo | CONFIRMADO |
| `useWorkspaceStore` | persiste `activeWorkspaceId` em `localStorage` | CONFIRMADO |
| `CreateWorkspaceForm` | cria workspace e aciona autocomplete de CNPJ/CEP | CONFIRMADO |
| `TeamSettingsPage` | lista membros, convites e habilita convite para `OWNER` | CONFIRMADO |
| `CertificateUploadSection` | valida extensão, envia multipart e exibe validade/status | CONFIRMADO |
| Axios interceptor | injeta `x-workspace-id` a partir da URL em rotas escopadas | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Workspace criado diretamente pelo usuário gera membership `OWNER` para o próprio usuário.
- [CONFIRMADO] `WorkspaceService.create` exige `payload.name`.
- [CONFIRMADO] `WorkspaceController.create` valida `name`, `type`, `fiscalIdentity` e `address` com Zod.
- [CONFIRMADO] `type` usa `WorkspaceType` e tem default `PERSONAL` no backend.
- [CONFIRMADO] `CreateWorkspaceForm` usa default visual `BUSINESS` com `documentType: CNPJ`.
- [CONFIRMADO] Para workspace `BUSINESS` com CNAE, o serviço remove caracteres não numéricos e infere `taxRate`.
- [CONFIRMADO] CNAE iniciado por `620`, `6911` ou `7112` define `taxRate = 6.00`.
- [CONFIRMADO] CNAE iniciado por `5320` define `taxRate = 0.00`.
- [CONFIRMADO] Demais CNAEs mantêm `taxRate = 0.00`.
- [CONFIRMADO] Listagem de workspaces é baseada em membership do usuário.
- [CONFIRMADO] Edição de workspace exige membership `OWNER`.
- [CONFIRMADO] Embora o schema de update tenha `name` e `type` opcionais, o controller exige ambos antes de chamar o service.
- [CONFIRMADO] Rotas com `WorkspaceMiddleware` exigem header `x-workspace-id`.
- [CONFIRMADO] `x-workspace-id` inválido ou ausente gera erro antes do service.
- [CONFIRMADO] Usuário autenticado sem membership no workspace recebe `403`.
- [CONFIRMADO] `ACCOUNTANT` não pode acessar workspace `PERSONAL`.
- [CONFIRMADO] `RbacMiddleware` usa hierarquia `VIEWER=1`, `EDITOR=2`, `ACCOUNTANT=2.5`, `OWNER=3`.
- [CONFIRMADO] Apenas `OWNER` cria convite.
- [CONFIRMADO] Convite para usuário que já é membro é bloqueado.
- [CONFIRMADO] Convite `PENDING` duplicado para o mesmo e-mail/workspace é bloqueado.
- [CONFIRMADO] Convite usa token criptográfico de 32 bytes em hexadecimal.
- [CONFIRMADO] Convite expira em 7 dias.
- [CONFIRMADO] Aceite de convite exige que o e-mail do usuário logado seja igual ao e-mail convidado.
- [CONFIRMADO] Role aplicada no aceite vem do convite persistido, não do request de aceite.
- [CONFIRMADO] Convite expirado é marcado como `EXPIRED`.
- [CONFIRMADO] Rejeição de convite também exige correspondência entre usuário logado e e-mail convidado.
- [CONFIRMADO] Remoção de membro exige requester `OWNER`.
- [CONFIRMADO] Auto-remoção é bloqueada.
- [CONFIRMADO] Upload A1 exige extensão `.pfx` ou `.p12`.
- [CONFIRMADO] Upload A1 exige arquivo em memória e senha.
- [CONFIRMADO] Rota de certificado encadeia `AuthMiddleware`, `WorkspaceMiddleware`, `RbacMiddleware('OWNER')`, `multer.memoryStorage()` e filtro de extensão.
- [CONFIRMADO] `WorkspaceService.uploadCertificate` exige que `params.id` seja igual a `req.workspaceId`.
- [CONFIRMADO] Certificado é parseado para extrair `notAfter`.
- [CONFIRMADO] Storage seguro de certificado exige `VAULT_MASTER_KEY` com pelo menos 32 caracteres.
- [CONFIRMADO] Certificado novo só substitui o antigo após persistência bem-sucedida do novo object key.
- [CONFIRMADO] Falha no refresh do cache de contador após upload é best effort e não reverte o upload.
- [LACUNA] A rota de certificado está restrita a `OWNER`, enquanto a decisão de produto sobre contador gerenciar certificado ainda precisa ficar explícita.

## Fluxo Principal

### Criação de Workspace

1. [CONFIRMADO] Usuário autenticado envia `POST /workspaces`.
2. [CONFIRMADO] `WorkspaceController.create` valida payload com Zod.
3. [CONFIRMADO] `WorkspaceService.create` confirma que `name` existe.
4. [CONFIRMADO] Se `type` é `BUSINESS` e há CNAE, o serviço limpa o CNAE e infere `taxRate`.
5. [CONFIRMADO] Prisma abre transação.
6. [CONFIRMADO] Transação cria `Workspace`.
7. [CONFIRMADO] Transação cria `WorkspaceMember` com role `OWNER`.
8. [CONFIRMADO] Backend retorna workspace criado.

### Seleção e Uso de Workspace

1. [CONFIRMADO] Login ou `/auth/me` retorna memberships do usuário.
2. [CONFIRMADO] `WorkspaceProvider` deriva a lista de workspaces a partir de `user.memberships`.
3. [CONFIRMADO] Frontend tenta restaurar workspace ativo salvo.
4. [CONFIRMADO] Se o workspace salvo não existe mais nos memberships, o primeiro workspace disponível é selecionado.
5. [CONFIRMADO] Rotas com workspace na URL sincronizam `activeWorkspaceId`.
6. [CONFIRMADO] Axios injeta `x-workspace-id` em chamadas escopadas.
7. [CONFIRMADO] Backend valida membership e executa service dentro de `tenantContext`.

### Convite e Associação de Membro

1. [CONFIRMADO] `OWNER` envia convite com e-mail e role.
2. [CONFIRMADO] Service valida que o solicitante é `OWNER`.
3. [CONFIRMADO] Service bloqueia alvo já membro.
4. [CONFIRMADO] Service bloqueia convite pendente duplicado.
5. [CONFIRMADO] Service cria token e expiração de 7 dias.
6. [CONFIRMADO] Usuário convidado autentica e aceita usando token.
7. [CONFIRMADO] Service valida status, expiração e e-mail do usuário logado.
8. [CONFIRMADO] Transação cria `WorkspaceMember` e marca convite como `ACCEPTED`.

### Upload de Certificado A1

1. [CONFIRMADO] Frontend seleciona arquivo `.pfx` ou `.p12` e senha.
2. [CONFIRMADO] Frontend envia `FormData` com `certificate` e `password`.
3. [CONFIRMADO] Backend autentica usuário, valida workspace e exige `OWNER`.
4. [CONFIRMADO] Multer mantém arquivo em memória.
5. [CONFIRMADO] Controller exige buffer e senha.
6. [CONFIRMADO] Service valida que o workspace da URL é o mesmo do contexto de request.
7. [CONFIRMADO] `CertificateService` abre PFX/P12 e extrai validade.
8. [CONFIRMADO] `S3StorageProvider.uploadSecureBuffer` grava no vault com SSE-C.
9. [CONFIRMADO] Service persiste `certificateObjectKey` e `certificateExpiresAt`.
10. [CONFIRMADO] Cache de contador é atualizado em best effort.
11. [CONFIRMADO] Certificado antigo é removido em best effort depois da persistência do novo.

## Fluxos Alternativos

- [CONFIRMADO] Se `x-workspace-id` está ausente, `WorkspaceMiddleware` retorna `400 Workspace ID header required`.
- [CONFIRMADO] Se `x-workspace-id` não é número, retorna `400 Workspace ID must be a number`.
- [CONFIRMADO] Se `req.user.id` não existe, retorna `401 User authentication required`.
- [CONFIRMADO] Se membership não existe, retorna `403 Access denied`.
- [CONFIRMADO] Se role `ACCOUNTANT` tenta acessar workspace `PERSONAL`, retorna `403 Accountants cannot access personal workspaces` e registra warning `[ZERO TRUST BLOCK]`.
- [CONFIRMADO] Se update não recebe `name` e `type`, retorna `400 Name and Type are required for update`.
- [CONFIRMADO] Se convite já foi revogado, aceito ou expirado, aceite é bloqueado.
- [CONFIRMADO] Se convite expirou, status é atualizado para `EXPIRED`.
- [CONFIRMADO] Se e-mail do usuário logado diverge do convite, aceite/rejeição é bloqueado.
- [CONFIRMADO] Se membro alvo não existe, remoção retorna erro lógico de não encontrado.
- [CONFIRMADO] Se certificado ou senha estão ausentes, upload retorna `400`.
- [CONFIRMADO] Se o certificado/senha são inválidos, upload retorna erro de validação do certificado.
- [CONFIRMADO] Se persistência do novo certificado falha após upload, o novo objeto é apagado e o erro é relançado.

## Dependências

- [CONFIRMADO] Prisma persiste `Workspace`, `WorkspaceMember` e `WorkspaceInvite`.
- [CONFIRMADO] Zod valida payloads HTTP.
- [CONFIRMADO] `AuthMiddleware` injeta `req.user.id`.
- [CONFIRMADO] `WorkspaceMiddleware` injeta `req.workspaceId` e aciona `tenantContext`.
- [CONFIRMADO] `RbacMiddleware` aplica hierarquia de roles.
- [CONFIRMADO] `crypto.randomBytes` gera token de convite.
- [CONFIRMADO] `multer.memoryStorage` recebe certificado A1 em memória.
- [CONFIRMADO] `node-forge` abre PFX/P12 e extrai validade.
- [CONFIRMADO] `S3StorageProvider` grava certificado em storage compatível com S3/R2.
- [CONFIRMADO] `VAULT_MASTER_KEY` é usada para SSE-C no storage seguro.
- [CONFIRMADO] `AccountantCacheService` é atualizado em best effort após troca de certificado.
- [CONFIRMADO] React Query executa mutations e invalida/cacheia dados no frontend.
- [CONFIRMADO] Zustand/localStorage persistem `activeWorkspaceId`.
- [CONFIRMADO] Serviços externos CNPJ/CEP alimentam defaults de criação de workspace empresarial.

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|---|---|---|---|
| Segurança | Toda rota escopada por workspace deve validar membership antes do service. | `WorkspaceMiddleware` | CONFIRMADO |
| Segurança | Contador não deve acessar workspace pessoal. | `WorkspaceMiddleware`, `WorkspaceGuard` | CONFIRMADO |
| Segurança | Ações de administração de equipe devem exigir `OWNER`. | `InviteService`, `TeamSettingsPage` | CONFIRMADO |
| Segurança | Upload de certificado deve aceitar somente `.pfx`/`.p12`. | `routes.ts`, `CertificateUploadSection` | CONFIRMADO |
| Segurança | Certificado A1 não deve ser armazenado em disco local pelo fluxo principal. | `multer.memoryStorage`, `uploadSecureBuffer` | CONFIRMADO |
| Segurança | Certificado A1 deve usar vault com chave derivada de `VAULT_MASTER_KEY`. | `S3StorageProvider.uploadSecureBuffer` | CONFIRMADO |
| Consistência | Criação de workspace e membership inicial deve ser atômica. | transação Prisma em `WorkspaceService.create` | CONFIRMADO |
| Consistência | Aceite de convite deve criar membership e mudar status em uma transação. | `InviteService.acceptInvite` | CONFIRMADO |
| Integridade | Certificado antigo só deve ser removido depois que o novo foi persistido. | `WorkspaceService.uploadCertificate` | CONFIRMADO |
| Usabilidade | Workspace ativo deve sobreviver a reload quando ainda pertence ao usuário. | `WorkspaceProvider`, `useWorkspaceStore` | CONFIRMADO |
| Observabilidade | Bloqueio zero-trust de contador em workspace pessoal deve ser logado. | `[ZERO TRUST BLOCK]` no middleware | CONFIRMADO |

## Critérios de Aceitação

```gherkin
Dado um usuário autenticado com payload válido de workspace
Quando ele chama POST /workspaces
Então o sistema cria Workspace e WorkspaceMember OWNER na mesma transação

Dado um workspace BUSINESS com CNAE iniciado por 620
Quando o workspace é criado
Então o sistema persiste taxRate igual a 6.00

Dado um usuário com memberships
Quando o frontend inicializa WorkspaceProvider
Então o sistema restaura o workspace salvo se ele ainda pertence ao usuário

Dado uma rota protegida por WorkspaceMiddleware sem x-workspace-id
Quando a request chega ao backend
Então o sistema rejeita com erro 400

Dado um usuário sem membership no workspace solicitado
Quando ele chama uma rota escopada por workspace
Então o sistema rejeita com erro 403

Dado um contador com membership ACCOUNTANT em workspace PERSONAL
Quando ele tenta acessar uma rota escopada por esse workspace
Então o sistema rejeita o acesso e registra bloqueio zero-trust

Dado um OWNER de workspace
Quando ele convida um e-mail que ainda não é membro e não possui convite pendente
Então o sistema cria WorkspaceInvite PENDING com token seguro e expiração de 7 dias

Dado um convite pendente válido
Quando o usuário autenticado com o mesmo e-mail aceita o convite
Então o sistema cria WorkspaceMember com a role do convite e marca o convite como ACCEPTED

Dado um OWNER tentando remover outro membro
Quando o membro alvo existe
Então o sistema remove o vínculo WorkspaceMember

Dado um OWNER com certificado .pfx válido e senha correta
Quando ele envia POST /workspaces/:id/certificate-a1
Então o sistema extrai a validade, grava o arquivo no vault, atualiza o workspace e mantém o certificado antigo removível apenas após sucesso
```

## Cenários de Borda

| Cenário | Comportamento Esperado | Confiança |
|---|---|---|
| `name` ausente na criação | Erro `Name is required`. | CONFIRMADO |
| `type` ausente na criação | Backend assume default `PERSONAL`. | CONFIRMADO |
| CNPJ/CEP inválido no frontend | Autocomplete não deve preencher campos externos. | CONFIRMADO |
| Workspace salvo no storage não existe mais nos memberships | Frontend seleciona primeiro workspace disponível. | CONFIRMADO |
| Update com apenas `name` ou apenas `type` | Rejeição por falta de ambos os campos. | CONFIRMADO |
| Convite para usuário já membro | Rejeitado com `User is already a member`. | CONFIRMADO |
| Convite pendente duplicado | Rejeitado com `A pending invite already exists`. | CONFIRMADO |
| Aceite por e-mail diferente | Rejeitado por mismatch de e-mail. | CONFIRMADO |
| Convite expirado | Marcado como `EXPIRED` e não cria membership. | CONFIRMADO |
| OWNER tenta remover a si mesmo | Rejeitado por regra de auto-remoção. | CONFIRMADO |
| Certificado com extensão inválida | Bloqueado no frontend e no filtro da rota. | CONFIRMADO |
| Certificado válido mas persistência falha | Novo objeto é removido e erro é propagado. | CONFIRMADO |
| Refresh de cache de contador falha após certificado | Upload permanece válido; refresh é best effort. | CONFIRMADO |
| `VAULT_MASTER_KEY` ausente ou curta | Storage seguro de certificado deve falhar. | CONFIRMADO |

## Prioridade

| Requisito | MoSCoW | Justificativa | Confiança |
|---|---|---|---|
| Criação de workspace com OWNER inicial | Must | Base do modelo multi-tenant. | CONFIRMADO |
| Listagem por membership | Must | Impede exposição de workspaces fora do usuário. | CONFIRMADO |
| `WorkspaceMiddleware` com `x-workspace-id` | Must | Fronteira de isolamento operacional. | CONFIRMADO |
| Bloqueio de contador em workspace pessoal | Must | Regra zero-trust explícita. | CONFIRMADO |
| Gestão de convites por OWNER | Must | Controla entrada de usuários no tenant. | CONFIRMADO |
| Double handshake de convite por e-mail | Must | Evita aceitação por usuário errado. | CONFIRMADO |
| Upload seguro de certificado A1 | Must | Material sensível e requisito fiscal. | CONFIRMADO |
| Seleção persistente de workspace no frontend | Should | Melhora continuidade de uso. | CONFIRMADO |
| Autocomplete CNPJ/CEP na criação | Should | Reduz fricção de cadastro empresarial. | CONFIRMADO |
| Refresh best effort do cache após certificado | Should | Mantém hub contador atualizado sem bloquear operação principal. | CONFIRMADO |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---|---|---|
| `backend/src/controllers/WorkspaceController.ts` | `list`, `create`, `update`, `uploadCertificate` | CONFIRMADO |
| `backend/src/services/WorkspaceService.ts` | `list`, `create`, `update`, `uploadCertificate` | CONFIRMADO |
| `backend/src/repositories/WorkspaceRepository.ts` | `findManyByUserId`, `findByIdAndUserId` | CONFIRMADO |
| `backend/src/middlewares/WorkspaceMiddleware.ts` | `WorkspaceMiddleware` | CONFIRMADO |
| `backend/src/middlewares/RbacMiddleware.ts` | `RbacMiddleware` | CONFIRMADO |
| `backend/src/controllers/InviteController.ts` | criação/listagem/aceite/rejeição/revogação/removal | CONFIRMADO |
| `backend/src/services/InviteService.ts` | `createInvite`, `acceptInvite`, `rejectInvite`, `removeMember`, `revokeInvite` | CONFIRMADO |
| `backend/src/services/CertificateService.ts` | `parseAndExtractValidity` | CONFIRMADO |
| `backend/src/providers/IStorageProvider.ts` | contrato de storage seguro | CONFIRMADO |
| `backend/src/providers/S3StorageProvider.ts` | `uploadSecureBuffer`, SSE-C | CONFIRMADO |
| `backend/src/routes.ts` | rotas de workspace, convites e certificado | CONFIRMADO |
| `frontend/src/features/workspaces/components/CreateWorkspaceForm.tsx` | criação e autocomplete CNPJ/CEP | CONFIRMADO |
| `frontend/src/features/workspaces/routes/TeamSettingsPage.tsx` | gestão de membros, convites e certificado | CONFIRMADO |
| `frontend/src/features/workspaces/components/CertificateUploadSection.tsx` | upload A1 no frontend | CONFIRMADO |
| `frontend/src/shared/stores/useWorkspaceStore.ts` | persistência de workspace ativo | CONFIRMADO |
| `frontend/src/app/WorkspaceProvider.tsx` | seleção/restauração de workspace | CONFIRMADO |
| `frontend/src/shared/lib/axios.ts` | injeção de `x-workspace-id` | CONFIRMADO |
| `_reversa_sdd/flowcharts/workspaces.md` | visão consolidada do fluxo | CONFIRMADO |
| `_reversa_sdd/flowcharts/workspaces-create.md` | criação de workspace | CONFIRMADO |
| `_reversa_sdd/flowcharts/workspaces-invite.md` | convites e membros | CONFIRMADO |
| `_reversa_sdd/flowcharts/workspaces-certificate.md` | upload de certificado A1 | CONFIRMADO |
| `_reversa_sdd/flowcharts/workspaces-middleware.md` | isolamento por workspace | CONFIRMADO |
