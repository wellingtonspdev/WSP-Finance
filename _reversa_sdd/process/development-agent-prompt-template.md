# Template - Prompt para Agente de Desenvolvimento

Use este prompt para Codex, Antigravity ou outro agente executor depois de concluir a analise tecnica e o plano TDD.

````markdown
Voce esta trabalhando no projeto WSP Finance.

Tarefa: [titulo da issue]

Contexto obrigatorio:
- Leia primeiro:
  - `_reversa_sdd/process/issue-development-workflow.md`
  - `_reversa_sdd/process/issue-analysis-template.md` preenchido para esta issue
  - `_reversa_sdd/process/technical-analysis-template.md` preenchido para esta issue
  - `_reversa_sdd/process/matching-report-template.md` preenchido ou Matching Report equivalente, quando obrigatorio
  - `_reversa_sdd/process/tdd-plan-template.md` preenchido para esta issue
- Consulte tambem os artefatos Reversa relacionados:
  - [liste SDDs, flowcharts, permissions, gaps, questions, openapi]

Regra obrigatoria:
- Nao implemente diretamente sem seguir o plano TDD.
- Nao ignore o Matching Report; ele define skills, agentes/MCPs, riscos e bloqueios.
- Nao reanalise toda a arquitetura.
- Nao altere arquivos fora do escopo.
- Preserve alteracoes existentes do usuario.
- Se houver commit, use Conventional Commits.

Objetivo:
[descreva o resultado esperado]

Escopo incluido:
- [item]

Fora de escopo:
- [item]

Arquivos provaveis:
- [arquivo]

Arquivos que nao devem ser alterados:
- [arquivo]

Matching:
- Skills obrigatorias: [lista]
- Agentes/MCPs permitidos: [lista]
- Ferramentas descartadas/proibidas: [lista]
- Riscos que devem ser cobertos: [lista]
- Criterios de bloqueio: [lista]

Plano TDD:
1. [teste/validacao]
2. [implementacao minima]
3. [validacao]

Validacoes obrigatorias:
```powershell
[comandos especificos da issue]
```

Criterios de aceite:
- [criterio]

Ao finalizar, entregue:
- Resumo do que mudou.
- Arquivos alterados.
- Testes/validacoes executados e resultados.
- Falhas ou comandos nao executados.
- Riscos residuais.
- Handoff curto para continuidade.
````

## Checklist antes de enviar ao agente

- [ ] Analise da issue preenchida.
- [ ] Analise tecnica preenchida.
- [ ] Matching Report preenchido ou dispensa justificada.
- [ ] Plano TDD preenchido.
- [ ] Escopo e fora de escopo claros.
- [ ] Validacoes definidas.
- [ ] Artefatos Reversa relevantes listados.
- [ ] Criterios de parada definidos.
