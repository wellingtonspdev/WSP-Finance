# ADR 006 - Bridge com lançamentos espelhados entre workspaces

## Status

Aceito retroativamente.

## Contexto

O escopo do produto define separação CPF/CNPJ e formalização de retirada como pró-labore/lucros. O código implementa `BridgeService` com validações nos dois workspaces e auditoria dupla.

## Decisão

Executar bridge como operação atômica que cria uma despesa no workspace origem, uma receita no destino, atualiza dois saldos e grava dois `AuditLog` com o mesmo `bridgeId`.

## Alternativas consideradas

- Apenas transferência visual sem duas transações: simples, mas fraca para auditoria.
- Uma única entidade Transfer: evitaria duplicidade, mas exigiria mudanças maiores no modelo financeiro.
- Bridge sem validação nos dois workspaces: mais rápida, mas quebraria segurança multi-tenant.

## Consequências

- 🟢 Preserva trilha contábil bilateral.
- 🟢 Permite auditar saldo antes/depois em cada conta.
- 🟡 Requer categorias válidas nos dois lados.
- 🔴 `BridgeService` usa `crypto.randomUUID()` sem import explícito no trecho analisado; build não foi executado nesta fase.
