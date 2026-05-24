# Matching Report - WSP Finance

## Identificacao

- Issue: #31 - S5-003-[STORAGE] ExportArchive + Snapshot R2 de Exportações Domínio
- Data: 2026-05-21
- Agente de Matching: Antigravity
- Severidade: alta
- Matching: completo
- Branch: 31-s5-003-storage-exportarchive-snapshot-r2-de-exportações-domínio

## Resumo da decisao

> Deve-se utilizar as skills de arquitetura backend, banco de dados PostgreSQL/Prisma, TDD e Windows Powershell para implementar com segurança e isolamento tenant a persistência no R2 e metadados no Postgres, bloqueando qualquer vazamento de dados ou falso sucesso operacional.

## Entradas analisadas

- Analise da issue: Definida a persistência física segura no R2 e controle transacional no DB.
- Analise tecnica: Mapeados arquivos afetados e verificado comportamento de transações e RLS.
- Artefatos Reversa consultados: `_reversa_sdd/sdd/uploads-storage.md`, `_reversa_sdd/sdd/rbac-rls.md`, `_reversa_sdd/permissions.md`.
- Codigo/arquivos consultados: `ExportController.ts`, `ExportService.ts`, `IStorageProvider.ts`, `S3StorageProvider.ts`, `LocalStorageProvider.ts`, `AuditLogService.ts`, `schema.prisma`.
- Restricoes conhecidas: Sem alteração de layout Domínio, sem uso de `sysPrisma` no tenant flow, sem frontend.

## Modulos afetados

- [ ] auth
- [x] workspaces
- [x] rbac-rls
- [x] finance-core
- [x] uploads-storage
- [ ] imports-open-finance
- [ ] bank-movements
- [x] accountant
- [ ] external-data
- [ ] frontend-shell
- [ ] infra/CI
- [x] docs/processo

## Skills selecionadas

| Skill | Obrigatoria? | Motivo | Limite de uso |
|---|---:|---|---|
| `tdd-orchestrator` | sim | Garantir execução TDD-first e cobertura de cenários de erro e segurança. | Apenas validação de testes backend. |
| `nodejs-best-practices` | sim | Estruturar serviços TypeScript e tratamento assíncrono robusto. | Backend Node.js/Express. |
| `backend-architect` | sim | Validar o design entre Controller, ExportArchiveService e StorageProvider. | Backend |
| `sql-pro` | sim | Projetar o model Prisma, migração aditiva e garantir isolamento RLS. | Banco de dados / Prisma |
| `powershell-windows` | sim | Executar comandos de teste e migração em Windows PowerShell. | Console local |
| `windows-shell-reliability` | sim | Lidar com caminhos de arquivos e encoding no Windows. | Execução de comandos |
| `debugger` | sim | Diagnosticar eventuais erros durante a implementação TDD. | Resolução de bugs |
| `systematic-debugging` | sim | Resolver falhas de teste de forma metódica. | Resolução de bugs |
| `test-driven-development` | sim | Seguir o ciclo RED-GREEN-REFACTOR de testes. | Escrita de código |

## Agentes selecionados

| Agente | Papel | Motivo | Limite de atuacao |
|---|---|---|---|
| Antigravity | executor/revisor | Agente atual da sessão, responsável pelo planejamento e execução. | Backend/DB/Storage |

## MCPs/plugins/conectores

Não aplicável (sem uso de ferramentas externas não nativas).

## Ferramentas descartadas

| Ferramenta | Motivo do descarte |
|---|---|
| `sysPrisma` | Proibido o uso no fluxo de arquivamento tenant-scoped para não ignorar o RLS do Postgres. |
| Frontend Shell / UI | Fora do escopo da issue. |

## Riscos e mitigacoes

| Risco | Severidade | Mitigacao | Vira teste TDD? |
|---|---|---|---:|
| Falha R2 mascarada | alta | Lançar erro em `uploadBuffer` que interrompa a transação e retorne 503. | sim |
| Zombie files no R2 | media | `ExportArchiveService` captura erro do DB e chama `deleteFile` no R2 (compensação best-effort). | sim |
| Vazamento de RLS | critica | Teste cross-tenant garantindo que um workspaceId não lê nem cria dados de outro. | sim |
| PII exposta no storage | alta | objectKey gerado apenas com UUID opaco e layoutId. Sem nomes/e-mails. | sim |

## Impacto no Plano TDD

- Testes obrigatorios:
  - [x] Teste de `ExportArchiveService.createArchive` com upload de buffer e gravação no DB/AuditLog.
  - [x] Teste de isolamento cross-tenant (RLS) no banco para a tabela `ExportArchive`.
  - [x] Teste de falha na transação DB pós-upload acionando compensação `deleteFile`.
  - [x] Teste de falha no upload R2 interrompendo transação e não gravando no DB.
  - [x] Validar que `retentionUntil` é exatamente igual a `createdAt + 5 anos`.
  - [x] Validar que `sha256`, `contentType`, `encoding` e `warningsCount` são persistidos corretamente.
  - [x] Validar que `objectKey` não possui PII e que o TXT bruto não reside no DB/AuditLog.
- Validacoes obrigatorias:
  - [x] `pnpm exec tsc --noEmit`
  - [x] `pnpm test`
  - [x] `pnpm exec prisma validate`
- Testes negativos:
  - [x] Tentativa de gravar ou ler `ExportArchive` de outro workspace/tenant deve falhar (RLS).
  - [x] AuditLog sem dados sensíveis (PII) nas chaves proibidas.

## Impacto no Prompt para Agente

O prompt executor deve incluir:

- Skills obrigatorias: `tdd-orchestrator`, `nodejs-best-practices`, `sql-pro`, `backend-architect`, `powershell-windows`.
- Agentes/MCPs permitidos: Antigravity.
- Agentes/MCPs proibidos: Qualquer bypasser de RLS (`sysPrisma`) ou ferramentas não homologadas.
- Arquivos provaveis: `schema.prisma`, `IStorageProvider.ts`, `S3StorageProvider.ts`, `LocalStorageProvider.ts`, `ExportArchiveService.ts`, `ExportController.ts`.
- Fora de escopo: Frontend, layout do arquivo TXT.
- Validacoes obrigatorias: Verificação de testes unitários e de integração.
- Criterios de parada: Sucesso em todos os testes e compilação TS limpa.

## Criterios de bloqueio avaliados

- [x] Risco grave sem mitigacao. (Mitigado)
- [x] Falta decisao de produto. (Definida)
- [x] Risco de segredo/PII/dado financeiro. (Mitigado)
- [x] MCP/conector sem autorizacao. (Nenhum usado)
- [x] Migracao/destruicao de dados sem plano. (Aditiva apenas, sem perda)
- [x] RBAC/RLS/tenant sem validacao possivel. (Validável via RLS Tests)
- [x] Escopo amplo demais. (Controlado)
- [x] TDD nao cobre risco principal. (Cobre completamente)

## Veredito

- [x] Pode seguir para Plano TDD.
- [ ] Pode seguir com ressalvas.
- [ ] Bloqueado.

Justificativa: Todos os riscos operacionais foram identificados e possuem mitigação técnica clara que será validada por testes automatizados sob TDD.

## Registro para matching-log

```markdown
| Data | Issue | Severidade | Matching | Skills/agentes/MCPs | Veredito | Observacao |
|---|---|---|---|---|---|---|
| 2026-05-21 | #31 - S5-003 | alta | completo | tdd-orchestrator, nodejs-best-practices, sql-pro | seguir | Pronto para TDD |
```
