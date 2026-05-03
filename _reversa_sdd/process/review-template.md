# Template - Revisao

Use este modelo depois da implementacao e antes de considerar a issue concluida.

## Identificacao

- Issue:
- Revisor:
- Data:
- Branch/commit:
- Autor da implementacao:

## Escopo revisado

- Objetivo original:
- Arquivos alterados:
- Artefatos Reversa consultados:
- Plano TDD usado:

## Achados

Liste achados por severidade. Se nao houver achados, declarar explicitamente.

### Bloqueantes

- [ ]

### Altos

- [ ]

### Medios

- [ ]

### Baixos / observacoes

- [ ]

## Checklist de revisao tecnica

- [ ] A implementacao resolve a issue.
- [ ] Nao ha escopo extra injustificado.
- [ ] Testes cobrem o risco principal.
- [ ] Backend/API/hook/UI continuam consistentes.
- [ ] Prisma/Zod/OpenAPI/tipos frontend continuam alinhados.
- [ ] RBAC/RLS/tenant context foram considerados.
- [ ] Auditoria/cache/upload/Open Finance foram considerados quando aplicavel.
- [ ] Estados de erro foram tratados.
- [ ] Nao ha segredos, mocks produtivos ou fallback inseguro novo.
- [ ] Documentacao foi atualizada quando necessario.

## Validacoes executadas

| Comando | Resultado | Observacao |
|---|---|---|
| `git status --short` |  |  |
| `git diff --check` |  |  |
|  |  |  |

## Testes

- Testes adicionados:
- Testes alterados:
- Testes nao executados:
- Motivo:

## Riscos residuais

| Risco | Severidade | Aceito? | Proximo passo |
|---|---|---:|---|
|  |  |  |  |

## Veredito

- [ ] Aprovado.
- [ ] Aprovado com ressalvas.
- [ ] Solicitar mudancas.
- [ ] Bloqueado.

Justificativa:

## Handoff para proximo passo

- O que fazer agora:
- Quem deve continuar:
- Arquivos principais:
