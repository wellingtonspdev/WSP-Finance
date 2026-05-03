# SDD - External Data

## Visão Geral

[CONFIRMADO] O componente `external-data` fornece autocomplete de CNPJ e CEP para criação de workspace, usando BrasilAPI como fonte primária e ReceitaWS/ViaCEP como fallback.

## Responsabilidades

- [CONFIRMADO] Consultar CNPJ por `/external/document/:cnpj`.
- [CONFIRMADO] Consultar CEP por `/external/location/:cep`.
- [CONFIRMADO] Validar tamanho mínimo dos parâmetros.
- [CONFIRMADO] Normalizar documento/CEP.
- [CONFIRMADO] Usar cache de 24 horas.
- [CONFIRMADO] Usar circuit breaker com timeout de 5 segundos.
- [CONFIRMADO] Fazer fallback BrasilAPI -> ReceitaWS para CNPJ.
- [CONFIRMADO] Fazer fallback BrasilAPI -> ViaCEP para CEP.
- [CONFIRMADO] Mascarar CNPJ em logs.
- [CONFIRMADO] Preencher formulário de workspace com dados retornados.

## Interface

| Método | Rota | Entrada | Saída | Confiança |
|---|---|---|---|---|
| `GET` | `/external/document/:cnpj` | CNPJ com mínimo de 14 caracteres | dados cadastrais + metadata | CONFIRMADO |
| `GET` | `/external/location/:cep` | CEP com mínimo de 8 caracteres | endereço + metadata | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] CNPJ com menos de 14 caracteres é rejeitado.
- [CONFIRMADO] CEP com menos de 8 caracteres é rejeitado.
- [CONFIRMADO] Cache usa TTL de 24 horas.
- [CONFIRMADO] Circuit breaker usa timeout de 5 segundos, threshold de 50% e reset de 30 segundos.
- [CONFIRMADO] CNPJ tenta BrasilAPI e cai para ReceitaWS.
- [CONFIRMADO] CEP tenta BrasilAPI e cai para ViaCEP.
- [CONFIRMADO] `CreateWorkspaceForm` dispara CNPJ no blur quando há 14 dígitos.
- [CONFIRMADO] `CreateWorkspaceForm` dispara CEP no blur quando há 8 dígitos.
- [CONFIRMADO] Rotas externas não usam `AuthMiddleware`; qualquer cliente que alcance a API pode acionar consultas externas. [Revisão Reviewer]
- [CONFIRMADO] Controller captura erro Zod/provider no mesmo `catch` e retorna status 500, sem distinguir bad request de falha externa. [Revisão Reviewer]
- [CONFIRMADO] `useExternalLocation` tipa resposta na raiz, mas backend retorna `{ address, metadata }`; `CreateWorkspaceForm` espera campos na raiz para CEP. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] Usuário preenche CNPJ ou CEP no formulário.
2. [CONFIRMADO] Hook dispara consulta no blur quando há dígitos suficientes.
3. [CONFIRMADO] Controller valida parâmetro.
4. [CONFIRMADO] Service verifica cache.
5. [CONFIRMADO] Se cache não existe, chama BrasilAPI via circuit breaker.
6. [CONFIRMADO] Em falha, usa fallback apropriado.
7. [CONFIRMADO] Resposta é normalizada, cacheada e devolvida ao frontend.

## Critérios de Aceitação

```gherkin
Dado um CNPJ com 14 dígitos
Quando o usuário sai do campo no formulário
Então o frontend consulta dados externos e preenche nome/CNAE quando disponíveis

Dado um CEP com 8 dígitos
Quando o usuário sai do campo no formulário
Então o frontend consulta endereço e preenche campos de localização quando disponíveis

Dado uma falha na BrasilAPI
Quando existe provider fallback
Então o sistema tenta ReceitaWS para CNPJ ou ViaCEP para CEP
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/controllers/ExternalDataController.ts` | rotas externas |
| `backend/src/infra/external/ExternalDataService.ts` | cache, fallback e normalização |
| `backend/src/infra/external/BrasilApiClient.ts` | provider primário |
| `backend/src/infra/external/ReceitaWsClient.ts` | fallback CNPJ |
| `backend/src/infra/external/ViaCepClient.ts` | fallback CEP |
| `frontend/src/features/workspaces/hooks/useExternalData.ts` | hooks frontend |
| `frontend/src/features/workspaces/components/CreateWorkspaceForm.tsx` | preenchimento |
| `_reversa_sdd/flowcharts/external-data.md` | fluxo do módulo |
