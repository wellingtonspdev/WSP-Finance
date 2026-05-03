# Workflow do Agente de Matching - WSP Finance

Este documento incorpora oficialmente a etapa de Matching ao workflow operacional de issues do WSP Finance.

O Matching ocorre depois da Analise Tecnica e antes do Plano TDD:

`Issue -> Analise Tecnica -> Matching de Skills/Agentes/MCPs -> Plano TDD -> Prompt para Agente -> Implementacao -> Revisao -> Handoff`

## Objetivo

Selecionar, justificar e limitar o uso de skills, agentes e MCPs antes de planejar testes e antes de delegar implementacao. O Matching evita que uma issue seja tratada com ferramenta inadequada, agente errado, escopo amplo demais ou risco sem mitigacao.

## Quando o Matching e obrigatorio

O Matching e obrigatorio quando a issue for media, alta ou critica, ou quando envolver:

- seguranca;
- banco de dados, Prisma, migracoes ou RLS;
- RBAC, tenant isolation ou permissoes;
- dados financeiros, transacoes, conciliacao, Open Finance ou OFX;
- storage, uploads, R2/S3, documentos ou certificados;
- certificado A1, senha, segredo, token ou credencial;
- cache, performance, cron, fila ou processamento assinc;
- frontend integrado com backend/API/hook/provider;
- MCPs, conectores, plugins, automacoes ou agentes especializados;
- mudanca cross-layer: backend -> API -> hook/store -> UI;
- qualquer alteracao com risco de regressao em fluxo produtivo.

Para issues pequenas e de baixo risco, o agente pode registrar "Matching simplificado" no proprio plano, desde que explique por que nao houve necessidade de Matching completo.

## Entradas necessarias

- Analise da issue.
- Analise tecnica preenchida.
- Artefatos Reversa relevantes.
- Lista de modulos afetados.
- Riscos tecnicos conhecidos.
- Ferramentas disponiveis na sessao: skills, agentes, MCPs, plugins e comandos locais.
- Restricoes do repo e do usuario.

## Acoes esperadas

1. Classificar severidade e risco operacional da issue.
2. Mapear areas afetadas: backend, frontend, banco, seguranca, infra, docs, UX, automacao.
3. Selecionar skills aplicaveis e justificar o uso.
4. Selecionar agente executor ou revisor quando fizer sentido.
5. Selecionar MCP/plugin/conector apenas se a issue exigir acesso externo ou ferramenta especifica.
6. Definir o que nao deve ser usado.
7. Registrar riscos, mitigacoes e criterios de bloqueio.
8. Produzir Matching Report antes do Plano TDD.

## Regras condicionais de selecao

Use estas regras como guia. Elas nao substituem verificacao do contexto real.

| Condicao | Matching recomendado |
|---|---|
| Issue toca auth, workspace, RBAC/RLS, finance-core, uploads, Open Finance ou Prisma | Usar `wsp-finance-token-ops` e documentos Reversa do modulo. |
| Issue pede engenharia reversa, atualizacao de specs ou processo operacional Reversa | Usar `reversa` e escrever apenas em `.reversa/` ou `_reversa_sdd/`, salvo pedido explicito. |
| Issue exige revisao de arquitetura, ADR ou impacto cross-layer | Consultar `_reversa_sdd/architecture.md`, `c4-*`, `adrs/`, `traceability/`. |
| Issue envolve seguranca, segredo, certificado, RLS ou RBAC | Matching deve exigir validacao de permissao, teste negativo e criterio de bloqueio. |
| Issue envolve banco, Prisma ou migracao | Matching deve exigir `prisma validate`, avaliacao de migracao e risco de dados. |
| Issue envolve frontend integrado | Matching deve exigir rastreio backend -> API -> hook/store -> UI e validacao de contrato. |
| Issue envolve MCP/plugin/conector externo | Matching deve registrar objetivo, escopo de acesso, riscos de dados e alternativa offline. |
| Issue e apenas docs/processo | Matching pode ser simplificado, mas deve confirmar que nao havera alteracao de codigo. |

