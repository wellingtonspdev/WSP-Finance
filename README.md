# 💰 WSP Finance
![CI/CD](https://github.com/wellingtonspdev/WSP-Finance/actions/workflows/ci.yml/badge.svg)

O **WSP Finance** é uma plataforma de gestão financeira híbrida (SaaS), projetada para atender o "Empreendedor Híbrido": aquele que precisa gerenciar suas finanças **Pessoais (CPF)** e **Empresariais (CNPJ)** em um único lugar, com isolamento total de dados e inteligência de mercado.

---

## 🚀 Stack Tecnológica

### Backend (API)
*   **Core:** Node.js, TypeScript, Express.
*   **Dados:** PostgreSQL, Prisma ORM (Decimal Precision).
*   **Segurança:** JWT (Dual Token), RBAC (Owner/Editor/Viewer), Cookies HttpOnly.
*   **Features:** Cron Jobs (Automação), OFX Parser, Uploads (Local/S3).

### Frontend (Web App)
*   **Core:** React (Vite), TypeScript.
*   **Estilo:** Tailwind CSS v4 (Glassmorphism Premium).
*   **Estado:** TanStack Query (Server State), Context API.
*   **Segurança:** Axios Interceptors (Silent Refresh), Memory-only Tokens.

---

## 🛠️ Guia de Instalação e Execução

Siga os passos abaixo para rodar o projeto completo localmente.

### Pré-requisitos
*   Node.js (v18+)
*   PNPM (Recomendado) ou NPM
*   PostgreSQL (Rodando localmente ou Docker)

### 1. Configurando o Backend

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
# Copie o arquivo de exemplo e edite as chaves (necessário para JWT Refresh e Storage, etc)
cp .env.example .env

# 4. Prepare o Banco de Dados
npx prisma generate                 # Gera a tipagem do Prisma
npx prisma migrate dev --name init  # Cria as tabelas
npx prisma db seed                  # Popula com dados de teste (Ana Silva)

# 5. Inicie o Servidor
pnpm dev
```
*O Backend rodará em: `http://localhost:3333`*

### 2. Configurando o Frontend

```bash
# 1. Abra um novo terminal e entre na pasta do frontend
cd frontend

# 2. Instale as dependências
pnpm install

# 3. Configure a variável de ambiente
# Copie o arquivo de exemplo caso exista ou crie para apontar a API
cp .env.example .env

# 4. Inicie a Aplicação
pnpm dev
```
*O Frontend rodará em: `http://localhost:5173`*

---

## 🧪 Credenciais de Teste (Seed)

O script de seed cria um cenário completo com transações, contas e dois workspaces.

*   **E-mail:** `ana@wspfinance.com`
*   **Senha:** `senha123`

---

## 🌟 Funcionalidades Principais

1.  **Multi-tenancy Híbrido:** Alterne entre "Pessoal" e "Empresa" com um clique. Dados e relatórios são totalmente isolados.
2.  **Bridge Service:** Transfira dinheiro entre workspaces (ex: Pro-labore) com rastreabilidade e auditoria.
3.  **Inteligência PACT:** Cálculo automático de margem líquida para vendas de Marketplace (Shopee/ML).
4.  **Automação:** Alertas diários de contas a pagar e risco de caixa (Saldo projetado negativo).
5.  **Importação OFX:** Importe extratos bancários com deduplicação inteligente.

---


## 📚 Documentação da API

Com o backend rodando, acesse o Swagger completo em:
👉 **http://localhost:3333/docs**


