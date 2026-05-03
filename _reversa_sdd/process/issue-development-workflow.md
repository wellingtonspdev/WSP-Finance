# Workflow de Desenvolvimento de Issues - WSP Finance

Este e o workflow operacional obrigatorio para qualquer issue do WSP Finance.

Nenhuma issue deve ser implementada diretamente sem antes passar por:

1. entendimento da issue;
2. analise tecnica;
3. Matching de Skills/Agentes/MCPs;
4. plano TDD;
5. geracao de prompt para agente;
6. implementacao controlada;
7. revisao;
8. handoff.

Este processo vale para agentes como Codex, Antigravity e qualquer outro agente executor. O objetivo e impedir implementacao impulsiva, preservar a arquitetura documentada pelo Reversa e garantir continuidade entre sessoes.

## Principios obrigatorios

- Nao implementar direto sem analise e plano TDD.
- Executar ou consultar Matching Report antes do Plano TDD para issues medias, altas, criticas ou com risco operacional.
- Nao alterar escopo sem registrar decisao.
- Nao reanalisar toda a arquitetura quando a issue for pontual.
- Usar a documentacao existente em `_reversa_sdd/` como fonte inicial de contexto.
- Confirmar no codigo real qualquer fato que impacte implementacao.
- Separar fatos confirmados, inferencias e lacunas.
- Preservar alteracoes do usuario e nunca reverter trabalho nao relacionado.
- Manter commits em Conventional Commits quando houver commit.
- Registrar comandos executados, falhas e validacoes pendentes.
- Bloquear a issue quando o Matching identificar risco grave sem mitigacao.

## Etapa 1 - Issue

### Objetivo

Entender a demanda, reduzir ambiguidade e delimitar o escopo antes de qualquer alteracao.

### Entradas necessarias

- Titulo e descricao da issue.
- Criterios de aceite, se existirem.
- Screenshots, logs, erro, link de PR ou relato do usuario.
- Arquivos, rotas, modulos ou fluxos citados.
- Prioridade e impacto de negocio.

### Acoes esperadas

- Ler a issue integralmente.
- Identificar modulo(s) afetado(s).
- Mapear comportamento esperado vs atual.
- Consultar `_reversa_sdd/sdd/`, `_reversa_sdd/domain.md`, `_reversa_sdd/permissions.md`, `_reversa_sdd/gaps.md` e `_reversa_sdd/questions.md`.
- Registrar o que esta claro, o que falta e o que precisa ser validado.

### Perguntas que o agente deve responder

- Qual problema real a issue pede para resolver?
- Qual usuario/ator e afetado?
- Existe regra de negocio ja documentada?
- Existe decisao pendente em `questions.md` ou gap relacionado?
- O pedido e bug, melhoria, hardening, documentacao ou refatoracao?
- O escopo esta pequeno o suficiente para uma implementacao controlada?

### Artefatos gerados

- Analise preenchida a partir de `issue-analysis-template.md`.
- Lista de documentos Reversa consultados.
- Lista inicial de riscos e dependencias.

### Criterios de conclusao

- Problema resumido em uma frase.
- Escopo incluido e fora de escopo documentados.
- Criterios de aceite entendidos ou lacunas registradas.
- Nenhuma implementacao iniciada.

### Riscos comuns

- Confundir sintoma com causa.
- Implementar melhoria adjacente fora do pedido.
- Ignorar regra ja documentada em Reversa.
- Usar memoria ou suposicao sem verificar codigo quando o fato e central.

### Como registrar continuidade

- Salvar ou colar o bloco de analise da issue no handoff.
- Referenciar caminhos exatos e decisoes pendentes.

## Etapa 2 - Analise tecnica

### Objetivo

Mapear impacto tecnico, arquivos provaveis, contratos e riscos antes do plano de testes.

### Entradas necessarias

- Analise da issue.
- Artefatos Reversa pertinentes.
- Codigo real dos modulos afetados.
- Estado do git (`git status --short`).

### Acoes esperadas

- Inspecionar arquivos reais com buscas e leituras pontuais.
- Mapear fluxo completo quando aplicavel: backend -> API -> hook/provider -> UI.
- Conferir contratos Prisma, Zod, OpenAPI, tipos frontend e permissoes.
- Identificar testes existentes.
- Registrar riscos e possiveis regresssoes.

### Perguntas que o agente deve responder

- Quais arquivos provavelmente precisam mudar?
- Qual contrato nao pode quebrar?
- Ha migracao, schema, RBAC, RLS, cache, upload, Open Finance ou auditoria envolvida?
- Ha testes existentes que cobrem o fluxo?
- Existe divida conhecida em `_reversa_sdd/gaps.md` relacionada?

