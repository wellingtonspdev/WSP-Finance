# Analise de Escopo e MVP - WSP Finance

> Gerado em 2026-05-03 a partir do escopo `D:\Downloads\WSP_Finance_Escopo.docx.pdf`, dos artefatos Reversa e de buscas pontuais no codigo-fonte.

## Conclusao executiva

O projeto esta alinhado com a espinha dorsal tecnica e com parte relevante do MVP financeiro: autenticacao, workspaces PF/PJ, RBAC/RLS, transacoes, contas, dashboard, Bridge Service, uploads/R2, staging de movimentos bancarios, importacao OFX/Open Finance webhook, dados externos CNPJ/CEP, Hub do Contador parcial e cofre de certificado A1.

Ainda nao esta completo se o PDF for tratado como MVP integral. Os maiores blocos faltantes sao NFS-e Nacional, Fiscal Linter/IA, worker assincrono com outbox e mascaramento PII, widget Belvo embarcado, De-Para ERP, WhatsApp/OCR BPO, Backoffice/Super Admin, billing via Stripe/Asaas e evidencias de deploy/operacao produtiva.

Recomendacao: tratar o estado atual como "MVP Core em construcao", nao como MVP final. Antes de release, fechar primeiro os bloqueios de contrato/seguranca ja apontados pelo Reversa e decidir quais itens do PDF ficam obrigatorios no MVP 1 ou post-MVP.

## Base de evidencia

- Escopo mestre: `D:\Downloads\WSP_Finance_Escopo.docx.pdf` com 14 paginas textuais.
- Estado Reversa: `.reversa/state.json` indica fases 1 a 5 concluidas, `doc_level=detalhado`, status `concluido`.
- Perguntas pendentes: `_reversa_sdd/questions.md`.
- Gaps revisados: `_reversa_sdd/gaps.md`.
- Relatorio de confianca: `_reversa_sdd/confidence-report.md`, confianca geral estatica de 98,9%.
- Buscas pontuais em `backend/src`, `backend/prisma`, `frontend/src` e `.github`, excluindo `node_modules`, `dist`, `coverage`, `build`.

## O que o escopo responde das perguntas pendentes

| Pergunta Reversa | O PDF responde? | Leitura do escopo |
|---|---|---|
| 1. `ACCOUNTANT` pode enviar/substituir certificado A1? | Parcialmente | O PDF exige Health Check de certificado A1 no Hub do Contador e proibe acesso humano a senhas do cofre A1. Ele confirma monitoramento pelo contador, mas nao confirma permissao de upload/substituicao. A regra atual OWNER-only nao e contradita, mas a operacao contabil pode exigir um fluxo de solicitacao/aprovacao. |
| 2. `JWT_SECRET` ausente deve quebrar startup? | Nao | O PDF fala de LGPD, RLS e seguranca, mas nao define politica de segredo JWT. Pela criticidade, fallback produtivo deve ser tratado como bloqueio de hardening. |
| 3. OTP deve usar gerador criptografico? | Nao | O PDF nao define politica de OTP. Como e fluxo de posse de e-mail/reset, recomendacao tecnica e usar `crypto` e remover `Math.random`. |
| 4. Provider de e-mail produtivo? | Nao | O PDF nao escolhe SMTP, SES, Resend, SendGrid etc. A implementacao atual com Ethereal e adequada para dev/teste, nao como operacao produtiva. |
| 5. CNPJ/CEP devem ser publicos ou autenticados/rate-limited? | Parcialmente | O PDF exige autocomplete CNPJ/CEP no produto, mas nao define exposicao publica. Como ha custo/abuso em providers externos, a decisao segura para MVP e exigir auth e rate limit. |
| 6. Webhook Open Finance pode usar fallback mock? | Parcialmente | O PDF exige ingestao bancaria agnostica e segura, com staging antes do ledger. Nao define env fallback, mas mock em producao conflita com integracao bancaria sensivel. |
| 7. Feed lateral do contador com `mockEvents` e produto real? | Parcialmente | O PDF define Hub do Contador gerenciado por excecao. Se o feed representa excecoes operacionais, ele deve ser backend real/persistido/auditavel; mock pode ficar apenas como prototipo nao produtivo. |
| 8. `Transaction.id` oficial e UUID string? | Nao explicitamente | O PDF nao define tipo de ID. O codigo define `Transaction.id` como UUID string no Prisma; portanto o contrato deve seguir string em todas as camadas. |

## Aderencia confirmada ao escopo

