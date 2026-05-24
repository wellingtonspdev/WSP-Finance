# Analise Tecnica - WSP Finance

## Identificacao

- Issue: #31 - S5-003-[STORAGE] ExportArchive + Snapshot R2 de Exportações Domínio
- Agente: Antigravity
- Data: 2026-05-21
- Branch: 31-s5-003-storage-exportarchive-snapshot-r2-de-exportações-domínio
- Estado do git: limpo

```powershell
git status --short
# (vazio)
```

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

## Evidencias consultadas

| Fonte | Caminho | Linhas/funcoes relevantes | Observacao |
|---|---|---|---|
| Codigo | [ExportController.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/controllers/ExportController.ts) | `generate` | Método onde se integra o fluxo de arquivamento. |
| Codigo | [ExportService.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/services/ExportService.ts) | `generate` | Retorna buffer, hash e recordCount. Não deve ser alterada a lógica de negócio principal. |
| Codigo | [IStorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/IStorageProvider.ts) | interface | Deve ser estendida para suportar `uploadBuffer`. |
| Codigo | [S3StorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/S3StorageProvider.ts) | implementacao | Implementará `uploadBuffer` usando `PutObjectCommand`. |
| Codigo | [LocalStorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/LocalStorageProvider.ts) | implementacao | Implementará `uploadBuffer` salvando localmente em `backend/uploads/` e corrigirá `deleteFile`. |
| Codigo | [AuditLogService.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/services/AuditLogService.ts) | `logSync` | Aceita um client opcional (`tx`), permitindo execução dentro de transações. |
| Banco | [schema.prisma](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/prisma/schema.prisma) | model | Criar model `ExportArchive` com as FKs e campos necessários. |

## Fluxo tecnico atual

O controller `ExportController.generate` executa:
1. Validação de parâmetros de entrada.
2. Chamada de `ExportValidationService.validate`.
3. Chamada de `ExportService.generate` retornando Buffer, fileName, contentType, encoding, hash, recordCount e warnings.
4. Chamada síncrona de `AuditLogService.logSync` com a ação `EXPORT` e metadados no `newState` fora de transação.
5. Retorno do buffer para download com headers apropriados (Windows-1252, attachment).

## Diagnostico

- Causa confirmada: Não havia armazenamento do arquivo gerado nem registro operacional no model `ExportArchive`.
- O que foi descartado: Não alterar o contrato público de `ExportService.generate` nem mexer no layout Domínio.
- Lacunas ainda abertas: Apenas a criação dos arquivos de migração PostgreSQL e a integração segura de rollback/deleteFile do R2.

## Contratos e regras que nao podem quebrar

- [x] Prisma/schema: Adicionar `ExportArchive` e as relações em `Workspace` e `User`.
- [x] Zod/DTO: Validação de datas do controller (já implementada).
- [x] OpenAPI: `/export/generate` mantém retorno binário 200 ou 422/400/500/503.
- [x] Tipos frontend: Sem impacto (nenhuma mudança no frontend).
- [x] RBAC/RLS: `ExportArchive` deve ter RLS ativo com a policy `tenant_isolation_policy`.
- [x] Decimal/dinheiro: Sem impacto.
- [x] Auditoria: O `AuditLog` com a ação `EXPORT` deve referenciar `ExportArchive` e ser criado na mesma transação.
- [x] Tenant/workspace: Não usar `sysPrisma` para o arquivamento.

## Arquivos provavelmente envolvidos

| Arquivo | Motivo | Tipo de mudanca esperada |
|---|---|---|
| [schema.prisma](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/prisma/schema.prisma) | Adicionar o model `ExportArchive` | Nova tabela no esquema |
| [IStorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/IStorageProvider.ts) | Adicionar assinatura do `uploadBuffer` | Interface estendida |
| [S3StorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/S3StorageProvider.ts) | Implementar `uploadBuffer` no R2 | Código de integração SDK V3 |
| [LocalStorageProvider.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/providers/LocalStorageProvider.ts) | Implementar `uploadBuffer` local e fix `deleteFile` | Mock local |
| [ExportArchiveService.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/services/ExportArchiveService.ts) | Lógica de negócio de arquivamento | Novo arquivo |
| [ExportController.ts](file:///c:/Users/Wellington/Desktop/WSP-Finance/backend/src/controllers/ExportController.ts) | Integrar arquivamento no generate | Modificar generate |

## Testes existentes encontrados

| Teste | Cobre o que | Lacuna |
|---|---|---|
| `ExportController.test.ts` | Geração do arquivo e AuditLog | Não testa o R2 nem `ExportArchive` |
| `ExportService.test.ts` | Geração do layout de texto bruto | Não testa persistência física |

## Riscos tecnicos

| Risco | Severidade | Mitigacao |
|---|---|---|
| Vazamento de RLS | Crítico | Teste com transaction client e workspaceId diferente para garantir isolamento. |
| Vazamento de PII | Alto | objectKey gerado apenas com UUID e layoutId/workspaceId. Sem nomes ou e-mails. |
| Zombie files no R2 | Médio | Compensação best-effort com `deleteFile` em caso de falha de banco de dados. |

## Comandos de investigacao usados

```powershell
pnpm test -- tests/controllers/ExportController.test.ts
```

## Resultado da etapa

- Status: pronto para plano TDD
- Decisoes necessarias: Nenhuma pendente.
- Proximo passo: Executar o Matching Report e o Plano TDD.
