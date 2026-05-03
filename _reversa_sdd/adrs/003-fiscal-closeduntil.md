# ADR 003 - Fechamento fiscal por `closedUntil`

## Status

Aceito retroativamente.

## Contexto

Depois que um período fiscal é fechado, alterações retroativas podem causar divergência contábil e risco de compliance. O histórico mostra `f4989a2 ... guard de closeduntil`, `3ac041f/e004ac5/... cadeado visual` e uso em services financeiros.

## Decisão

Adicionar `Workspace.closedUntil` e bloquear transações/approvals/bridge com data igual ou anterior ao fechamento, exceto bypass de contador em workspace empresarial.

## Alternativas consideradas

- Bloqueio apenas visual: melhora UX, mas não protege API.
- Bloqueio absoluto sem bypass: mais rígido, mas atrapalha correção contábil pelo contador.
- Fechamento por mês/competência em tabela dedicada: mais preciso, porém maior modelagem.

## Consequências

- 🟢 Reduz mutações indevidas em períodos fechados.
- 🟢 Mantém exceção operacional para contador em `BUSINESS`.
- 🟡 `closedUntil` é simples e funciona como limite linear; não modela múltiplas competências.
- 🔴 A matriz de permissões ainda mostra rotas sem RBAC explícito além do guard fiscal.
