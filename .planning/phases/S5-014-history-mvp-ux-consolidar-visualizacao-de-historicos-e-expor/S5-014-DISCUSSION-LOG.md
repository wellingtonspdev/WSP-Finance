# Phase S5-014: [HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-01T02:30:27.2957517-03:00
**Phase:** S5-014-[HISTORY/MVP][UX] Consolidar visualizacao de historicos e exportacoes
**Areas discussed:** Tela e fluxo, Dados exibidos, Acesso e workspace

---

## Tela e fluxo

| Question | Option | Selected |
|----------|--------|----------|
| Onde o historico deve aparecer? | Dentro do Extrato | yes |
| Onde o historico deve aparecer? | Pagina propria | |
| Onde o historico deve aparecer? | Dentro do modal Dominio | |
| Como abrir a lista? | Botao ao lado de Exportar Dominio | yes |
| Como abrir a lista? | Segmento dentro da area de filtros | |
| Como abrir a lista? | Drawer/modal de historico | |
| Ao clicar em Historico, o que acontece? | Lista inline abaixo dos filtros | yes |
| Ao clicar em Historico, o que acontece? | Painel lateral/drawer | |
| Ao clicar em Historico, o que acontece? | Modal dedicado | |
| A lista inline deve ficar sempre visivel ou recolhida? | Recolhida por padrao | yes |
| A lista inline deve ficar sempre visivel ou recolhida? | Aberta por padrao | |
| A lista inline deve ficar sempre visivel ou recolhida? | Aberta quando ha exportacao recente | |

**User's choice:** Historico dentro do Extrato, botao ao lado de Exportar Dominio, lista inline abaixo dos filtros, recolhida por padrao.
**Notes:** User selected the smallest integrated MVP path.

---

## Dados exibidos

| Question | Option | Selected |
|----------|--------|----------|
| Qual formato de cada registro? | Linha compacta | |
| Qual formato de cada registro? | Card compacto | yes |
| Qual formato de cada registro? | Tabela desktop + card mobile | |
| Quais campos ficam sempre visiveis no card? | Essenciais apenas | |
| Quais campos ficam sempre visiveis no card? | Essenciais + contadores | yes |
| Quais campos ficam sempre visiveis no card? | Todos incluindo hash | |
| Onde mostrar usuario responsavel e hash? | Detalhes expansiveis | yes |
| Onde mostrar usuario responsavel e hash? | Texto secundario no card | |
| Onde mostrar usuario responsavel e hash? | Hash abre via copiar/ver | |
| Como mostrar hash? | Hash completo em monospace | |
| Como mostrar hash? | Hash truncado + copiar completo | yes |
| Como mostrar hash? | Somente botao copiar hash | |

**User's choice:** Card compacto com campos essenciais e contadores visiveis; usuario e hash em detalhes expansiveis; hash truncado com copia completa.
**Notes:** Balances auditability with visual density.

---

## Acesso e workspace

| Question | Option | Selected |
|----------|--------|----------|
| Quem ve o botao Historico? | Mesmo gate do Exportar Dominio | yes |
| Quem ve o botao Historico? | Somente ACCOUNTANT | |
| Quem ve o botao Historico? | Todos com permissao de leitura | |
| Se a API de historico retornar 403, o que a UI mostra? | Mensagem curta de permissao | yes |
| Se a API de historico retornar 403, o que a UI mostra? | Ocultar historico silenciosamente | |
| Se a API de historico retornar 403, o que a UI mostra? | Toast + recolher painel | |
| Estado vazio quando nao ha exportacoes? | Mensagem simples + CTA exportar | yes |
| Estado vazio quando nao ha exportacoes? | Mensagem simples sem CTA | |
| Estado vazio quando nao ha exportacoes? | Card informativo com periodo/layout | |
| Backend deve ter rota de listagem em qual formato? | Workspace route | yes |
| Backend deve ter rota de listagem em qual formato? | Export route global | |
| Backend deve ter rota de listagem em qual formato? | Aproveitar endpoint existente de download | |

**User's choice:** Same UI permission gate as Exportar Dominio, in-panel 403 message, empty state with export CTA, backend route `GET /workspaces/:workspaceId/exports`.
**Notes:** Chosen route aligns with existing secure download path.

---

## the agent's Discretion

- Exact copy, icons, loading skeleton, query key names, and safe DTO field naming may follow existing code patterns.

## Deferred Ideas

- None.
