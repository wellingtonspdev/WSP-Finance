# User Stories - Upload e Visualização de Anexos

## US-UPLOAD-001 - Enviar anexo por URL presigned

Como usuário, quero anexar comprovantes sem trafegar o arquivo pelo backend depois da autorização inicial.

### Critérios de Aceitação

- [CONFIRMADO] Dado arquivo válido abaixo de 10 MB, quando solicito URL presigned, então backend retorna URL e headers.
- [CONFIRMADO] Dado quota abaixo de 1 GB, então upload é permitido.
- [CONFIRMADO] Dado quota excedida, então backend retorna erro `402`.

## US-UPLOAD-002 - Visualizar anexo assinado

Como usuário autorizado do workspace, quero abrir anexo de transação por link temporário.

### Critérios de Aceitação

- [CONFIRMADO] Dado transação com anexo no workspace atual, quando abro o anexo, então backend retorna URL temporária de 5 minutos.
- [CONFIRMADO] Dado visualização, então `AuditLog ATTACHMENT_VIEW` é registrado em background.
- [CONFIRMADO] Dado resposta com headers SSE-C, então frontend usa `fetch` com headers e renderiza blob local.

## US-UPLOAD-003 - Bloquear anexo fora do workspace

Como sistema multi-tenant, quero impedir acesso a anexo de transação fora do workspace atual.

### Critérios de Aceitação

- [CONFIRMADO] Dado id de transação que não pertence ao workspace, então download assinado não é gerado.
- [CONFIRMADO] Dado transação sem `attachmentUrl`, então resposta é `404`.
