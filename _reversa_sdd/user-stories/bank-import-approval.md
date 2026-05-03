# User Stories - Importação e Aprovação Bancária

## US-BANK-001 - Importar movimentos OFX

Como usuário, quero importar arquivo OFX para criar movimentos bancários em staging.

### Critérios de Aceitação

- [CONFIRMADO] Dado arquivo `.ofx` válido, quando importado, então movimentos são parseados e inseridos como `PENDING`.
- [CONFIRMADO] Dado caminho vazio, com `..` ou extensão diferente, então importação é rejeitada.
- [CONFIRMADO] Dado duplicata fuzzy, então movimento duplicado não é inserido.

## US-BANK-002 - Receber movimentos Open Finance

Como sistema integrado, quero receber webhook Open Finance para popular staging automaticamente.

### Critérios de Aceitação

- [CONFIRMADO] Dado bearer válido, quando webhook envia movimentos, então engine normaliza e persiste `BankMovement PENDING`.
- [CONFIRMADO] Dado bearer inválido, então webhook é rejeitado.
- [LACUNA] Fallback `webhook-auth-key-mock` deve ser eliminado ou travado em produção.

## US-BANK-003 - Aprovar movimento bancário

Como contador ou usuário operacional, quero aprovar movimento pendente para convertê-lo em transação real.

### Critérios de Aceitação

- [CONFIRMADO] Dado movimento `PENDING`, conta e categoria válidas, quando aprovo, então sistema cria `Transaction`, atualiza saldo, audita e marca `APPROVED`.
- [CONFIRMADO] Dado período fiscal fechado, então aprovação é bloqueada salvo bypass de contador em `BUSINESS`.
- [CONFIRMADO] Dado movimento já `APPROVED`, então aprovação é idempotente.
