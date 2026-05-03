# User Stories - Certificado A1 Vault

## US-CERT-001 - Enviar certificado A1

Como `OWNER` de workspace, quero enviar certificado A1 para habilitar operações fiscais futuras com segurança.

### Critérios de Aceitação

- [CONFIRMADO] Dado arquivo `.pfx` ou `.p12` e senha, quando envio o formulário, então backend valida arquivo e senha.
- [CONFIRMADO] Dado certificado válido, então validade é extraída e persistida em `certificateExpiresAt`.
- [CONFIRMADO] Dado upload bem-sucedido, então object key é gravada e cache de contador é atualizado em best effort.

## US-CERT-002 - Armazenar certificado com proteção forte

Como sistema, quero armazenar certificado A1 sem gravá-lo em disco local no fluxo principal.

### Critérios de Aceitação

- [CONFIRMADO] Dado upload de certificado, então `multer.memoryStorage` mantém arquivo em memória.
- [CONFIRMADO] Dado storage seguro, então `VAULT_MASTER_KEY` com mínimo de 32 caracteres é exigida.
- [CONFIRMADO] Dado persistência do novo certificado falha, então novo objeto é apagado e certificado antigo permanece.

## US-CERT-003 - Exibir status do certificado

Como usuário do workspace, quero saber se o certificado está enviado, próximo do vencimento ou expirado.

### Critérios de Aceitação

- [CONFIRMADO] Dado `certificateExpiresAt`, então frontend mostra estado de certificado ativo.
- [CONFIRMADO] Dado certificado substituído, então validade nova alimenta cache/badges.
- [LACUNA] Decisão se contador pode gerenciar certificado ainda não está explícita; rota atual exige `OWNER`.
