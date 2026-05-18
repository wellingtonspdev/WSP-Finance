# WSP Finance — Checklist de Validação Técnica da Sprint 4

> **Versão:** 1.0
> **Criado em:** 2026-05-18
> **Origem:** STAB-4.3 — Padronização do checklist de validação Sprint 4
> **Tipo:** Documento operacional, reproduzível, Windows-first

---

## 1. Objetivo

Este documento estabelece o checklist oficial e reproduzível para validação técnica da Sprint 4 do projeto WSP Finance.

Ele padroniza:

- os comandos corretos para ambiente Windows local;
- três níveis de validação (mínima, intermediária e completa);
- o tratamento de falhas ambientais conhecidas;
- a Definition of Done técnica da Sprint 4;
- os itens que são follow-up e não bloqueiam o fechamento.

O checklist foi criado para que qualquer desenvolvedor consiga reproduzir a validação de forma determinística, sem ambiguidade de ambiente ou de escopo.

---

## 2. Quando usar este checklist

| Situação | Nível recomendado |
|---|---|
| Verificação rápida antes de commit pontual | Validação mínima (§6) |
| Revisão de PR ou code review parcial | Validação intermediária (§7) |
| Fechamento oficial da Sprint 4 | Validação completa backend (§8) + frontend (§9) |
| Investigação de falha em CI ou sandbox | Tratamento de falhas ambientais (§10) |

---

## 3. Pré-condições

Antes de executar qualquer nível deste checklist, confirme:

- [ ] **STAB-4.1** (Hardening de JWT_SECRET) está mergeada na branch de validação.
- [ ] **STAB-4.2** (Cleanup do CategoryService.test.ts) está mergeada na branch de validação.
- [ ] Working tree limpa (`git status --short -uall` sem saída).
- [ ] Dependências instaladas (`node_modules` presente em `backend/` e `frontend/`).
- [ ] Arquivo `.env` do backend configurado com `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET` válidos.
- [ ] PostgreSQL acessível e com o banco local/de teste compatível com o schema da branch usada na validação. Este checklist não instrui a executar migrations.

> **Atenção:** Não execute `pnpm install`, `prisma migrate dev` ou `prisma db push` como parte deste checklist. Se as dependências ou migrações estiverem desatualizadas, resolva antes de iniciar a validação.

---

## 4. Observações para Windows

### 4.1. TypeScript Compiler (tsc)

No Windows, o comando `pnpm exec tsc --noEmit` pode falhar silenciosamente ou resolver o binário errado. O comando seguro e verificado é:

```powershell
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
```

Esse formato garante que o binário local do projeto é usado, evitando conflito com instalações globais.

### 4.2. Vitest — filtros por caminho exato

Filtros genéricos de diretório como:

```powershell
# ⚠️ Funciona, mas é impreciso — pode capturar arquivos inesperados
pnpm test -- tests/lib
pnpm test -- tests/config
```

São menos precisos e podem incluir testes fora do escopo da Sprint 4. Para validação oficial, **sempre use caminhos exatos de arquivo**:

```powershell
# ✅ Correto — arquivo exato
pnpm test -- tests/lib/sanitizer.test.ts
pnpm test -- tests/config/exportLayout.test.ts
```

### 4.3. Separadores de caminho

O Vitest aceita tanto `/` quanto `\` no Windows, mas por consistência, este documento usa `/` nos caminhos de teste (compatível com ambos os ambientes).

---

## 5. Comandos que devem ser evitados

| Comando | Problema | Alternativa segura |
|---|---|---|
| `pnpm exec tsc --noEmit` | Pode resolver binário global ou falhar silenciosamente no Windows | `pnpm exec .\node_modules\.bin\tsc.CMD --noEmit` |
| `pnpm test -- tests/lib` | Filtro de diretório impreciso | Usar caminho exato de cada arquivo |
| `pnpm test -- tests/config` | Filtro de diretório impreciso | Usar caminho exato de cada arquivo |
| `pnpm test -- tests/services` | Pode incluir testes de sprints futuras | Listar arquivos exatos da Sprint 4 |
| `npx tsc --noEmit` | Usa npx, pode baixar versão diferente | `pnpm exec .\node_modules\.bin\tsc.CMD --noEmit` |

---

## 6. Validação mínima

Use para verificação rápida antes de um commit pontual. Cobre integridade do schema, compilação e o teste mais sensível da sprint (CategoryService após STAB-4.2).

```powershell
# Raiz do projeto
git status --short -uall
git diff --check

