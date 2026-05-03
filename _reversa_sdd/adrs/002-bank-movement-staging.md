# ADR 002 - Staging BankMovement antes de impactar saldo

## Status

Aceito retroativamente.

## Contexto

Ingestão OFX/Open Finance pode conter duplicatas, descrições divergentes e eventos que exigem validação humana. Commits `ae89551`, `c04a6fb`, `5cf3f13`, `4e93aed` indicam evolução para `BankMovement`, engine unificada e inbox de aprovação.

## Decisão

Persistir importações em `BankMovement` com `status=PENDING`; saldo só muda quando um usuário aprova o movimento e ele vira `Transaction`.

## Alternativas consideradas

- Criar Transaction diretamente na ingestão: menor latência, mas alto risco de duplicar ou classificar errado.
- Descartar duplicatas só por FITID/hash: rápido, mas insuficiente para bancos com descrições variáveis.
- Fila externa dedicada: mais robusta, mas maior custo e complexidade.

## Consequências

- 🟢 Protege saldo contra importações erradas.
- 🟢 Permite auditoria de payload bruto.
- 🟢 Cria ponto claro de responsabilidade humana no inbox.
- 🟡 Aumenta carga operacional para aprovação.
- 🔴 OCR aparece como fonte no enum, mas fluxo OCR completo não foi comprovado.
