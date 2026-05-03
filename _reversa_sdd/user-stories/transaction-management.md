# User Stories - Transações Financeiras

## US-TXN-001 - Criar transação paga

Como usuário de workspace, quero registrar uma transação paga para refletir meu saldo real.

### Critérios de Aceitação

- [CONFIRMADO] Dado conta e categoria válidas no workspace, quando transação paga é criada, então saldo da conta é atualizado.
- [CONFIRMADO] Dado transação criada com saldo alterado, então `AuditLog` registra saldo antes/depois e delta.
- [CONFIRMADO] Dado data em período fechado sem bypass permitido, então criação é bloqueada.

## US-TXN-002 - Excluir transação paga

Como usuário, quero excluir transação incorreta e reverter o impacto no saldo.

### Critérios de Aceitação

- [CONFIRMADO] Dado transação paga existente, quando excluo, então saldo é revertido.
- [CONFIRMADO] Dado transação com anexo, quando excluo, então arquivo remoto é removido em background.
- [CONFIRMADO] Dado data em período fechado sem bypass, então exclusão é bloqueada.

## US-TXN-003 - Consultar dashboard financeiro

Como usuário, quero ver saldo total, fluxo mensal e despesas fixas para entender a situação financeira.

### Critérios de Aceitação

- [CONFIRMADO] Dado mês/ano consultado, quando dashboard é carregado, então saldo, fluxo e despesas são calculados.
- [CONFIRMADO] Dado contas com `isIncludedInTotal=false`, então elas não entram no saldo total.
- [CONFIRMADO] Dado despesas fixas, então break-even e coverage ratio são retornados.
