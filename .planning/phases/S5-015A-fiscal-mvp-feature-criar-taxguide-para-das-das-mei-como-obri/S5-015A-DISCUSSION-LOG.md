# Phase S5-015A: [FISCAL/MVP][FEATURE] Criar TaxGuide para DAS/DAS-MEI como obrigacao financeira - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** S5-015A-[FISCAL/MVP][FEATURE] Criar TaxGuide para DAS/DAS-MEI como obrigacao financeira
**Areas discussed:** Modelo fiscal, Pagamento/vinculo, Uploads/status

---

## Modelo fiscal

| Question | Options | Selected |
|----------|---------|----------|
| Qual contrato usar para `TaxGuide.workspaceId`? | `workspaceId` number; `workspaceId` string; confirmar no schema antes de decidir | `workspaceId` number |
| Qual restricao de tipo de workspace aplicar? | Somente BUSINESS; criar so em BUSINESS, listar em qualquer workspace; aceitar qualquer workspace | Somente BUSINESS |
| Como validar competencia? | Mes/ano obrigatorios e unicos por tipo; duplicatas permitidas; `competenceDate` | Mes/ano obrigatorios e unicos por tipo |
| Qual status inicial e transicoes minimas? | Criar como PENDING sempre; permitir status no create; criar como OVERDUE se dueDate ja passou | Criar como PENDING sempre |

**Notes:** User selected the recommended path for all four questions. `workspaceId:string` from the issue is treated as a typo because WSP Finance preserves `Workspace.id` as number.

---

## Pagamento/vinculo

| Question | Options | Selected |
|----------|---------|----------|
| Qual contrato vale para marcar guia como paga? | PAID exige `paidTransactionId`; PAID sem Transaction; dois modos explicitos | PAID exige `paidTransactionId` |
| Quem pode marcar guia como paga? | So OWNER; ACCOUNTANT se ja houver Transaction; ACCOUNTANT pode pedir revisao | So OWNER |
| Como validar o vinculo com Transaction? | Mesma workspace e status pago; so mesma workspace; workspace, tipo e categoria fiscal | Mesma workspace e status pago |
| Quem pode cancelar uma guia? | So OWNER; OWNER e ACCOUNTANT; nao implementar cancelamento ativo | So OWNER |

**Notes:** Payment must link to an already-paid same-workspace `Transaction`. The feature must not create or alter `Transaction`.

---

## Uploads/status

| Question | Options | Selected |
|----------|---------|----------|
| Como o backend deve tratar guia e comprovante? | Provider de storage existente; upload local dedicado; arquivo no banco | Provider de storage existente |
| Qual validacao minima de arquivo aplicar? | PDF-only + limite de tamanho; PDF e imagem; qualquer arquivo autenticado | PDF-only + limite de tamanho |
| Como aplicar status OVERDUE? | Calcular em leitura/listagem + service command; cron; somente virtual | Calcular em leitura/listagem + service command |
| O que registrar em AuditLog de uploads/status? | Metadados minimos seguros; objectKey e filename original; payload completo sanitizado | Metadados minimos seguros |

**Notes:** Storage persists object keys only. AuditLog must not include raw PDF, sensitive raw payload, original filename with possible PII, or full request body.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