# Backend
cd backend
pnpm run prisma:validate
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
pnpm test -- tests/services/CategoryService.test.ts
```

### Critério de aprovação

- `git status` sem saída (working tree limpa).
- `git diff --check` sem saída (sem problemas de whitespace).
- `prisma:validate` sem erros.
- `tsc --noEmit` sem erros.
- `CategoryService.test.ts` — todos os testes passando.

---

## 7. Validação intermediária

Use para revisão de PR ou code review parcial. Inclui os testes core da Sprint 4: sanitização, encoding, layout de exportação, serviços de configuração e AuditLog/RLS.

```powershell
# Raiz do projeto
git status --short -uall
git diff --check

# Backend
cd backend
pnpm run prisma:validate
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
pnpm test -- tests/services/CategoryService.test.ts
pnpm test -- tests/lib/sanitizer.test.ts
pnpm test -- tests/lib/encoding.test.ts
pnpm test -- tests/config/exportLayout.test.ts
pnpm test -- tests/services/AccountingExportConfigService.test.ts
pnpm test -- tests/services/AccountingExportMappingService.test.ts
pnpm test -- tests/services/AuditLogService.test.ts
pnpm test -- tests/services/AuditLogServiceRLS.test.ts
```

### Critério de aprovação

- Todos os critérios da validação mínima (§6).
- Todos os 8 arquivos de teste listados acima passando individualmente.

---

## 8. Validação completa backend

Use para o fechamento oficial da Sprint 4. Inclui todos os testes da validação intermediária mais os testes de exportação end-to-end.

```powershell
# Raiz do projeto
git status --short -uall
git diff --check

