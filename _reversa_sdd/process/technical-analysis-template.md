# Template - Analise Tecnica

Use este modelo depois da analise da issue e antes do plano TDD.

## Identificacao

- Issue:
- Agente:
- Data:
- Branch:
- Estado do git:

```powershell
git status --short
```

## Modulos afetados

- [ ] auth
- [ ] workspaces
- [ ] rbac-rls
- [ ] finance-core
- [ ] uploads-storage
- [ ] imports-open-finance
- [ ] bank-movements
- [ ] accountant
- [ ] external-data
- [ ] frontend-shell
- [ ] outro:

## Evidencias consultadas

| Fonte | Caminho | Linhas/funcoes relevantes | Observacao |
|---|---|---|---|
| Reversa SDD |  |  |  |
| Codigo |  |  |  |
| Teste |  |  |  |
| OpenAPI/Contrato |  |  |  |

## Fluxo tecnico atual

Descreva o fluxo real observado. Quando aplicavel, cobrir:

1. Backend/service/repository.
2. API/controller/route.
3. Hook/provider/store.
4. UI/componente.
5. Banco/schema/migracao.
6. Permissao/RBAC/RLS.
7. Auditoria/log/cache.

## Diagnostico

- Causa confirmada:
- Causa provavel:
- O que foi descartado:
- Lacunas ainda abertas:

## Contratos e regras que nao podem quebrar

- [ ] Prisma/schema:
- [ ] Zod/DTO:
- [ ] OpenAPI:
- [ ] Tipos frontend:
- [ ] RBAC/RLS:
- [ ] Decimal/dinheiro:
- [ ] Auditoria:
- [ ] Tenant/workspace:

## Arquivos provavelmente envolvidos

| Arquivo | Motivo | Tipo de mudanca esperada |
|---|---|---|
|  |  |  |

## Testes existentes encontrados

| Teste | Cobre o que | Lacuna |
|---|---|---|
|  |  |  |

## Riscos tecnicos

| Risco | Severidade | Mitigacao |
|---|---|---|
|  | alta/media/baixa |  |

## Comandos de investigacao usados

```powershell
# Liste comandos relevantes
```

## Resultado da etapa

- Status: pronto para plano TDD | bloqueado | precisa de decisao
- Decisoes necessarias:
- Proximo passo:
