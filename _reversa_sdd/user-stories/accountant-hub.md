# User Stories - Hub do Contador

## US-ACC-001 - Ver carteira de clientes

Como contador, quero ver meus clientes e pendências em um hub para priorizar trabalho.

### Critérios de Aceitação

- [CONFIRMADO] Dado usuário `ACCOUNTANT`, quando autentica, então `dashboardCache` é carregado.
- [CONFIRMADO] Dado hub aberto, então workspace ativo é limpo.
- [CONFIRMADO] Dado memberships de contador, então hub mostra clientes com pendências calculadas por cache.

## US-ACC-002 - Atualizar cache de indicadores

Como sistema, quero atualizar cache de contador para reduzir custo de consultas multi-workspace.

### Critérios de Aceitação

- [CONFIRMADO] Dado contador com workspaces, quando refresh roda, então processa em lotes de 5.
- [CONFIRMADO] Dado workspace agregado, então sistema calcula pendências, anexos faltantes, saldo e validade de certificado.
- [CONFIRMADO] Dado contador sem workspaces, então cache do usuário é removido.
- [LACUNA] Falhas parciais preservam caches antigos em alguns casos.

## US-ACC-003 - Navegar para cliente e inbox

Como contador, quero acessar dashboard, documentos e inbox do cliente diretamente do hub.

### Critérios de Aceitação

- [CONFIRMADO] Dado cliente com membership `ACCOUNTANT`, quando acesso cliente, então navego para `/:workspaceId/dashboard`.
- [CONFIRMADO] Dado pendências bancárias, quando abro inbox, então vejo pendências globais ou por workspace.
- [CONFIRMADO] Dado convites recebidos, então posso aceitar ou rejeitar no inbox de convites.
