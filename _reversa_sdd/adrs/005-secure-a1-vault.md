# ADR 005 - Upload seguro de certificado A1 no vault

## Status

Aceito retroativamente.

## Contexto

Certificado A1 é material sensível. O histórico recente mostra `96b1dcf feat: upload seguro de certificado A1`, `cc42f46 docs: corrige tags...` e `428b6bb fix: corrige erro de typescript no RbacMiddleware...`.

## Decisão

Aceitar upload `.p12/.pfx` em memória, extrair validade, persistir apenas object key no workspace e armazenar objeto no R2/S3 com SSE-C derivado de `VAULT_MASTER_KEY`.

## Alternativas consideradas

- Salvar arquivo em disco local: simples, mas frágil e inseguro.
- Salvar binário no banco: viola restrição de storage e aumenta risco.
- Delegar tudo ao browser por presigned URL: reduz backend, mas dificulta validação de validade e troca segura.

## Consequências

- 🟢 Certificado antigo só é apagado após novo upload persistido.
- 🟢 Validade alimenta alertas e cache do contador.
- 🟢 Route exige `OWNER`.
- 🔴 Service permite `ACCOUNTANT` em alguns pontos, mas rota está mais restritiva; decisão final de produto precisa ser explícita.
