# Issue Understanding - Phase 4 Pro-labore Recorrente Com Pendencia

## Identificacao

- Issue: Phase 4 - Pro-labore recorrente com pendencia
- Tipo: feature
- Prioridade: critica
- Data: 2026-05-31
- Agente responsavel: Codex

## Resumo

Criar recorrencia mensal de pro-labore que gera pendencias para confirmacao manual, sem transferencia automatica pelo cron.

## Escopo

Dentro do escopo:

- Persistir agendamentos mensais BUSINESS para PERSONAL.
- Persistir pendencias mensais por competencia.
- Gerar pendencias via cron sem movimentar saldo.
- Confirmar pendencia manualmente usando BridgeService simplificado.
- Garantir idempotencia por competencia e por confirmacao.
- Criar pagina dedicada no frontend.

Fora do escopo:

- Reativar impostos.
- Pedir conta bancaria ao usuario.
- Executar transferencia automatica no cron.
- Misturar Telegram/OCR.
- Alterar regra de bridge manual ja validada.

## Decisoes do usuario

- Apenas OWNER pode criar, listar/operar e confirmar recorrencias.
- Desativacao preserva historico; nao ha hard delete.
- UI em pagina propria.
- Demais perguntas seguiram o recomendado nos planos.

## Criterios de aceite testaveis

- Cron cria pendencia e nao chama BridgeService.
- Uma competencia nao recebe duas pendencias para o mesmo agendamento.
- Confirmacao manual executa bridge uma unica vez.
- Saldo insuficiente mantem a pendencia aberta.
- UI permite criar agendamento, listar pendencias e confirmar.

## Resultado

Status: pronto para analise tecnica e execucao TDD.
