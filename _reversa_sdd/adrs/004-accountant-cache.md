# ADR 004 - Cache materializado do dashboard do contador

## Status

Aceito retroativamente.

## Contexto

O contador pode ter múltiplos clientes. Calcular pendências, anexos faltantes, risco de caixa e certificado no login poderia gerar múltiplas queries pesadas. O histórico mostra `a1be696 feat(accountant): Adiciona cache materializado do dashboard` e `e33f6c6 feat(cron): Schedule accountant cache refresh`.

## Decisão

Criar `AccountantDashboardCache` por `(userId, workspaceId)`, retornar cache no login/restauração de sessão e atualizar por cron a cada 30 minutos.

## Alternativas consideradas

- Calcular tudo sob demanda no hub: dados frescos, mas maior latência e pressão no banco.
- Cache client-side apenas: rápido, mas sem consistência multi-dispositivo.
- Materialized view no banco: poderia ser eficiente, mas menos flexível para erros parciais por workspace.

## Consequências

- 🟢 Login e hub do contador ficam mais leves.
- 🟢 Erros por workspace são isolados.
- 🟡 Dados podem ficar defasados até o próximo refresh.
- 🔴 Quando há erro parcial, entradas antigas não são removidas para evitar perda indevida.
