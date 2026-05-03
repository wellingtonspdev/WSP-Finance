# Template - Plano TDD

Use este modelo antes da implementacao. Nenhum agente deve implementar sem esta etapa.

## Identificacao

- Issue:
- Agente:
- Data:
- Modulo:

## Objetivo testavel

> [Descreva o comportamento que os testes devem provar.]

## Estrategia TDD

- Primeiro teste a escrever:
- Falha esperada antes da implementacao:
- Mudanca minima para passar:
- Refatoracao permitida:

## Cenarios de teste

### Caminho feliz

- [ ] Dado:
- [ ] Quando:
- [ ] Entao:

### Erros e validacoes

- [ ]

### Permissao/RBAC/RLS

- [ ]

### Regressao

- [ ]

### UI/E2E, se aplicavel

- [ ]

## Tipo de teste

| Cenario | Unitario | Integracao | E2E | Manual | Observacao |
|---|---:|---:|---:|---:|---|
|  |  |  |  |  |  |

## Dados de teste

- Usuarios:
- Workspaces:
- Roles:
- Transacoes/movimentos:
- Fixtures/mocks:

## Comandos planejados

Backend:

```powershell
cd backend
pnpm exec tsc --noEmit
pnpm test
pnpm test -- --coverage
pnpm exec prisma validate
```

Frontend:

```powershell
cd frontend
pnpm run build
pnpm run lint
pnpm test
pnpm exec playwright test
```

Geral:

```powershell
git status --short
git diff --check
```

## Criterios de conclusao

- [ ] Teste principal criado ou ajustado.
- [ ] Implementacao passa no teste.
- [ ] Validacao de contrato executada.
- [ ] Risco principal coberto.
- [ ] Falhas ambientais registradas.

## Quando nao for possivel TDD automatico

Explique:

- Por que nao foi possivel automatizar:
- Qual validacao substituta sera feita:
- Qual divida de teste sera registrada:
