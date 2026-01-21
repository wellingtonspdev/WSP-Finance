# GEMINI.md - Especificação Técnica e Contexto do Projeto

## 1. Visão Geral do Produto

O projeto é um **Sistema de Gestão Financeira Híbrido** que permite ao utilizador gerir contextos Pessoais (CPF) e Empresariais (CNPJ) numa única conta. O **isolamento de dados** é o requisito primordial, garantido pelo conceito de **Workspaces**.

---

## 2. Pilares Arquiteturais (Backend)

Utilizamos uma **Arquitetura em Camadas** (Layered Architecture) para garantir a separação de responsabilidades e testabilidade:

### Controllers
Apenas lidam com protocolos HTTP, recebendo requisições e enviando respostas. Não contêm lógica de negócio.

### Services
Camada onde reside toda a "inteligência". Aqui são feitos os cálculos financeiros, validações de permissões e processamento de ficheiros.

### Repositories
Abstração total da base de dados. Utilizam o **Prisma** para realizar operações de leitura e escrita, protegendo os Services de detalhes de infraestrutura.

### Middlewares
Filtros globais para autenticação (JWT), autorização de Workspace e tratamento centralizado de erros.

---

## 3. Estratégia de Dados e Base de Dados (PostgreSQL + Prisma)

A base de dados foi modelada para ser resiliente e auditável:

| Aspecto | Descrição |
|--------|-----------|
| **Identificadores** | UUID v4 em todas as tabelas para facilitar sincronização mobile e evitar exposição sequencial de IDs |
| **Precisão Financeira** | Valores monetários utilizam `@db.Decimal(19, 4)` para evitar erros de arredondamento |
| **Multi-tenancy** | Quase todas as entidades possuem `workspaceId` obrigatório |
| **Soft Delete** | Campo `deleted_at` em vez de exclusão física para auditoria e recuperação |
| **Deduplicação** | `hashDeduplication` baseado em data, valor e descrição para prevenir duplicatas na importação OFX |

---

## 4. Segurança e Validação

### Autenticação
JWT com **Refresh Tokens** para manter sessões seguras e persistentes no mobile.

### Hashing
Senhas são processadas com **Bcryptjs** (cost=8 ou superior).

### Validação de Entrada
Utilizamos **Zod** em todos os Controllers para garantir que os dados recebidos estão "limpos" e tipados corretamente antes de chegarem aos Services.

### Isolamento
O **Workspace Middleware** deve validar a propriedade do workspace em cada pedido, garantindo que o utilizador A nunca veja dados do workspace do utilizador B.

---

## 5. Fluxos Especiais e Integrações

### Importação OFX
O sistema deve ler ficheiros bancários, gerar o hash de cada linha e registar transações apenas se o hash for inédito no workspace.

### Gestão de Comprovativos
O backend não recebe ficheiros binários. Ele gera **Signed URLs** da Amazon S3 para que o frontend faça o upload direto, guardando apenas a URL de referência no banco.

### Categorias Híbridas
O sistema oferece categorias **"Universais"** (onde `workspaceId` é nulo) e categorias **personalizadas** (criadas pelo utilizador para o seu workspace).

---

## 6. Instruções para o Agente (Gemini)

Ao sugerir código ou resolver problemas para este projeto:

✓ **Priorize TypeScript** — Nunca sugira JavaScript puro. Utilize tipos rigorosos.

✓ **Mantenha as Camadas** — Não coloque lógica de banco no Controller nem lógica de HTTP no Service.

✓ **Respeite o Workspace** — Sempre assuma que as operações financeiras precisam de um contexto de `workspaceId`.

✓ **Segurança em Primeiro Lugar** — Verifique sempre se as senhas estão a ser hasheadas e se os dados estão a ser validados com Zod.

---

## 7. Especificação v1.0.0 Alpha (Governança e Automação)

Esta seção detalha a evolução do sistema para suportar fluxos complexos de governança patrimonial e automação financeira.