| Area do escopo | Status atual | Evidencia principal |
|---|---|---|
| Modular monolith Node/TS/Express/Prisma/Postgres | Aderente | Estrutura backend TypeScript, Prisma e PostgreSQL em `backend/src` e `backend/prisma/schema.prisma`. |
| Dinheiro com `Decimal(19,4)` | Aderente | `Account.balance` e `Transaction.amount` usam `@db.Decimal(19, 4)`. |
| Workspaces PF/PJ isolados | Aderente em base | `WorkspaceType` tem `PERSONAL` e `BUSINESS`; `WorkspaceMember` vincula usuario a workspace. |
| RBAC/RLS e runtime sem bypass | Aderente em base | `checkEnvironment.ts`, `server.ts`, `tenantContext.ts` e testes RLS validam `NOSUPERUSER/NOBYPASSRLS`. |
| Bridge Service patrimonial | Parcialmente aderente | `BridgeService` cria debito/credito atomicos e auditoria; ha gap tecnico: `crypto.randomUUID()` sem import explicito. |
| Marketplace reverse calculation | Parcialmente aderente | `TransactionService` calcula `grossAmount`, `marketplaceFee`, `shippingCost`, `taxAmount`, `netValue`; ainda nao ha integracao real com Shopee/Mercado Livre. |
| Provisao tributaria | Parcialmente aderente | `Workspace.taxRate`, `Transaction.taxAmount` e calculos existem; falta "lock" visual/operacional completo do saldo reservado. |
| Staging bancario antes do ledger | Aderente em base | `BankMovement` e `FinancialIngestionEngine` recebem OFX/Open Finance antes de virar `Transaction`. |
| Open Finance | Parcialmente aderente | Existe webhook e staging, mas nao foi encontrado widget Belvo embarcado nem limite/sandbox Belvo implementado. |
| Uploads fora do banco | Aderente em base | Provider S3/R2 e URLs assinadas existem; binarios nao sao armazenados no Postgres. |
| Certificado A1 | Parcialmente aderente | Campos `certificateObjectKey` e `certificateExpiresAt`, upload e alerta existem; falta escopo final de permissao e procuracao eletronica. |
| Hub do Contador | Parcialmente aderente | Cache, listagem de clientes e pendencias existem; parte do feed ainda e mock/prototipo. |
| CI com Vitest/Playwright/SonarCloud | Parcialmente aderente | `.github/workflows/ci.yml` contem backend tests, frontend smoke Playwright e SonarCloud; nao foi validado nesta analise se a pipeline esta verde. |

## Lacunas contra o MVP descrito no PDF

### Bloqueios para release do MVP Core

1. Remover fallbacks inseguros em producao:
   - `JWT_SECRET || 'super-secret-key-change-me'`.
   - `OPEN_FINANCE_WEBHOOK_KEY || 'webhook-auth-key-mock'`.
2. Corrigir contrato `Transaction.id`: Prisma usa UUID string, frontend ainda tipa `id: number`.
3. Proteger/rate-limitar endpoints externos CNPJ/CEP, ou registrar decisao explicita de produto.
4. Definir provider real de e-mail para verificacao/reset.
5. Trocar OTP baseado em `Math.random` por gerador criptografico.
6. Corrigir `BridgeService` com import/uso seguro de `crypto.randomUUID`.
7. Decidir se contador pode operar certificado A1 ou apenas monitorar.
8. Remover, esconder ou rotular `mockEvents`/feed prototipo no Hub do Contador.
9. Rodar gates reais antes de considerar MVP validado: typecheck, build, testes backend, testes frontend e smoke E2E.

### Funcionalidades do PDF ainda nao comprovadas como implementadas

| Item do escopo | Status |
|---|---|
| Emissor Nacional de NFS-e | Nao encontrado como modulo backend/API; aparecem apenas textos de UI/documento. |
| Fiscal Linter com IA | Nao encontrado como motor real. |
| Gemini/Vertex AI com processamento no Brasil | Nao encontrado. |
| Transactional Outbox para IA/async | Nao encontrado. |
| Mascaramento PII / Zero Data Retention operacional | Nao comprovado. |
| Widget Belvo no-code embarcado | Nao encontrado. |
| Limite operacional Belvo sandbox 25 contas | Nao encontrado. |
| Exportacao De-Para para Dominio/Contmatic/Alterdata | Nao encontrado como engine. |
| WhatsApp BPO + OCR de comprovantes | Nao encontrado; apenas convite compartilhavel por WhatsApp e enum `OCR`. |
| Backoffice/Super Admin com `systemRole=ADMIN` | Nao encontrado no schema/modelo. |
| Bloqueio LGPD para admin ver apenas totais matematicos | Nao comprovado. |
| Billing via Stripe/Asaas webhooks | Nao encontrado. |
| Modo IR sazonal | Nao encontrado como fluxo completo. |
| Relatorios densos desktop/Pareto 80/20 | Nao comprovado. |
| Modo privado/ocultar valores | Nao comprovado. |
| Health check de procuracao eletronica e-CAC/prefeitura | Nao encontrado. |
| Deploy Render/UptimeRobot/Supabase/R2 documentado por config executavel | Parcial/nao comprovado. |

## MVP recomendado em cortes

### MVP Core minimo para release controlado

- Auth com e-mail verificado, refresh token e reset seguro.
- Workspaces PF/PJ com isolamento, RBAC/RLS e troca visual de contexto.
- Contas, categorias, transacoes, dashboard e anexos.
- Bridge PF/PJ atomico e auditado.
- Importacao OFX e webhook Open Finance para staging.
- Aprovacao/rejeicao de movimentos bancarios.
- Hub do Contador com lista real de clientes, pendencias reais e certificado A1 visivel.
- Autocomplete CNPJ/CEP protegido.
- OpenAPI/Swagger consistente.
- CI minima verde.

### MVP do PDF completo

Para dizer que o MVP esta concluido conforme o documento de escopo mestre, alem do MVP Core ainda faltam:

- NFS-e Nacional.
- Belvo widget embarcado.
- Fiscal Linter/IA com worker, outbox, PII masking e politica LGPD.
- Provisao tributaria bloqueando saldo disponivel, nao apenas calculando imposto.
- Exportador De-Para para ERP contabil.
- WhatsApp/OCR BPO.
- Billing com gateway externo e webhooks.
- Backoffice/Super Admin limitado por LGPD.
- Evidencia de deploy/operacao em Supabase/Render/R2/UptimeRobot ou stack equivalente.

## Parecer final

O desenvolvimento segue a direcao arquitetural do escopo e ja cobre a base financeira multi-tenant. Porem, o documento de escopo e mais amplo do que o que esta implementado hoje. O caminho pragmatico e fechar primeiro o MVP Core com seguranca e contratos consistentes, depois transformar as funcionalidades avancadas do PDF em epicos separados com criterio claro de entrada no MVP 1 ou pos-MVP.
