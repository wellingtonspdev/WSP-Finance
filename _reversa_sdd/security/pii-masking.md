# PII Masking — Política Técnica MVP

- PII Masking é uma mitigação técnica MVP.
- Não representa anonimização jurídica irreversível.
- Não é parecer jurídico LGPD.
- Pode haver falsos positivos e falsos negativos.
- CPF, CNPJ, e-mail, telefone, PIX e nomes conhecidos são mascarados por regras determinísticas.
- Nomes só são mascarados quando fornecidos explicitamente em lista.
- Não há NLP, LLM ou detecção perfeita de nomes próprios.
- Valores monetários, categorias comerciais e contexto financeiro não identificável devem ser preservados.
- Integração com IA/OCR/logs/workers será feita em issues futuras.
