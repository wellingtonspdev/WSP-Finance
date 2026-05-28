# E2E - Smoke Test Domínio (S5-011)

Esta suíte de testes (Playwright) valida o fluxo crítico de exportação do sistema Domínio, cobrindo as seguintes garantias de negócio e segurança:
1. Geração de exportação para usuários autorizados com UI e backend real.
2. Bloqueio de exportação para usuários sem permissão de `ACCOUNTANT` ou `OWNER`.
3. Prevenção de acessos *cross-tenant* via interceptação de middlewares de segurança.
4. Impedimento de geração quando `blockers` estão presentes.
5. Continuidade de geração quando apenas `warnings` são encontrados.

## Pré-requisitos
- Ambiente rodando os serviços front (`4173` ou `5173`) e back (`3333`).
- Banco de dados (Prisma) em pé, pois a *fixture* provisiona o banco sob demanda para testar as camadas de segurança sem mock de rotas críticas.
- `JWT_SECRET` válido.

## Armazenamento Isolado para Teste
Nós criamos uma abstração para evitar gravar no bucket real (R2/S3) da produção. Para usar esse mock, providencie a variável de ambiente:
```sh
E2E_STORAGE_PROVIDER=local
```

## Como Executar

Abra **dois terminais** separados.

### 1. Backend (Terminal 1)
O backend é quem decide onde salvar o arquivo. Para forçar o mock local, inicie o backend setando a variável de ambiente. Em PowerShell:

```powershell
cd backend
$env:E2E_STORAGE_PROVIDER="local"
pnpm run dev
```

### 2. Frontend / Playwright (Terminal 2)
Com o backend rodando, execute a suíte de testes no frontend:

```powershell
cd frontend
pnpm exec playwright test tests/e2e/export-dominio.spec.ts --project=chromium
```

A suíte executará de modo rápido (apenas `chromium`), garantindo as validações base do fluxo de demonstração sem a instabilidade de um test runner extenso de UI.
