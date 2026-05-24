# Plano TDD - WSP Finance

## Identificacao

- Issue: #31 - S5-003-[STORAGE] ExportArchive + Snapshot R2 de Exportações Domínio
- Agente: Antigravity
- Data: 2026-05-21
- Modulo: backend/accounting-export
- Matching Report: [matching-report](file:///c:/Users/Wellington/Desktop/WSP-Finance/_reversa_sdd/traceability/issue-31-matching-report.md)

## Objetivo testavel

> Provar que o buffer da exportação contábil é salvo fisicamente no Cloudflare R2 e seus metadados (id, sizeBytes, recordCount, sha256, opaco objectKey, contentType, encoding, warningsCount, retentionUntil) são associados no DB no model `ExportArchive` na mesma transação que um AuditLog de ação `EXPORT`, sob proteção estrita de RLS, limpando o arquivo no R2 caso a transação PostgreSQL falhe.

## Estrategia TDD

- Primeiro teste a escrever: Um teste unitário/integração para `ExportArchiveService.createArchive` verificando a criação feliz do archive no R2 e DB.
- Falha esperada antes da implementacao: `ExportArchiveService` não existe (Error: Cannot find module).
- Mudanca minima para passar: Criar o arquivo `ExportArchiveService.ts` e exportar a classe/método com mock do storage e prisma.
- Refatoracao permitida: Ajustes no tratamento de exceção e reaproveitamento do client do prisma.

## Entradas do Matching

- Skills/agentes/MCPs definidos: `tdd-orchestrator`, `nodejs-best-practices`, `sql-pro`, `backend-architect`.
- Riscos obrigatorios a cobrir:
  - Falha R2 -> Sem sucesso no DB e sem download.
  - Falha DB pós-upload -> Remoção best-effort no R2 e sem download (status 503).
  - Isolamento tenant via RLS -> Acesso cruzado de workspace bloqueado.
  - PII em log/objectKey -> objectKey opaco e AuditLog higienizado.
- Validacoes obrigatorias:
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm exec prisma validate`
- Criterios de bloqueio: Vazamento de RLS ou falha crítica de compilação TS.

## Cenarios de teste

### Caminho feliz

- [ ] Dado: Um workspace válido, usuário autenticado e buffer gerado.
- [ ] Quando: O `ExportArchiveService` processa o arquivamento.
- [ ] Entao: O arquivo é salvo no Storage, o registro `ExportArchive` e o `AuditLog` são persistidos juntos no banco com os campos `sha256`, `contentType`, `encoding`, `warningsCount` e `retentionUntil` (createdAt + 5 anos) corretos.

### Erros e validacoes

- [ ] Dado: StorageProvider lança exceção em `uploadBuffer`.
- [ ] Quando: O `ExportArchiveService` tenta arquivar.
- [ ] Entao: A operação é abortada, nenhum registro é criado no DB, e a exceção é propagada.

- [ ] Dado: O banco de dados falha ao persistir a transação pós-upload.
- [ ] Quando: O `ExportArchiveService` tenta arquivar.
- [ ] Entao: A transação faz rollback, o arquivo recém-criado no R2 é deletado (best-effort) via `deleteFile`, e a exceção é propagada.
- [ ] Entao (Falha no deleteFile): Se a compensação do deleteFile no R2 falhar, o erro original da transação de banco ainda deve ser propagado, impedindo download de falso sucesso.

### Permissao/RBAC/RLS

- [ ] Dado: Dois workspaces diferentes (Tenant A e Tenant B) com RLS ativado no PostgreSQL.
- [ ] Quando: Tentamos gravar ou ler dados de `ExportArchive` do Tenant A usando a sessão configurada para o Tenant B.
- [ ] Entao: O PostgreSQL nega o acesso (RLS) ou a query não retorna registros do outro tenant.

### Regressao

- [ ] Dado: A rota `/export/generate` é chamada com sucesso.
- [ ] Quando: O fluxo feliz executa.
- [ ] Entao: O arquivo continua sendo retornado como attachment de texto com encoding Windows-1252 e os cabeçalhos apropriados.

### Riscos vindos do Matching

- [ ] Dado: Novo log síncrono no `AuditLogService`.
- [ ] Quando: Executado como parte da transação do `ExportArchiveService`.
- [ ] Entao: O `newState` não contém dados brutos do arquivo, CPF, CNPJ, e-mail ou nomes de transações.
- [ ] Entao: A chave `objectKey` não expõe PII (e-mails, CPFs, CNPJ, nomes ou dados de transações).

## Tipo de teste

| Cenario | Unitario | Integracao | E2E | Manual | Observacao |
|---|---:|---:|---:|---:|---|
| Fluxo feliz arquivamento | | X | | | Integra DB (Prisma) e mock do Storage. |
| RLS Cross-tenant | | X | | | Testa policies do banco usando transação real com set_config. |
| Compensação pós-falha DB | X | | | | Testa chamada de `deleteFile` no StorageProvider simulando erro. |
| Sem PII no objectKey/Log | X | | | | Valida strings do objectKey e chaves de log. |

## Dados de teste

- Usuarios: ID 999 (contador do workspace 1).
- Workspaces: ID 1 e ID 2 (para teste de isolamento).
- Roles: ACCOUNTANT.
- Fixtures/mocks: `StorageProvider` mockado para capturar chamadas em testes unitários.

## Comandos planejados

Backend:

```powershell
pnpm exec tsc --noEmit
pnpm test -- tests/services/ExportArchiveService.test.ts
pnpm test -- tests/controllers/ExportController.test.ts
pnpm exec prisma validate
```

Geral:

```powershell
git status --short
```

## Criterios de conclusao

- [ ] Teste principal `ExportArchiveService.test.ts` criado e passando.
- [ ] Teste de RLS em `ExportArchive` passando.
- [ ] Alterações integradas em `ExportController` e todos os testes legados passando.
- [ ] `pnpm exec tsc --noEmit` sem erros.
