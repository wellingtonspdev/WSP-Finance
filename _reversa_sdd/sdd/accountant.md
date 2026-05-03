# SDD - Accountant

## Visão Geral

[CONFIRMADO] O componente `accountant` concentra a persona do contador: hub operacional, convites recebidos, inbox de aprovação e cache multi-workspace de KPIs para login/restauração de sessão.

## Responsabilidades

- [CONFIRMADO] Carregar `dashboardCache` no login e em `/auth/me` para usuário `ACCOUNTANT`.
- [CONFIRMADO] Agregar indicadores por workspace de cliente.
- [CONFIRMADO] Processar cache em lotes de 5 workspaces.
- [CONFIRMADO] Exibir hub com clientes, pendências e alertas.
- [CONFIRMADO] Limpar workspace ativo ao entrar no hub.
- [CONFIRMADO] Permitir navegação para dashboard, documentos e inbox do cliente.
- [CONFIRMADO] Listar, aceitar e rejeitar convites recebidos.

## Interface

| Item | Entrada | Saída | Confiança |
|---|---|---|---|
| `AuthService.authenticate` | usuário `ACCOUNTANT` | `dashboardCache` | CONFIRMADO |
| `GET /auth/me` | Bearer JWT | `dashboardCache` para contador | CONFIRMADO |
| `AccountantCacheService.refreshCache` | `userId` | cache atualizado por workspace | CONFIRMADO |
| `AccountantHubPage` | memberships + cache | visão operacional do contador | CONFIRMADO |
| `InviteInboxPage` | usuário contador/cliente | convites recebidos | CONFIRMADO |
| `ApprovalInboxPage` | global ou workspace | movimentos pendentes | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Cache do contador é retornado apenas para usuário `ACCOUNTANT`.
- [CONFIRMADO] Quando contador não tem memberships, cache dele é apagado.
- [CONFIRMADO] Workspaces são deduplicados antes de agregação.
- [CONFIRMADO] Refresh processa em lotes de 5.
- [CONFIRMADO] `aggregateWorkspace` usa `set_config('app.current_workspace_id')`.
- [CONFIRMADO] Agregação conta movimentos pendentes, transações sem anexo, saldo e certificado.
- [CONFIRMADO] Upsert do cache usa chave única `userId_workspaceId`.
- [CONFIRMADO] Entrar no hub limpa workspace ativo.
- [CONFIRMADO] Hub filtra memberships com role `ACCOUNTANT`.
- [CONFIRMADO] Pendências visuais somam `pendingMovements + missingAttachments`.
- [CONFIRMADO] Cache parcial pode retornar erros por workspace sem falhar lote inteiro.
- [CONFIRMADO] `AccountantHubPage` contém `mockEvents`; feed lateral é protótipo local e não vem do backend no código atual. [Revisão Reviewer]
- [CONFIRMADO] Cache só remove entradas obsoletas quando `errors.length === 0`; falhas parciais mantêm caches antigos. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] Usuário contador autentica.
2. [CONFIRMADO] Auth carrega ou atualiza `dashboardCache`.
3. [CONFIRMADO] `AuthProvider` persiste cache em `wsp_dashboard_cache`.
4. [CONFIRMADO] `AccountantHubPage` filtra clientes por membership `ACCOUNTANT`.
5. [CONFIRMADO] Tela calcula pendências e alertas.
6. [CONFIRMADO] Contador navega para workspace, documentos, inbox ou convites.

## Critérios de Aceitação

```gherkin
Dado um usuário ACCOUNTANT com workspaces associados
Quando ele autentica
Então a resposta inclui dashboardCache filtrado pelos workspaces esperados

Dado um contador sem memberships
Quando o cache é atualizado
Então o sistema apaga entradas de cache do usuário

Dado um contador no hub
Quando ele seleciona um cliente
Então o sistema navega para a rota do workspace do cliente
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/services/AccountantCacheService.ts` | refresh e agregação |
| `backend/src/repositories/AccountantCacheRepository.ts` | upsert/cache |
| `backend/src/services/AuthService.ts` | loadAccountantCache |
| `frontend/src/features/accountant/routes/AccountantHubPage.tsx` | hub |
| `frontend/src/features/accountant/routes/InviteInboxPage.tsx` | convites |
| `frontend/src/features/accountant/routes/ApprovalInboxPage.tsx` | inbox |
| `frontend/src/app/AuthProvider.tsx` | persistência do cache |
| `_reversa_sdd/flowcharts/accountant*.md` | fluxos do módulo |