### 7.1. Bridge Service (Ponte entre Workspaces)
Funcionalidade crítica para permitir a transferência de capital entre contextos (ex: Pro-labore).
*   **Mecanismo:** Utiliza `prisma.$transaction` para garantir atomicidade.
*   **Regra:** Subtrai do Workspace A e adiciona no Workspace B. Se falhar, rollback total.
*   **Segurança:** Valida se o usuário é dono de ambos os workspaces envolvidos.

### 7.2. Automação e Monitoramento (Cron Jobs)
O sistema deve ser proativo.
*   **Engine de Alertas:** Verificação diária (08:00 AM) de vencimentos e saldo.
*   **Previsão de Risco:** Alerta se `Saldo Atual < Despesas dos Próximos 5 Dias`.
*   **Provisão de Impostos:** Cálculo automático de retenção baseado no `tax_rate` do workspace empresarial.

### 7.3. Inteligência de Dados (OFX/CSV)
*   **Inbox (Pendências):** Transações importadas entram como `PENDING_CATEGORIZATION` e não afetam KPIs até serem classificadas.
*   **Deduplicação Inteligente:** Hash baseado em `data + valor + descrição`.

### 7.4. Governança e Auditoria
*   **RBAC:** Expansão do middleware para suportar roles (`ADMIN`, `VIEWER`, `ACCOUNTANT`).
*   **Audit Logs:** Tabela imutável que registra quem alterou o quê e quando.
*   **Soft Delete:** Obrigatório para todas as entidades financeiras.

---

# PACT - SISTEMA FINANCEIRO HÍBRIDO E ANALÍTICO (Versão Final Consolidada)

**Desenvolvido por:** Wellington Siqueira Porto

## Objetivo do Documento

Este documento detalha a análise **PACT** (Pessoas, Atividades, Contextos, Tecnologias) para o **Sistema de Gestão Financeira Híbrido**. Esta análise visa mitigar erros de usabilidade e garantir que o software atue como um consultor financeiro e fiscal para microempreendedores digitais, transformando dados brutos em decisões estratégicas.

## Visão Geral do Sistema

Uma plataforma multiplataforma focada no **"Utilizador Híbrido"**. O sistema utiliza arquitetura **Multi-tenant** (Workspaces) para separar finanças pessoais de empresariais, integrando:

- Cálculo automático de margens para marketplaces
- Planejamento de despesas fixas com alertas
- Assistente guiado para Imposto de Renda

---

## 1. PESSOAS (PEOPLE): DA GESTÃO OPERACIONAL À SEGURANÇA FISCAL

Diferente de sistemas genéricos, aqui as pessoas são mapeadas por suas dores financeiras e comportamentais.

### 1.1 O Empreendedor de Marketplace — *O Malabarista Digital*

Este usuário, como a microempreendedora de acessórios pet, vive em um cenário de **"Ilusão de Faturamento"**.

- Vê o dinheiro entrar nas plataformas (Shopee, Mercado Livre)
- Sofre com a carga cognitiva de calcular taxas e fretes
- **Necessidade:** Entender o lucro líquido real para saber se o esforço de produção vale a pena
- **Solução:** Interface que "mastiga" os dados para ele

### 1.2 O Contribuinte Inseguro — *O Medo do Leão*

Indivíduos que, apesar de faturarem, não possuem educação tributária.

- Sentem ansiedade com a burocracia do Imposto de Renda
- Temem cometer erros que levem à malha fina
- **Necessidade:** Orientação clara, quase pedagógica, sobre o que é dedutível
- **Solução:** Guia sobre quanto devem reservar para o fisco

### 1.3 O Planejador de Curto Prazo

Usuários que sofrem com a falta de fluxo de caixa.

- Misturam as contas e muitas vezes pagam juros por esquecimento
- **Necessidade:** Sistema que atua como "memória externa"
- **Solução:** Alertas proativos e visualização de saldo futuro antes do mês acabar

