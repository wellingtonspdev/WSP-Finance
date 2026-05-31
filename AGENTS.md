# AGENTS.md — WSP Finance / Reversa + Codex + GSD

# Reversa

> Framework de Engenharia Reversa instalado neste projeto.

## Como usar

Digite `reversa` para ativar o Reversa e iniciar ou retomar a análise do projeto.

## Comportamento ao ativar

Quando o usuário digitar `reversa` sozinho em uma mensagem:

1. Ative o skill `reversa` disponível em `.agents/skills/reversa/SKILL.md`.
2. Leia o `SKILL.md` na íntegra e siga exatamente as instruções do Reversa.

## Regra não-negociável

Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto legado.

O Reversa escreve **apenas** em:

```text
.reversa/
_reversa_sdd/
```

## Workflow operacional de issues

Antes de planejar ou implementar qualquer issue, consulte:

- `_reversa_sdd/process/issue-development-workflow.md`
- `_reversa_sdd/process/issue-analysis-template.md`
- `_reversa_sdd/process/technical-analysis-template.md`
- `_reversa_sdd/process/matching-agent-workflow.md`
- `_reversa_sdd/process/matching-report-template.md`
- `_reversa_sdd/process/tdd-plan-template.md`
- `_reversa_sdd/process/development-agent-prompt-template.md`
- `_reversa_sdd/process/review-template.md`
- `_reversa_sdd/process/handoff-template.md`

Nenhuma issue deve ser implementada diretamente. O agente deve primeiro entregar:

1. Issue Understanding
2. Technical Analysis
3. Matching Report, quando obrigatório
4. TDD Plan
5. Development Agent Prompt

Somente depois disso a implementação pode começar.

## Matching antes do Plano TDD

Antes do Plano TDD, execute ou consulte o Matching Report quando a issue for média, alta, crítica ou envolver:

- segurança;
- banco;
- RLS;
- RBAC;
- dados financeiros;
- storage;
- certificado;
- cache;
- performance;
- frontend integrado;
- MCPs.

---

# Codex / GSD / WSP Finance — Regras adicionais

## Papel deste arquivo

Este `AGENTS.md` deve ser lido como instrução persistente do repositório para agentes Codex, GSD, Reversa ou qualquer agente executor/revisor.

As regras do Reversa acima continuam válidas. As regras abaixo complementam o fluxo operacional atual com GSD, Caveman, Codex e execução faseada.

## Regra-mãe do WSP Finance

Não implementar diretamente sem etapa correta.

Fluxo obrigatório:

```text
Issue/Phase
→ Entendimento
→ Discovery técnico
→ Plano TDD
→ Execução
→ Verify Work
→ Correções, se houver
→ Finalização Git seletiva
→ Handoff
```

## Contexto crítico do projeto

WSP Finance é um SaaS financeiro multi-tenant com:

- Node.js + Express + TypeScript;
- Prisma ORM;
- PostgreSQL/Supabase com RLS;
- RBAC por workspace;
- frontend React/Vite;
- BankMovement como staging;
- Transaction como ledger definitivo;
- AuditLog seguro;
- preocupação forte com LGPD, dados financeiros e isolamento tenant.

## Regras absolutas

- Nunca usar `git add .`.
- Nunca usar `git reset --hard`.
- Nunca usar `git clean -fd`.
- Nunca fazer `stage`, `commit` ou `push` sem autorização explícita.
- Nunca descartar baseline existente da issue.
- Nunca assumir que arquivos `A/M` são lixo.
- Nunca misturar arquivos de fases diferentes no mesmo commit.
- Nunca usar `sysPrisma` por conveniência.
- Nunca usar `managementClient` em produção.
- Nunca criar `Transaction` diretamente a partir de OCR/Telegram.
- Nunca salvar PII, raw OCR, TXT bruto ou payload sensível em logs/AuditLog.
- Sempre preservar RLS/RBAC/LGPD.

## Regras de IDs

- `Transaction.id` deve ser tratado como UUID/string.
- `Account.id` deve ser tratado como number.
- `Workspace.id` deve ser tratado como number, salvo se o schema provar diferente.
- Não unificar esses tipos sem issue explícita.

## Estado operacional atual

A branch pode conter baseline Telegram/OCR em andamento. Isso faz parte da issue atual e deve ser preservado.

Ao executar qualquer fase, separar no relatório:

1. baseline herdado;
2. arquivos tocados pela fase atual;
3. arquivos novos da fase atual;
4. arquivos fora de escopo que ficaram intocados.

## Skills Codex disponíveis

As skills específicas do fluxo faseado devem ficar em:

```text
.codex/skills/wsp-gsd-phase-orchestrator/SKILL.md
.codex/skills/wsp-gsd-git-finalizer/SKILL.md
```

Use:

- `wsp-gsd-phase-orchestrator` para discutir, planejar, executar e verificar fases.
- `wsp-gsd-git-finalizer` para finalização Git seletiva por fase.

## Nomes de subagentes

Sempre que criar subagentes neste projeto, usar e registrar os nomes operacionais:

- Vini Jr
- Hiro

Se a plataforma gerar nicknames automáticos diferentes, ainda assim trate os subagentes no prompt, no relatório e no handoff como Vini Jr e Hiro.

## Validações mínimas por fase

Antes de finalizar qualquer fase:

```bash
git branch --show-current
git status --short -uall
git diff --stat
git diff --check
```

Quando backend for alterado:

```bash
cd backend
pnpm exec prisma validate
pnpm exec tsc --noEmit
pnpm test -- <testes-focados>
```

Quando frontend for alterado:

```bash
cd frontend
pnpm test -- <testes-focados>
pnpm run build
```

## Classificação de achados

- P0: crítico, bloqueia imediatamente.
- P1: alto, bloqueia merge.
- P2: médio, corrigir antes de avançar.
- P3: follow-up/ressalva, não bloqueia se registrado.

P0/P1/P2 bloqueiam avanço de fase.

## Finalização Git seletiva

Antes de qualquer commit:

```bash
git branch --show-current
git log --oneline -5
git status --short -uall
git diff --stat
git diff --name-status
git diff --check
```

Depois classificar arquivos em:

1. arquivos da fase a commitar;
2. arquivos de outras fases;
3. baseline herdado;
4. documentação GSD/UAT/Verification;
5. arquivos temporários/suspeitos.

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

Só commitar se:

- UAT aprovado;
- verify-work aprovado;
- zero P0/P1/P2;
- arquivos da fase identificados;
- autorização explícita do usuário.

## Formato de resposta preferido

Relatório mínimo:

- Veredito;
- arquivos alterados;
- testes executados;
- comandos executados;
- riscos P0/P1/P2/P3;
- próximo passo recomendado.
