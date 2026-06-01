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
*   **Node.js**: v22+ (v22.16.0 homologada)
*   **PNPM**: v10+ (Recomendado, v10.27.0 homologada)
*   **PostgreSQL**: v15+ rodando localmente (usualmente gerenciado via pgAdmin)

### 1. Clonando o Repositório

```bash
git clone https://github.com/wellingtonspdev/WSP-Finance.git
cd WSP-Finance
```

### 2. Preparando o Banco de Dados (pgAdmin)

1. Abra o pgAdmin (ou sua ferramenta de banco local).
2. Crie um novo banco de dados vazio (exemplo: `wsp_finance`).
3. Verifique as credenciais do seu usuário `postgres` (serão necessárias no próximo passo).

### 3. Configurando o Backend

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
# Copie o arquivo de exemplo. Edite as credenciais do banco (DATABASE_URL) se necessário.
cp .env.example .env

# 4. Prepare o Banco de Dados (Prisma ORM v6)
pnpm prisma generate       # Gera a tipagem do Prisma
pnpm prisma migrate dev    # Cria/Atualiza as tabelas de acordo com as migrations
pnpm prisma db seed        # Popula com dados de teste 

# 5. Inicie o Servidor
pnpm dev
```
*O Backend rodará em: `http://localhost:3333`*

### 4. Configurando o Frontend

```bash
# 1. Abra um novo terminal a partir da raiz do projeto e entre no frontend
cd frontend

# 2. Instale as dependências
pnpm install

# 3. Configure a variável de ambiente
# Copie o arquivo de exemplo que já possui o VITE_API_URL configurado
cp .env.example .env

# 4. Inicie a Aplicação
pnpm dev
```
*O Frontend rodará em: `http://localhost:5173`*

---

## 🧪 Credenciais de Teste (Seed)

O script de seed cria um cenário completo com transações, contas, workspaces e isolamento RLS.
Após executar o seed, as principais credenciais de acesso disponíveis são:

*   **Contador Sênior (Torre de Controle - 10 Clientes):**
    *   **E-mail:** `auditoria@wsp.finance`
    *   **Senha:** `password123`
*   **Cliente Demo PF/PJ (João):**
    *   **E-mail:** `joao@wsp.finance`
    *   **Senha:** `password123`
*   **Cliente Demo (Ana):**
    *   **E-mail:** `ana@wsp.finance`
    *   **Senha:** `password123`

---

## 🌟 Funcionalidades Principais

1.  **Multi-tenancy Híbrido:** Alterne entre "Pessoal" e "Empresa" com um clique. Dados e relatórios são totalmente isolados.
2.  **Bridge Service:** Transfira dinheiro entre workspaces (ex: Pro-labore) com rastreabilidade e auditoria.
3.  **Inteligência:** Cálculo automático de margem líquida para vendas de Marketplace (Shopee/ML).
4.  **Automação:** Alertas diários de contas a pagar e risco de caixa (Saldo projetado negativo).
5.  **Importação OFX:** Importe extratos bancários com deduplicação inteligente.

---


## 📚 Documentação da API

Com o backend rodando, acesse o Swagger completo em:
👉 **http://localhost:3333/docs**


