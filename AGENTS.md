# Reversa

> Framework de Engenharia Reversa instalado neste projeto.

## Como usar

Digite `reversa` para ativar o Reversa e iniciar ou retomar a análise do projeto.

## Comportamento ao ativar

Quando o usuário digitar `reversa` sozinho em uma mensagem:

1. Ative o skill `reversa` disponível em `.agents/skills/reversa/SKILL.md`
2. Leia o SKILL.md na íntegra e siga exatamente as instruções do Reversa

## Regra não-negociável

Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto legado.
O Reversa escreve **apenas** em `.reversa/` e `_reversa_sdd/`.

## Workflow operacional de issues

Antes de planejar ou implementar qualquer issue, consulte:

- `_reversa_sdd/process/issue-development-workflow.md`
- `_reversa_sdd/process/issue-analysis-template.md`
- `_reversa_sdd/process/technical-analysis-template.md`
- `_reversa_sdd/process/tdd-plan-template.md`
- `_reversa_sdd/process/development-agent-prompt-template.md`
- `_reversa_sdd/process/review-template.md`
- `_reversa_sdd/process/handoff-template.md`

Nenhuma issue deve ser implementada diretamente. O agente deve primeiro entregar:

1. Issue Understanding
2. Technical Analysis
3. TDD Plan
4. Development Agent Prompt

Somente depois disso a implementacao pode comecar.
