# User Stories - Bridge entre Workspaces

## US-BRIDGE-001 - Transferir valor entre PF e PJ

Como usuário com permissão nos dois workspaces, quero registrar uma transferência formal entre contextos para manter auditoria contábil.

### Critérios de Aceitação

- [CONFIRMADO] Dado usuário `OWNER` ou `ACCOUNTANT` nos dois workspaces, quando solicita bridge válida, então operação é permitida.
- [CONFIRMADO] Dado origem e destino iguais, então controller bloqueia.
- [CONFIRMADO] Dado saldo insuficiente na origem, então service bloqueia.

## US-BRIDGE-002 - Auditar bridge bilateralmente

Como auditor, quero ver débito e crédito espelhados com mesmo identificador para rastrear a transferência.

### Critérios de Aceitação

- [CONFIRMADO] Dado bridge aprovada, então sistema cria despesa `BRIDGE_OUT` na origem.
- [CONFIRMADO] Dado bridge aprovada, então sistema cria receita `BRIDGE_IN` no destino.
- [CONFIRMADO] Dado bridge aprovada, então duas auditorias `BRIDGE_TRANSFER` são gravadas com mesmo `bridgeId`.

## US-BRIDGE-003 - Respeitar fechamento fiscal

Como sistema contábil, quero bloquear bridge em período fechado quando não houver bypass permitido.

### Critérios de Aceitação

- [CONFIRMADO] Dado data em `closedUntil`, então origem e destino são validados.
- [CONFIRMADO] Dado contador em workspace `BUSINESS`, então bypass pode ser aplicado conforme regra fiscal.
- [CONFIRMADO] Dado qualquer outro caso sem bypass, então bridge é bloqueada.
