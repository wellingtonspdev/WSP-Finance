---
name: wsp-gsd-phase-orchestrator
description: Orquestra fases GSD no projeto WSP Finance com gates humanos, preservando baseline, escopo, RLS/RBAC/LGPD e separação por fase.
---

# WSP GSD Phase Orchestrator

Use esta skill quando o usuário pedir para iniciar, discutir, planejar ou executar uma fase do plano WSP Finance usando GSD/Codex.

## Objetivo

Conduzir uma fase por vez, sem pular gates.

Fluxo:

1. discutir fase;
2. planejar fase;
3. aguardar aprovação humana;
4. executar fase;
5. verificar fase;
6. corrigir gaps, se houver;
7. aguardar autorização para Git;
8. só então próxima fase.

## Comandos operacionais esperados

Para iniciar uma fase:

```text
/caveman lite
/gsd:discuss-phase N
```

Depois do contexto da fase:

```text
/gsd:plan-phase N --research
```

Só depois de aprovação humana:

```text
/caveman full
/gsd:execute-phase N
```

Depois da execução:

```text
/caveman lite
/gsd:verify-work N
```

Se houver gaps:

```text
/gsd:plan-phase N --gaps
/gsd:execute-phase N --gaps-only
/gsd:verify-work N
```

## Regras obrigatórias

- Não executar fase sem plano.
- Não executar fase sem escopo explícito.
- Não avançar para próxima fase com P0/P1/P2.
- Não fazer Git durante execução da fase.
- Não usar `git add .`.
- Não apagar baseline Telegram/OCR.
- Não descartar arquivos existentes.
- Não misturar fases.

## Antes de executar

Rodar ou solicitar:

```bash
git branch --show-current
git status --short -uall
git diff --stat
```

Classificar arquivos:

A. baseline herdado;
B. arquivos da fase atual;
C. arquivos de fases anteriores;
D. documentação GSD/UAT/Verification;
E. suspeitos/temporários.

## Durante execução

Permitir apenas arquivos dentro do escopo da fase.

Se tocar fora do escopo, parar e reportar.

Se precisar de migration não planejada, parar e reportar.

Se precisar alterar RLS/RBAC/Auth/AuditLog/Bridge/Transaction/BankMovement, destacar risco.

## Relatório final da fase

Entregar:

1. fase executada;
2. objetivo;
3. arquivos alterados;
4. arquivos novos;
5. arquivos preservados da baseline;
6. testes executados;
7. resultado dos testes;
8. `git diff --check`;
9. riscos P0/P1/P2/P3;
10. recomendação: verify-work, gaps ou Git finalization.

## Uso recomendado por fase

### Phase 0 — Discovery

- Usar `/caveman lite`.
- Usar `/gsd:discuss-phase 0`.
- Usar `/gsd:plan-phase 0 --research`.
- Não usar `/gsd:execute-phase 0`.
- Objetivo: apenas mapear código, dependências, riscos e plano de execução.

### Phase 1 — Core Hardening

- Planejar antes de executar.
- Verificar OTP, webhooks, rotas externas e testes focados.
- Não misturar com baseline Telegram/OCR.

### Phase 2 — Contratos UUID/Number e Conta Padrão

- Preservar:
  - `Transaction.id` como UUID/string.
  - `Account.id` como number.
  - `Workspace.id` como number.
- Não alterar schema sem plano explícito.
- Validar UAT e typecheck.

### Phase 3 — Bridge

- Tratar como fase sensível.
- Preservar atomicidade financeira.
- Não permitir alteração de saldo fora de transação segura.
- Exigir testes de saldo, tenant e idempotência quando aplicável.

### Phase 4 — Pró-labore Recorrente

- Tratar como fase crítica.
- Não executar sem plano revisado.
- Exigir atenção a cron, pendência, confirmação manual, idempotência e saldo insuficiente.

### Phase 5 — Telegram/OCR

- Preservar BankMovement como staging.
- Não criar Transaction direta.
- Não logar PII/raw OCR.
- Preservar vínculo/destino Telegram existente.

### Phase 6 — Frontend

- Ajustar UX sem quebrar contratos backend.
- Não reintroduzir `accountId` obrigatório em payloads simplificados.
- Validar build/testes frontend.