### Artefatos gerados

- Analise preenchida a partir de `technical-analysis-template.md`.
- Mapa de impacto por arquivo/modulo.
- Lista de testes existentes e lacunas de teste.

### Criterios de conclusao

- Causa provavel ou area de mudanca delimitada.
- Riscos principais registrados.
- Caminho de validacao tecnica definido.

### Riscos comuns

- Validar apenas uma camada.
- Ignorar tipo de ID, formato Decimal, tenant context ou permissoes.
- Alterar schema sem plano de migracao.
- Ignorar estado sujo do workspace.

### Como usar `_reversa_sdd/`

- Use `sdd/<modulo>.md` para regras e contratos.
- Use `flowcharts/` para fluxo operacional.
- Use `permissions.md` para RBAC/RLS.
- Use `traceability/` para impacto entre codigo e spec.
- Use `gaps.md` e `questions.md` para nao esconder incertezas.

## Etapa 3 - Matching de Skills/Agentes/MCPs

### Objetivo

Selecionar as skills, agentes, MCPs e validacoes necessarias para executar a issue com risco controlado. O Matching ocorre obrigatoriamente depois da Analise Tecnica e antes do Plano TDD.

### Entradas necessarias

- Analise da issue.
- Analise tecnica.
- Artefatos Reversa relevantes.
- Lista de modulos afetados.
- Severidade e riscos tecnicos.
- Ferramentas disponiveis na sessao: skills, agentes, MCPs, plugins e conectores.

### Quando e obrigatorio

O Matching e obrigatorio para issues medias, altas e criticas, ou quando a issue envolver seguranca, banco, RLS, RBAC, dados financeiros, storage, certificado, cache, performance, frontend integrado ou MCPs.

Para issues pequenas e de baixo risco, o agente pode registrar Matching simplificado, desde que justifique por que o Matching completo nao e necessario.

### Acoes esperadas

- Ler `_reversa_sdd/process/matching-agent-workflow.md`.
- Preencher ou consultar `_reversa_sdd/process/matching-report-template.md`.
- Selecionar skills aplicaveis e justificar.
- Selecionar agentes/MCPs/plugins quando forem realmente necessarios.
- Definir ferramentas descartadas e motivo.
- Mapear riscos, mitigacoes e criterios de bloqueio.
- Registrar decisao em `_reversa_sdd/traceability/matching-log.md` quando a issue tiver Matching formal.

### Perguntas que o agente deve responder

- Qual severidade da issue?
- O Matching completo e obrigatorio?
- Quais skills devem ser usadas?
- Quais agentes, MCPs ou plugins sao necessarios?
- Quais ferramentas devem ser evitadas?
- Existe risco grave sem mitigacao?
- O Matching pode seguir para Plano TDD ou deve bloquear a issue?

### Artefatos gerados

- Matching Report preenchido.
- Entrada em `_reversa_sdd/traceability/matching-log.md`.
- Lista de riscos que devem virar testes no Plano TDD.
- Lista de skills/agentes/MCPs que deve entrar no Prompt para Agente.

### Criterios de conclusao

- Skills/agentes/MCPs definidos ou descartados com motivo.
- Riscos principais possuem mitigacao.
- Criterios de bloqueio foram avaliados.
- Plano TDD recebeu os riscos e validacoes obrigatorias.

### Riscos comuns

- Escolher agente/ferramenta por conveniencia, sem relacao com o risco.
- Usar MCP/conector sem necessidade ou sem avaliar exposicao de dados.
- Prosseguir para TDD ignorando risco de RLS, RBAC, storage, certificado ou dados financeiros.
- Deixar de bloquear uma issue quando falta decisao de produto ou mitigacao tecnica.

### Como usar `_reversa_sdd/`

- Use `matching-agent-workflow.md` para as regras de Matching.
- Use `matching-report-template.md` para registrar a decisao.
- Use `sdd/`, `permissions.md`, `gaps.md`, `questions.md` e `traceability/` para confirmar riscos.
- Use `matching-log.md` para continuidade historica.

## Etapa 4 - Plano TDD

### Objetivo

Definir testes antes da implementacao e garantir que o comportamento esperado seja comprovavel.

### Entradas necessarias

- Analise tecnica.
- Matching Report.
- Criterios de aceite.
- Testes existentes.
- Riscos de regressao.

### Acoes esperadas