## Checklist do Agente de Matching

- [ ] A severidade da issue foi classificada.
- [ ] O Matching e obrigatorio ou foi justificado como simplificado.
- [ ] Modulos afetados foram listados.
- [ ] Skills aplicaveis foram selecionadas.
- [ ] Agentes/MCPs/plugins foram selecionados ou descartados com motivo.
- [ ] Riscos graves foram mapeados.
- [ ] Cada risco grave tem mitigacao.
- [ ] Foi definido o que pode bloquear a issue.
- [ ] O Matching Report foi preenchido.
- [ ] O Plano TDD vai usar os riscos e validacoes definidos no Matching.
- [ ] O Prompt para Agente vai incluir skills, limites, MCPs e bloqueios definidos.

## Integracao com Reversa

O Matching deve consultar Reversa antes de definir ferramenta ou agente:

- `_reversa_sdd/sdd/` para contratos por modulo.
- `_reversa_sdd/flowcharts/` para fluxos reais.
- `_reversa_sdd/permissions.md` para RBAC/RLS.
- `_reversa_sdd/gaps.md` e `_reversa_sdd/questions.md` para lacunas pendentes.
- `_reversa_sdd/traceability/` para impacto entre codigo e especificacao.
- `_reversa_sdd/process/` para templates e workflow operacional.
- `_reversa_sdd/traceability/matching-log.md` para registrar historico de Matching.

Se o Matching encontrar divergencia entre issue, codigo e Reversa, deve registrar a divergencia e decidir se a issue pode seguir, se precisa de esclarecimento ou se deve ser bloqueada.

## Impacto no Plano TDD

O Plano TDD deve receber do Matching:

- riscos prioritarios que precisam virar testes;
- comandos de validacao obrigatorios;
- cenarios negativos obrigatorios;
- matriz de permissao/RLS quando aplicavel;
- limites de mock/stub;
- necessidade de e2e, teste de integracao ou validacao manual;
- criterio de bloqueio se a cobertura minima nao puder ser obtida.

Exemplo: se o Matching indicar risco de RLS, o Plano TDD deve incluir teste negativo de tenant/workspace ou validacao equivalente. Se indicar risco de contrato frontend/backend, o Plano TDD deve incluir teste ou validacao de tipo/schema/API.

## Impacto no Prompt para Agente

O Prompt para Agente deve receber do Matching:

- skills obrigatorias a usar;
- agentes/MCPs/plugins permitidos;
- agentes/MCPs/plugins proibidos ou desnecessarios;
- arquivos e modulos provaveis;
- riscos que nao podem ser ignorados;
- validacoes obrigatorias;
- criterios de parada;
- instrucoes de handoff se houver bloqueio.

O prompt executor deve deixar claro que o agente nao pode trocar a estrategia definida no Matching sem registrar motivo tecnico.

## Criterios de bloqueio

O Matching pode bloquear a issue quando:

- risco grave nao possui mitigacao viavel;
- faltam informacoes de produto que alteram regra de negocio;
- ha risco de expor segredo, certificado, token, dado financeiro ou PII;
- a issue exige MCP/conector sem autorizacao ou sem fonte confiavel;
- a mudanca exige migracao/destruicao de dados sem plano;
- RBAC/RLS/tenant isolation nao podem ser validados;
- o escopo mistura muitas areas sem corte seguro;
- a implementacao dependeria de suposicao nao verificavel;
- o Plano TDD nao consegue cobrir o risco principal e nao ha validacao substituta aceitavel.

Quando bloquear, registre:

- motivo do bloqueio;
- evidencia;
- decisao necessaria;
- alternativa segura;
- proximo passo para desbloquear.

## Artefatos gerados

- `_reversa_sdd/process/matching-report-template.md` preenchido no contexto da issue.
- Entrada em `_reversa_sdd/traceability/matching-log.md`.
- Atualizacao do Plano TDD com riscos/validacoes do Matching.
- Atualizacao do Prompt para Agente com skills/agentes/MCPs escolhidos.
