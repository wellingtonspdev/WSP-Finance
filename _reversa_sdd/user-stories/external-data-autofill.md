# User Stories - Autocomplete CNPJ e CEP

## US-EXT-001 - Preencher empresa por CNPJ

Como usuário criando workspace empresarial, quero preencher dados da empresa a partir do CNPJ.

### Critérios de Aceitação

- [CONFIRMADO] Dado CNPJ com 14 dígitos, quando campo perde foco, então frontend consulta `/external/document/:cnpj`.
- [CONFIRMADO] Dado BrasilAPI disponível, então dados são retornados pela fonte primária.
- [CONFIRMADO] Dado BrasilAPI indisponível, então ReceitaWS é usada como fallback.
- [CONFIRMADO] Dado resposta válida, então nome e CNAE podem ser preenchidos.

## US-EXT-002 - Preencher endereço por CEP

Como usuário criando workspace, quero preencher endereço a partir do CEP.

### Critérios de Aceitação

- [CONFIRMADO] Dado CEP com 8 dígitos, quando campo perde foco, então frontend consulta `/external/location/:cep`.
- [CONFIRMADO] Dado BrasilAPI indisponível, então ViaCEP é usado como fallback.
- [CONFIRMADO] Dado cache recente, então service retorna resultado cacheado.

## US-EXT-003 - Controlar risco de consultas externas

Como operador do sistema, quero evitar instabilidade e vazamento de dados em chamadas externas.

### Critérios de Aceitação

- [CONFIRMADO] Dado falha recorrente de provider, então circuit breaker pode abrir.
- [CONFIRMADO] Dado logs de CNPJ, então número é mascarado.
- [LACUNA] Rotas externas estão públicas no código analisado.
- [LACUNA] Contrato de CEP backend/frontend diverge entre resposta aninhada e campos na raiz.
