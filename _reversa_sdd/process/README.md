# Processo Operacional - WSP Finance

Esta pasta contem o fluxo operacional oficial do WSP Finance para desenvolvimento assistido por agentes.

Use estes documentos antes de planejar, implementar, revisar ou fazer handoff de qualquer issue, task, bugfix ou melhoria funcional.

## Regra central

Nenhum agente deve implementar uma issue diretamente sem antes passar por:

1. Issue
2. Analise tecnica
3. Plano TDD
4. Prompt para agente
5. Implementacao
6. Revisao
7. Handoff

## Arquivos

| Arquivo | Uso |
|---|---|
| `issue-development-workflow.md` | Workflow principal, obrigatorio para qualquer issue. |
| `issue-analysis-template.md` | Modelo para entender e delimitar a issue. |
| `technical-analysis-template.md` | Modelo para analisar impacto tecnico antes de codar. |
| `tdd-plan-template.md` | Modelo para planejar testes antes da implementacao. |
| `development-agent-prompt-template.md` | Modelo de prompt para Codex, Antigravity ou outro agente executor. |
| `review-template.md` | Modelo para revisao tecnica, regressao e aderencia ao plano. |
| `handoff-template.md` | Modelo para continuidade entre agentes/sessoes. |

## Como usar

1. Abra `issue-development-workflow.md`.
2. Preencha `issue-analysis-template.md` para a issue atual.
3. Preencha `technical-analysis-template.md` com evidencias reais do codigo e da documentacao Reversa.
4. Preencha `tdd-plan-template.md` antes de implementar.
5. Gere o prompt do executor com `development-agent-prompt-template.md`.
6. Execute a implementacao controlada.
7. Revise com `review-template.md`.
8. Feche ou transfira continuidade com `handoff-template.md`.

## Documentacao Reversa que deve ser consultada

- `_reversa_sdd/sdd/`
- `_reversa_sdd/flowcharts/`
- `_reversa_sdd/domain.md`
- `_reversa_sdd/permissions.md`
- `_reversa_sdd/state-machines.md`
- `_reversa_sdd/traceability/`
- `_reversa_sdd/gaps.md`
- `_reversa_sdd/questions.md`
- `_reversa_sdd/scope-mvp-analysis.md`
- `_reversa_sdd/openapi/`

## Validacao minima

Sempre escolha os comandos de validacao de acordo com o escopo alterado. Comandos comuns:

```powershell
git status --short
git diff --check
pnpm exec tsc --noEmit
pnpm test
pnpm test -- --coverage
pnpm run build
pnpm run lint
pnpm exec prisma validate
pnpm exec prisma migrate status
pnpm exec playwright test
```

Se um comando nao existir no pacote atual, registre isso no handoff em vez de fingir que foi validado.
