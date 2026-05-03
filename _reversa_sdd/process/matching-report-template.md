# Template - Matching Report

Use este modelo depois da Analise Tecnica e antes do Plano TDD.

## Identificacao

- Issue:
- Data:
- Agente de Matching:
- Severidade: baixa | media | alta | critica
- Matching: completo | simplificado
- Branch:

## Resumo da decisao

> [Explique em uma frase quais skills/agentes/MCPs devem ser usados e por que.]

## Entradas analisadas

- Analise da issue:
- Analise tecnica:
- Artefatos Reversa consultados:
- Codigo/arquivos consultados:
- Restricoes conhecidas:

## Modulos afetados

- [ ] auth
- [ ] workspaces
- [ ] rbac-rls
- [ ] finance-core
- [ ] uploads-storage
- [ ] imports-open-finance
- [ ] bank-movements
- [ ] accountant
- [ ] external-data
- [ ] frontend-shell
- [ ] infra/CI
- [ ] docs/processo
- [ ] outro:

## Skills selecionadas

| Skill | Obrigatoria? | Motivo | Limite de uso |
|---|---:|---|---|
|  | sim/nao |  |  |

## Agentes selecionados

| Agente | Papel | Motivo | Limite de atuacao |
|---|---|---|---|
| Codex | executor/revisor/orquestrador |  |  |
| Antigravity | executor/revisor/orquestrador |  |  |
| Outro |  |  |  |

## MCPs/plugins/conectores

| Ferramenta | Usar? | Motivo | Risco | Mitigacao |
|---|---:|---|---|---|
|  | sim/nao |  |  |  |

## Ferramentas descartadas

| Ferramenta | Motivo do descarte |
|---|---|
|  |  |

## Riscos e mitigacoes

| Risco | Severidade | Mitigacao | Vira teste TDD? |
|---|---|---|---:|
|  | baixa/media/alta/critica |  | sim/nao |

## Impacto no Plano TDD

- Testes obrigatorios:
  - [ ]
- Validacoes obrigatorias:
  - [ ]
- Testes negativos:
  - [ ]
- Validacao manual, se necessaria:
  - [ ]

## Impacto no Prompt para Agente

O prompt executor deve incluir:

- Skills obrigatorias:
- Agentes/MCPs permitidos:
- Agentes/MCPs proibidos:
- Arquivos provaveis:
- Fora de escopo:
- Validacoes obrigatorias:
- Criterios de parada:

## Criterios de bloqueio avaliados

- [ ] Risco grave sem mitigacao.
- [ ] Falta decisao de produto.
- [ ] Risco de segredo/PII/dado financeiro.
- [ ] MCP/conector sem autorizacao.
- [ ] Migracao/destruicao de dados sem plano.
- [ ] RBAC/RLS/tenant sem validacao possivel.
- [ ] Escopo amplo demais.
- [ ] TDD nao cobre risco principal.

## Veredito

- [ ] Pode seguir para Plano TDD.
- [ ] Pode seguir com ressalvas.
- [ ] Bloqueado.

Justificativa:

## Registro para matching-log

```markdown
| Data | Issue | Severidade | Matching | Skills/agentes/MCPs | Veredito | Observacao |
|---|---|---|---|---|---|---|
| YYYY-MM-DD |  |  | completo/simplificado |  | seguir/bloqueado |  |
```