# Backend
cd backend
pnpm run prisma:validate
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
pnpm test -- tests/services/CategoryService.test.ts
pnpm test -- tests/lib/sanitizer.test.ts
pnpm test -- tests/lib/encoding.test.ts
pnpm test -- tests/config/exportLayout.test.ts
pnpm test -- tests/services/AccountingExportConfigService.test.ts
pnpm test -- tests/services/AccountingExportMappingService.test.ts
pnpm test -- tests/services/AuditLogService.test.ts
pnpm test -- tests/services/AuditLogServiceRLS.test.ts
pnpm test -- tests/services/ExportFormatter.test.ts
pnpm test -- tests/services/ExportLayoutEngine.test.ts
pnpm test -- tests/services/ExportService.test.ts
pnpm test -- tests/services/ExportValidationService.test.ts
pnpm test -- tests/controllers/ExportController.test.ts
```

### Critério de aprovação

- Todos os critérios da validação intermediária (§7).
- Todos os 13 arquivos de teste listados acima passando individualmente.
- Nenhum teste com status `skip` não-documentado.

---

## 9. Validação frontend

Execute **após** a validação completa backend (§8) ter passado.

```powershell
# Frontend
cd frontend
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
pnpm test -- ExportDominioModal
```

### Alternativa com caminho exato (preferida para fechamento oficial)

```powershell
cd frontend
pnpm exec .\node_modules\.bin\tsc.CMD --noEmit
pnpm test -- tests/features/transactions/ExportDominioModal.test.tsx
```

### Critério de aprovação

- `tsc --noEmit` frontend sem erros.
- `ExportDominioModal` — todos os testes passando.

---

## 10. Tratamento de falhas ambientais

### 10.1. Spawn EPERM no Vitest (Windows / sandbox)

**Sintoma:** Vitest falha com `Error: spawn EPERM` ou `EACCES` durante execução em ambiente sandbox (VS Code integrado, Windows Defender sandbox, etc.).

**Procedimento:**

1. **Não classifique como falha funcional imediatamente.**
2. Feche o terminal integrado do editor.
3. Abra um terminal PowerShell independente (fora do sandbox/editor).
4. Re-execute o mesmo comando de teste.
5. Se passar no terminal independente: **falha ambiental confirmada** — não bloqueia.
6. Se falhar novamente com erro funcional diferente de EPERM: **falha funcional** — investigar.

**Registro obrigatório para falhas ambientais:**

```markdown
- Comando: [comando executado]
- Erro: [mensagem de erro]
- Ambiente: [terminal integrado / sandbox / terminal independente]
- Resultado do rerun: [passou / falhou com erro X]
- Classificação: [ambiental / funcional]
```

### 10.2. Porta ocupada ou timeout de banco

Se testes falharem com `ECONNREFUSED` ou timeout:

1. Verifique se o PostgreSQL está rodando.
2. Verifique se `.env` aponta para o banco correto.
3. Re-execute. Se persistir, é bloqueador de ambiente — registre e escale.

### 10.3. Regra geral

> Só classifique como **falha funcional da Sprint 4** se o erro se reproduzir em ambiente normal (terminal independente, sem sandbox, com banco acessível).

---

## 11. Itens fora de escopo da Sprint 4

Os itens abaixo **não bloqueiam** o fechamento da Sprint 4. São follow-ups planejados para Sprint 5 ou posteriores:

| Item | Destino |
|---|---|
| Snapshot R2 (storage de arquivos exportados) | Sprint 5 |
| Presigned URL para download | Sprint 5 |
| Histórico de exportações | Sprint 5+ |
| Re-download de exportações anteriores | Sprint 5+ |
| ExportBatch (exportação em lote) | Sprint 5+ |
| ExportArchive (arquivamento de exportações) | Sprint 5+ |
| Suporte multi-ERP (além do Domínio) | Backlog |
| Formato fixed-width | Backlog |
| UI avançada de config/mapping | Backlog |

> **Importante:** O Snapshot R2 está documentado como follow-up da Sprint 5. Ele **não é** um bug ou bloqueador da Sprint 4.

---

## 12. Definition of Done técnica da Sprint 4

Todos os itens abaixo devem estar confirmados para considerar a Sprint 4 tecnicamente fechada:

- [ ] STAB-4.1 (Hardening JWT_SECRET) mergeada na branch de validação.
- [ ] STAB-4.2 (Cleanup CategoryService.test.ts) mergeada na branch de validação.
- [ ] Working tree limpa (`git status --short -uall` sem saída).
- [ ] Backend `prisma:validate` passou sem erros.
- [ ] Backend typecheck Windows passou (`pnpm exec .\node_modules\.bin\tsc.CMD --noEmit`).
- [ ] Testes backend completos da Sprint 4 passaram (todos os 13 arquivos da §8).
- [ ] Frontend typecheck passou (`pnpm exec .\node_modules\.bin\tsc.CMD --noEmit`).
- [ ] `ExportDominioModal` teste passou.
- [ ] `git diff --check` limpo (sem problemas de whitespace).
- [ ] Snapshot R2 registrado como follow-up Sprint 5 (não é bloqueador).

---

## 13. Próximos passos após checklist verde

1. **Revisão técnica:** Submeter este checklist preenchido para review por um segundo desenvolvedor.
2. **Merge da branch de validação:** Após aprovação, merge na branch principal (`main` ou `develop`).
3. **Tag de release:** Se aprovado pelo Tech Lead, avaliar a criação de uma tag de fechamento (ex.: `sprint-4-done`) após merge.
4. **Handoff para Sprint 5:** Registrar os itens da §11 como issues da Sprint 5.
5. **Atualização do SDD:** Atualizar `_reversa_sdd/` com o status final da Sprint 4.

---

> **Nota final:** Este checklist foi gerado pela STAB-4.3 e deve ser tratado como documento vivo. Atualizações devem ser feitas via PR com revisão, nunca por edição direta na branch principal.