- Escrever cenarios de teste antes do patch.
- Converter riscos do Matching em testes, validacoes ou bloqueios explicitos.
- Definir primeiro teste que deve falhar ou validacao equivalente.
- Separar unitario, integracao, e2e e validacao manual.
- Definir dados de teste, mocks e limites.

### Perguntas que o agente deve responder

- Qual teste prova que a issue foi resolvida?
- Quais riscos do Matching precisam virar teste obrigatorio?
- Qual teste evita regressao no fluxo principal?
- Qual validacao cobre seguranca/permissao/tenant quando aplicavel?
- Se nao for possivel testar automaticamente, qual evidencia substitui?

### Artefatos gerados

- Plano preenchido a partir de `tdd-plan-template.md`.
- Referencias ao Matching Report e ao matching-log quando aplicavel.
- Lista de comandos de validacao.
- Criterios de aceite testaveis.

### Criterios de conclusao

- Existe um plano de teste antes da implementacao.
- O plano cobre o risco principal.
- O plano cobre os riscos obrigatorios definidos no Matching.
- Comandos esperados estao definidos.

### Riscos comuns

- Codar primeiro e tentar justificar teste depois.
- Testar apenas caminho feliz.
- Omitir permissao, RLS, concorrencia, cache ou contrato frontend/backend.

## Etapa 5 - Prompt para agente

### Objetivo

Gerar um prompt executor claro para Codex, Antigravity ou outro agente, com contexto suficiente e limites explicitos.

### Entradas necessarias

- Issue analisada.
- Analise tecnica.
- Matching Report.
- Plano TDD.
- Arquivos e documentos relevantes.
- Restricoes de escopo.

### Acoes esperadas

- Especificar objetivo da implementacao.
- Incluir skills/agentes/MCPs definidos no Matching.
- Incluir ferramentas proibidas ou descartadas pelo Matching.
- Informar arquivos provaveis e arquivos proibidos/fora de escopo.
- Incluir ordem TDD-first.
- Incluir validacoes obrigatorias.
- Incluir criterios de parada e handoff.

### Perguntas que o agente deve responder

- O prompt impede implementacao fora de escopo?
- O prompt exige teste antes/depois?
- O prompt incorpora skills, agentes, MCPs, riscos e bloqueios do Matching?
- O prompt preserva decisoes de arquitetura?
- O prompt informa como registrar bloqueios?

### Artefatos gerados

- Prompt preenchido a partir de `development-agent-prompt-template.md`.

### Criterios de conclusao

- Um agente executor consegue implementar sem reabrir planejamento.
- Limites e validacoes estao claros.

## Etapa 6 - Implementacao controlada

### Objetivo

Executar mudancas minimas e verificaveis, seguindo o plano TDD.

### Entradas necessarias

- Prompt aprovado.
- Matching Report.
- Plano TDD.
- Estado do workspace.

### Acoes esperadas

- Confirmar `git status --short`.
- Adicionar/ajustar testes conforme plano.
- Implementar a menor mudanca suficiente.
- Manter padroes existentes do repo.
- Atualizar documentacao apenas se fizer parte do escopo.
- Executar validacoes planejadas.

### Perguntas que o agente deve responder

- O teste falha antes da correcao quando aplicavel?
- A mudanca resolve exatamente a issue?
- Houve alteracao de contrato?
- Algum arquivo nao relacionado foi tocado?

### Artefatos gerados

- Patch controlado.
- Testes novos/ajustados.
- Registro de comandos executados.

### Criterios de conclusao

- Issue resolvida no escopo.
- Validacoes executadas ou bloqueios documentados.
- Nenhuma mudanca nao relacionada introduzida.

### Riscos comuns

- Refatoracao ampla sem necessidade.
- Corrigir sintoma e quebrar contrato.
- Ignorar falhas de teste pre-existentes sem registrar.

## Etapa 7 - Revisao

### Objetivo

Avaliar bug, regressao, seguranca, contrato e cobertura antes do fechamento.

### Entradas necessarias

- Diff completo.
- Plano TDD.
- Matching Report.
- Resultado dos comandos.
- Artefatos Reversa consultados.

### Acoes esperadas

- Revisar como code review, achados primeiro.
- Conferir se a implementacao respeita issue, analise e TDD.
- Conferir se a implementacao respeita o Matching Report.
- Validar contratos backend/frontend.
- Conferir impactos em RBAC/RLS, schema, cache, upload, auditoria e UI.
- Registrar gaps residuais.

### Perguntas que o agente deve responder

- Existe bug ou regressao evidente?
- Os testes cobrem o risco principal?
- Os riscos obrigatorios do Matching foram testados ou justificados?
- O contrato documentado foi mantido?
- O que ainda nao foi validado?

