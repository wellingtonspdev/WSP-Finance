---
name: wsp-gsd-git-finalizer
description: Finalização Git seletiva por fase no WSP Finance, evitando git add ., mistura de fases e perda de baseline.
---

# WSP GSD Git Finalizer

Use esta skill quando o usuário autorizar finalização Git de uma fase já verificada.

## Pré-condição obrigatória

Só finalizar Git se a fase tiver:

- UAT aprovado;
- verify-work aprovado;
- zero P0/P1/P2;
- arquivos da fase identificados;
- autorização explícita do usuário.

## Regras absolutas

- Não alterar código.
- Não rodar correções.
- Não usar `git add .`.
- Não usar `git reset`.
- Não usar `git clean`.
- Não usar `git stash`.
- Não fazer push sem autorização explícita.
- Não incluir arquivos de outras fases.
- Não incluir baseline Telegram/OCR fora do escopo da fase.
- Não incluir arquivos temporários sem autorização.

## Auditoria antes do stage

Executar:

```bash
git branch --show-current
git log --oneline -5
git status --short -uall
git diff --stat
git diff --name-status
git diff --check
```

Depois classificar:

A. arquivos da fase a commitar;
B. arquivos de outras fases;
C. baseline herdado;
D. documentação GSD da fase;
E. arquivos temporários/suspeitos.

Se houver dúvida, parar e pedir confirmação.

## Stage seletivo

Nunca usar:

```bash
git add .
```

Usar apenas:

```bash
git add <arquivo-1> <arquivo-2> <arquivo-3>
```

Depois validar:

```bash
git diff --cached --stat
git diff --cached --name-status
git diff --cached --check
git status --short -uall
```

Se `git diff --cached --check` apontar erro, parar e reportar. Não corrigir sem autorização.

## Commits por fase

Usar mensagem específica por fase.

### Phase 1 — Core Hardening

```bash
git commit -m "fix: fortalece OTP e autenticação de endpoints externos"
```

### Phase 2 — Contratos/Conta padrão

```bash
git commit -m "feat: simplifica transações com conta padrão"
```

### Phase 3 — Bridge

```bash
git commit -m "feat: resolve contas padrão no bridge"
```

### Phase 5 — Telegram

```bash
git commit -m "feat: vincula destino Telegram por workspace"
```

### Phase 6 — Frontend

```bash
git commit -m "feat: simplifica UX de contas e impostos"
```

### Phase 4 — Pró-labore recorrente

```bash
git commit -m "feat: adiciona pendências recorrentes de pró-labore"
```

## Relatório final obrigatório

Informar:

1. branch atual;
2. fase finalizada;
3. arquivos staged;
4. arquivos deixados fora;
5. resultado de `git diff --cached --stat`;
6. resultado de `git diff --cached --name-status`;
7. resultado de `git diff --cached --check`;
8. hash do commit;
9. confirmação se push foi feito ou não;
10. status final da working tree;
11. riscos ou follow-ups P3.

## Fluxo recomendado quando Phase 1 e Phase 2 estão pendentes

Se Phase 1 e Phase 2 foram executadas sem commit:

1. auditar estado atual;
2. identificar arquivos exatos da Phase 1;
3. finalizar commit seletivo da Phase 1;
4. identificar arquivos exatos da Phase 2;
5. finalizar commit seletivo da Phase 2;
6. só então avançar para Phase 3.

Nunca misturar Phase 1 e Phase 2 em um único commit sem autorização explícita.
