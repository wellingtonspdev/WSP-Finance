# SDD - Frontend Shell

## Visão Geral

[CONFIRMADO] O componente `frontend-shell` organiza bootstrap React, providers globais, roteamento, lazy loading, autenticação, workspace ativo, interceptors Axios, layout e guardas de navegação.

## Responsabilidades

- [CONFIRMADO] Montar providers globais no `main.tsx`.
- [CONFIRMADO] Definir rotas públicas, privadas, de workspace e de contador.
- [CONFIRMADO] Proteger rotas privadas com `PrivateRoute`.
- [CONFIRMADO] Sincronizar workspace da URL com estado local.
- [CONFIRMADO] Bloquear contador em workspace pessoal no frontend.
- [CONFIRMADO] Injetar Bearer token em memória nas requests.
- [CONFIRMADO] Derivar `x-workspace-id` a partir da URL.
- [CONFIRMADO] Serializar refresh de token com fila.
- [CONFIRMADO] Exibir layout por persona cliente/contador.

## Interface

| Item | Responsabilidade | Confiança |
|---|---|---|
| `main.tsx` | monta `QueryClientProvider`, `ToastProvider`, `AuthProvider`, `WorkspaceProvider` | CONFIRMADO |
| `App.tsx` | define rotas e `React.lazy` | CONFIRMADO |
| `PrivateRoute` | redireciona não autenticado para `/login` | CONFIRMADO |
| `WorkspaceGuard` | sincroniza workspace e bloqueia contador em personal | CONFIRMADO |
| `axios.ts` | token, workspace header e refresh queue | CONFIRMADO |
| `react-query.ts` | defaults de cache/retry | CONFIRMADO |
| `queryKeys.ts` | chaves por workspace | CONFIRMADO |
| `AppLayout` | navegação e layout por persona | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] Rotas privadas exigem `useAuth().isAuthenticated`.
- [CONFIRMADO] Usuário não autenticado é redirecionado para `/login`.
- [CONFIRMADO] `WorkspaceGuard` redireciona contador sem contexto para `/accountant/hub`.
- [CONFIRMADO] `WorkspaceGuard` bloqueia contador em workspace `PERSONAL`.
- [CONFIRMADO] Access token fica somente em memória no módulo Axios.
- [CONFIRMADO] Refresh token fica em `localStorage` como `wsp_refresh_token`.
- [CONFIRMADO] Request interceptor injeta `Authorization` quando há token.
- [CONFIRMADO] Request interceptor deriva `x-workspace-id` da URL; em `/accountant/inbox/:workspaceId`, usa segmento específico.
- [CONFIRMADO] 401 sem `_retry` dispara refresh.
- [CONFIRMADO] Refresh concorrente usa `isRefreshing` e `failedQueue`.
- [CONFIRMADO] 403 marca `setForbidden(true)` no store.
- [CONFIRMADO] React Query usa `retry: 1`, `staleTime` de 5 minutos e `refetchOnWindowFocus: false`.
- [CONFIRMADO] `WorkspaceGuard` usa casts temporários `as any`, com comentário indicando interface unificada pendente. [Revisão Reviewer]
- [CONFIRMADO] Estado `isForbidden` é definido no store e acionado pelo Axios em `403`, mas não há uso encontrado em telas/componentes para exibição final. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] `main.tsx` monta providers globais.
2. [CONFIRMADO] `AuthProvider` restaura ou mantém sessão.
3. [CONFIRMADO] `WorkspaceProvider` seleciona workspace ativo.
4. [CONFIRMADO] `App.tsx` carrega páginas com `React.lazy` e `Suspense`.
5. [CONFIRMADO] `PrivateRoute` verifica autenticação.
6. [CONFIRMADO] `WorkspaceGuard` sincroniza workspace e persona.
7. [CONFIRMADO] `AppLayout` renderiza navegação adequada.
8. [CONFIRMADO] Axios injeta token/workspace em chamadas para API.

## Critérios de Aceitação

```gherkin
Dado um usuário não autenticado
Quando ele acessa uma rota privada
Então o frontend redireciona para /login

Dado um usuário contador sem workspace ativo
Quando ele acessa rota que exige contexto de cliente
Então o frontend redireciona para /accountant/hub

Dado múltiplas requests com 401 durante refresh
Quando uma renovação já está em andamento
Então as demais aguardam na fila e são reexecutadas com o novo token
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `frontend/src/main.tsx` | bootstrap |
| `frontend/src/App.tsx` | rotas lazy |
| `frontend/src/app/AuthProvider.tsx` | sessão |
| `frontend/src/app/WorkspaceProvider.tsx` | workspace ativo |
| `frontend/src/shared/lib/axios.ts` | interceptors |
| `frontend/src/shared/lib/react-query.ts` | query defaults |
| `frontend/src/config/queryKeys.ts` | chaves |
| `frontend/src/shared/components/guards/WorkspaceGuard.tsx` | guardas |
| `frontend/src/shared/components/layout/AppLayout.tsx` | layout |
| `_reversa_sdd/flowcharts/frontend-shell*.md` | fluxos do módulo |
