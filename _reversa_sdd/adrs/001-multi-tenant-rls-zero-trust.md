# ADR 001 - Multi-tenant com RLS e runtime sem superuser

## Status

Aceito retroativamente.

## Contexto

O sistema manipula dados financeiros de múltiplos clientes/workspaces. Um erro de filtro por `workspaceId` poderia expor dados entre tenants. O histórico Git mostra estabilização específica em `9cb94b0 feat(security): implementa RLS...`, `1f122de ... interceptor de erros p2004p2010...` e testes de role restrita.

## Decisão

Usar Row-Level Security no PostgreSQL como controle estrutural e falhar o startup quando o usuário runtime tiver `SUPERUSER` ou `BYPASSRLS`.

## Alternativas consideradas

- Apenas filtros por `workspaceId` nos repositories: mais simples, mas vulnerável a regressão.
- Separar banco por cliente: isolamento forte, porém operacionalmente pesado para estágio atual.
- RLS com runtime privilegiado: invalida a proteção principal.

## Consequências

- 🟢 Reduz risco LGPD de vazamento cross-tenant.
- 🟢 Obriga disciplina com `DATABASE_URL`, `DIRECT_URL` e roles.
- 🟡 Aumenta complexidade de testes e migrations.
- 🔴 Requer validação runtime real; análise atual não executou banco.