---

## 2. ATIVIDADES (ACTIVITIES): TRANSACIONAL, ANALÍTICA E PREVENTIVA

As atividades são o coração do software e foram desenhadas para serem intuitivas e rápidas.

### 2.1 Registro e Alternância de Contexto — *O Pulo do Gato*

A atividade de lançar um gasto deve ser **imediata**. O diferencial está na alternância de Workspace:

- Usuário sente, visualmente, que mudou de "sala" ao passar do pessoal para o empresarial
- **Benefício:** Previne o erro crítico de lançar despesas de casa no caixa da empresa

### 2.2 Cálculo Reverso de Margem e Taxas

Em vez de apenas registrar uma venda, o usuário realiza a atividade de **"Verificação de Lucro"**:

- Insere o valor bruto da Shopee
- Sistema aplica automaticamente:
  $$\text{Lucro} = \text{Venda} - (\text{Taxa} + \text{Frete} + \text{Custo})$$
- **Resultado:** Atividade de tomada de decisão — "Devo manter este produto no catálogo?"

### 2.3 Preparação Fiscal e Planejamento de Contas

As atividades incluem:

- Marcar despesas como "Dedutíveis no IR"
- Agendar "Contas a Pagar"
- Revisar "Análise de Saúde" e Ponto de Equilíbrio
- **Pergunta-chave:** "Quantas unidades preciso vender para pagar o aluguel?"

O sistema transforma o registro passivo em um calendário ativo.

---

## 3. CONTEXTOS (CONTEXTS): MOBILIDADE, URGÊNCIA E PRIVACIDADE

O contexto determina como as tecnologias de interface serão entregues.

### 3.1 Contexto Físico e Operacional — *Mobile-First*

O sistema será usado predominantemente no **celular** (Contexto de Rua/Produção):

- Exige alto contraste e botões de fácil acesso
- No contexto de **Escritório** (Desktop), expande para:
   - Relatórios densos
   - Análises de dados em tela cheia
   - Gráficos de Pareto (80/20) sobre fluxo de caixa

### 3.2 Contexto Temporal e de Urgência

- **Lembretes de contas a pagar:** Contexto de "Antecipação"
   - Notificar o usuário em horários produtivos (início da manhã)
- **Modo Imposto de Renda:** Contexto sazonal
   - Interface se adapta entre março e maio
   - Prioriza exportação de informes

### 3.3 Contexto de Sigilo — *Modo Privado*

Considerando o uso em locais públicos:

- Sistema permite ocultar valores sensíveis com um toque
- Garante que o saldo bancário não seja exposto a terceiros em ambientes compartilhados

---

## 4. TECNOLOGIAS (TECHNOLOGIES): INFRAESTRUTURA PARA DECISÃO

A tecnologia não é apenas o código, mas a garantia da precisão absoluta.

### 4.1 Stack Transacional — Node.js, TypeScript, Prisma, PostgreSQL

- **Prisma com transações atômicas:** Garante que o usuário e seu primeiro Workspace nasçam juntos
- **PostgreSQL com tipos Decimal:** Evita erros de arredondamento de centavos
- **JWT com Refresh Tokens:** Sessões longas no mobile sem comprometer os dados

### 4.2 Motor de Inteligência de Dados — *Analytics Engine*

Para evitar a complexidade de rodar Python em tempo real:

- Indicadores de lucro e saldo futuro são processados via **SQL Aggregations** no Postgres
- Lógica de negócio no Node.js
- **Insights Aconselháveis:** Se as retiradas pessoais excederem 30% do faturamento, código dispara alerta de risco de capital de giro

### 4.3 Automação de Notificações e Assistente Fiscal

- **Cron Jobs:** Verificação de vencimentos diários
- **Assistente Fiscal:** Motor de regras estáticas que traduz legislação da Receita Federal em verificações de banco de dados
- **Resultado:** Separação automática entre rendimento isento e tributável