### Artefatos gerados

- Revisao preenchida a partir de `review-template.md`.
- Lista de achados por severidade.
- Resultado de validacoes.

### Criterios de conclusao

- Achados bloqueantes resolvidos ou registrados.
- Risco residual claro.
- Pronto para handoff, PR ou commit.

## Etapa 8 - Handoff

### Objetivo

Permitir continuidade por outro agente ou sessao sem refazer analise.

### Entradas necessarias

- Issue original.
- Analise, Matching Report, plano TDD, prompt e revisao.
- Diff/arquivos alterados.
- Comandos executados.
- Pendencias.

### Acoes esperadas

- Resumir estado atual.
- Separar concluido, pendente, bloqueado e fora de escopo.
- Listar arquivos alterados.
- Listar comandos e resultados.
- Registrar o veredito do Matching e riscos residuais.
- Informar proximo passo exato.

### Perguntas que o agente deve responder

- O que foi feito?
- O que falta?
- Como validar?
- Onde continuar sem reabrir investigacao?

### Artefatos gerados

- Handoff preenchido a partir de `handoff-template.md`.

### Criterios de conclusao

- Outro agente consegue continuar imediatamente.
- Nenhuma decisao importante ficou apenas na conversa.

## Como usar este workflow em uma nova issue

1. Copie `issue-analysis-template.md` para o contexto da issue.
2. Preencha problema, escopo, atores, criterios de aceite e documentos Reversa consultados.
3. Preencha `technical-analysis-template.md` com evidencias do codigo real.
4. Execute ou consulte o Matching Report quando a issue for media, alta, critica ou envolver areas sensiveis.
5. Preencha `tdd-plan-template.md` usando os riscos do Matching.
6. Gere o prompt executor com `development-agent-prompt-template.md`, incluindo skills/agentes/MCPs definidos.
7. So depois execute implementacao.
8. Ao terminar, use `review-template.md` e `handoff-template.md`.

Checklist rapido:

- [ ] Issue entendida.
- [ ] Escopo e fora de escopo registrados.
- [ ] `_reversa_sdd/` consultado.
- [ ] Codigo real conferido.
- [ ] Matching executado ou simplificacao justificada.
- [ ] Plano TDD criado.
- [ ] Prompt de agente criado.
- [ ] Implementacao controlada executada.
- [ ] Revisao feita.
- [ ] Handoff registrado.

## Como usar este workflow em revisao

1. Leia a issue, o plano TDD e o diff.
2. Leia o Matching Report quando existir.
3. Compare a solucao com `_reversa_sdd/sdd/`, `permissions.md`, `gaps.md` e `questions.md`.
4. Priorize bugs, regresssoes, seguranca, contratos, riscos do Matching e testes ausentes.
5. Use `review-template.md`.
6. Registre se a revisao aprova, pede mudancas ou bloqueia.

Checklist de revisao:

- [ ] O diff resolve a issue.
- [ ] Nao ha escopo extra sem justificativa.
- [ ] Testes cobrem o risco principal.
- [ ] Riscos do Matching foram cobertos ou justificados.
- [ ] Contratos backend/frontend estao consistentes.
- [ ] RBAC/RLS/tenant foram considerados.
- [ ] Comandos foram executados ou bloqueios documentados.
- [ ] Gaps residuais estao claros.

## Como usar este workflow para handoff

1. Use `handoff-template.md`.
2. Inclua issue, objetivo, Matching Report, arquivos tocados, comandos executados e resultado.
3. Informe o ultimo estado valido.
4. Liste pendencias em ordem de prioridade.
5. Diga exatamente onde o proximo agente deve continuar.

Checklist de handoff:

- [ ] Contexto suficiente para continuidade.
- [ ] Arquivos alterados listados.
- [ ] Validacoes listadas.
- [ ] Pendencias e bloqueios separados.
- [ ] Proximo passo definido.
- [ ] Sem depender de memoria de conversa.

## Comandos tipicos de validacao

Escolha conforme o escopo da issue. Nao execute comandos desnecessarios.

```powershell
git status --short
git diff --check
```

Backend:

```powershell
cd backend
pnpm exec tsc --noEmit
pnpm test
pnpm test -- --coverage
pnpm exec prisma validate
pnpm exec prisma migrate status
```

Frontend:

```powershell
cd frontend
pnpm run build
pnpm run lint
pnpm test
pnpm exec playwright test
```

Se um comando falhar por ambiente, registre erro exato, contexto e alternativa tentada.
