# 💰 Sistema G Financeiro (Backend)

O **Sistema G Financeiro** é uma plataforma de gestão financeira híbrida, projetada para atender microempreendedores que precisam gerenciar suas finanças **Pessoais** e **Empresariais** em um único lugar, mas com total isolamento de dados.

O sistema foca em inteligência de dados, oferecendo cálculo automático de margem para vendas em marketplaces (Shopee, Mercado Livre), gestão de múltiplos workspaces e dashboards analíticos.

---

## 🚀 Tecnologias Utilizadas

*   **Runtime:** Node.js + TypeScript
*   **Framework:** Express
*   **Banco de Dados:** PostgreSQL
*   **ORM:** Prisma
*   **Validação:** Zod
*   **Autenticação:** JWT (Access + Refresh Tokens)
*   **Documentação:** Swagger (OpenAPI 3.0)

---

## 🛠️ Como Rodar o Projeto (Do Zero)

Siga este guia para configurar o ambiente de desenvolvimento localmente.

### Pré-requisitos
*   Node.js (v18 ou superior)
*   pnpm (Recomendado) ou npm
*   PostgreSQL (Rodando localmente ou via Docker)

### 1. Clonar e Instalar Dependências

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sistema-g-financeiro.git

# Entre na pasta do backend
cd beckend

# Instale as dependências
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (`beckend/.env`) e configure as variáveis:

```env
# Porta do Servidor
PORT=3333

# Conexão com o Banco de Dados (Ajuste user:password@host:port/db)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_app?schema=public"

# Segredo para assinar os Tokens JWT (Use uma string longa e aleatória)
JWT_SECRET="sua-chave-secreta-super-segura"

# URL Base da Aplicação (Para uploads locais)
APP_URL="http://localhost:3333"
```

### 3. Configurar o Banco de Dados

Utilize o Prisma para criar as tabelas e popular o banco com dados iniciais.

```bash
# Cria as tabelas no banco (Executa as migrações)
npx prisma migrate dev

# Popula o banco com dados iniciais (Categorias Globais)
pnpm seed
```

### 4. Rodar o Servidor

```bash
# Inicia o servidor em modo de desenvolvimento (com hot-reload)
pnpm dev
```

O servidor estará rodando em: `http://localhost:3333`

---

## 📚 Documentação da API (Swagger)

A documentação completa e interativa das rotas está disponível em:

👉 **http://localhost:3333/docs**

Lá você pode testar todas as funcionalidades:
1.  Crie um usuário em `/auth/register`.
2.  Verifique o e-mail (pegue o código no terminal) em `/auth/verify`.
3.  Faça login em `/auth/session` para pegar o Token.
4.  Use o botão **Authorize** no topo do Swagger para colar o token.
5.  Divirta-se testando as rotas de Contas, Transações e Dashboard!

---

## 🏗️ Estrutura do Projeto

*   `src/controllers`: Recebem as requisições HTTP e validam dados.
*   `src/services`: Contêm a lógica de negócio e regras.
*   `src/repositories`: Acesso direto ao banco de dados (Prisma).
*   `src/middlewares`: Segurança (Auth, Workspace) e tratamento de erros.
*   `src/providers`: Integrações externas (E-mail, Storage).
