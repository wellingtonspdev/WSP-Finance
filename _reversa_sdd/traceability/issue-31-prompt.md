Voce esta trabalhando no projeto WSP Finance.

Tarefa: #31 - S5-003-[STORAGE] ExportArchive + Snapshot R2 de Exportações Domínio

Contexto obrigatorio:
- Leia primeiro:
  - `_reversa_sdd/traceability/issue-31-analysis.md`
  - `_reversa_sdd/traceability/issue-31-technical-analysis.md`
  - `_reversa_sdd/traceability/issue-31-matching-report.md`
  - `_reversa_sdd/traceability/issue-31-tdd-plan.md`
- Consulte tambem os artefatos Reversa relacionados:
  - `_reversa_sdd/sdd/uploads-storage.md`
  - `_reversa_sdd/sdd/rbac-rls.md`
  - `_reversa_sdd/permissions.md`

Regra obrigatoria:
- Nao implemente diretamente sem seguir o plano TDD.
- Nao ignore o Matching Report; ele define skills, agentes/MCPs, riscos e bloqueios.
- Nao reanalise toda a arquitetura.
- Nao altere arquivos fora do escopo.
- Preserve alteracoes existentes do usuario.
- Não use `sysPrisma` para o arquivamento.

Objetivo:
Criar o model `ExportArchive` no banco e implementar a persistência física segura no R2 na geração de exportações Domínio. Garantir tratamento transacional com RLS e limpeza em caso de falha.

Escopo incluido:
- Model `ExportArchive` no Prisma e RLS no Postgres via migration aditiva (ON DELETE CASCADE no workspaceId, ON DELETE RESTRICT no createdByUserId).
- Assinatura e implementação de `uploadBuffer` em `IStorageProvider`, `S3StorageProvider` e `LocalStorageProvider`.
- Criação de `ExportArchiveService` para processar transação atômica de `ExportArchive` e `AuditLog`.
- Compensação best-effort com `deleteFile` no R2 se a transação do banco falhar.
- Integração de `ExportArchiveService` no `ExportController.generate` com tratamento específico para erro 503 HTTP nas falhas de persistência.

Fora de escopo:
- Alteração do layout Domínio, Windows-1252, CRLF ou ausência de BOM.
- Histórico de exportações no frontend.
- Rota de re-download ou URLs presigned públicas.

Arquivos provaveis:
- `backend/prisma/schema.prisma`
- `backend/src/providers/IStorageProvider.ts`
- `backend/src/providers/S3StorageProvider.ts`
- `backend/src/providers/LocalStorageProvider.ts`
- `backend/src/services/ExportArchiveService.ts`
- `backend/src/controllers/ExportController.ts`

Arquivos que nao devem ser alterados:
- Qualquer arquivo do frontend.
- `backend/src/services/ExportService.ts` (lógica principal de layout).

Matching:
- Skills obrigatorias: `tdd-orchestrator`, `nodejs-best-practices`, `sql-pro`, `backend-architect`, `powershell-windows`.
- Agentes/MCPs permitidos: Antigravity.
- Ferramentas descartadas/proibidas: `sysPrisma`.
- Riscos que devem ser cobertos: Falha R2, falha DB com compensação no R2, RLS no PostgreSQL, vazamento de PII.
- Criterios de bloqueio: Vazamento de RLS.

Plano TDD:
1. Criar os testes unitários e de integração em `backend/tests/services/ExportArchiveService.test.ts`.
2. Implementar a interface/classes de Storage, o `ExportArchiveService` e a integração no `ExportController`.
3. Executar as migrações locais e validar que todos os testes passam.

Validacoes obrigatorias:
```powershell
pnpm exec tsc --noEmit
pnpm test
pnpm exec prisma validate
```

Criterios de aceite:
- RLS ativo no model `ExportArchive` (padrão real do projeto).
- R2 com arquivo enviado sob chave opaca UUID sem PII.
- Transação atômica no DB com `ExportArchive` e `AuditLog`.
- Sem falso sucesso (erro 503 na falha de upload/DB).

Ao finalizar, entregue:
- Resumo do que mudou.
- Arquivos alterados.
- Testes/validacoes executados e resultados.
- Falhas ou comandos nao executados.
- Riscos residuais.
- Handoff curto para continuidade.
