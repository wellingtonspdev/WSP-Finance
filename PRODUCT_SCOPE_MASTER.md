# 🎯 WSP Finance - Product Scope Master (V4.2)

**Update Date:** March 9, 2026
**Current Phase:** Sprint 1 (Accountant Hub / B2B2C Model)

---

## 🎯 1. PRODUCT OVERVIEW AND STRATEGIC PIVOT

WSP Finance has evolved to become the **Central Nervous System of Financial BPO (Accountant Hub)**. It acts as a **"Pre-Audit and Data Sanitization Engine."**

**The New Dynamic:**

* The end user (MEI/ME) suffers from "Input Fatigue." All ingestion will be passive via **WhatsApp (receipt OCR)** and **Open Finance (Belvo)**.
* The **Accountant (`ACCOUNTANT`)** is our primary persona. They use the system to approve transactions, audit the health of multiple clients in batches, and export perfect files to their legacy ERP.

---

## 🎯 2. FINAL OBJECTIVE OF THE PROJECT

acts as a "Pedagogical Digital Accountant" and a robust operational infrastructure for microentrepreneurs (MEI/ME) and accounting firms. The system aims to solve asset commingling, proactively prevent tax penalties through AI, and automate bank reconciliation and tax invoice issuance.

---

## 📋 3. FUNCTIONAL SCOPE (PRACTICAL OPERATIONS)

### 3.1 Management of Isolated Contexts (Workspaces)

Single login to switch between Individual Account (CPF) and Corporate Account (CNPJ) without mixing balances.

### 3.2 Legalized Transfers (Bridge Service)

Formalizes withdrawals (Pro-labore or Profits) by performing automatic double-entry bookkeeping between CNPJ and CPF atomically.

### 3.3 Tax Audit Prevention (Tax Linter)

AI analyzes transactions to block irregular actions (e.g., residential payment through the company’s cash account).

### 3.4 Tax Provisioning ("Hidden Partner")

Dynamic visual blocking of a percentage of the balance (DAS tax rate) for tax authorities.

### 3.5 Multidirectional Onboarding Flows

Top-Down (Accountant invites client) and Bottom-Up (Client invites accountant).

---

## 📦 4. PRODUCT SCOPE (FEATURES AND INTERFACE)

### 4.1 Multiplatform Frontend

Hybrid responsiveness (mobile for quick input, desktop for dense reports). Private mode and visual context (distinct colors for CPF and CNPJ). Seasonal Mode (Income Tax). Belvo No-Code Widget.

### 4.2 Reverse Calculation for Marketplaces

Automatic deduction of fees/shipping from platforms such as Shopee and Mercado Livre.

### 4.3 National NFS-e Issuer

Integration with the National API for issuing Service Invoices with auto-fill.

### 4.4 Accountant Hub (B2B Dashboard)

Vitality Panel (A1 Certificates and Powers of Attorney) and "De-Para" Export Engine for legacy ERPs (Domínio, Contmatic, etc.). Capture via WhatsApp (OCR).

### 4.5 Backoffice Module (Super Admin)

Health monitoring (KPIs). Technical blocking of nominal/financial data visualization (LGPD).

---

## 🚦 5. TECHNICAL LIMITATIONS AND OPERATIONAL RESTRICTIONS

* **Storage:** 500MB limit on Supabase (binary files forbidden in the DB).
* **Latency:** Cold start on Render (requires Keep-Alive routine).
* **Sandbox:** Limit of 25 real accounts in the Belvo aggregator in Phase 1.

---

## 💰 6. BUSINESS MODEL AND CONTRACTING

* **SaaS:** Monthly subscription.
* **Premium Plan:** ~R$ 59.99/month for the end user.
* **Accountant Plans:** B2B2C model by volume of CNPJs.
* **Buy vs. Build Strategy (Payments):** Billing 100% outsourced (Stripe/Asaas).

---

## 🚫 7. OUT OF SCOPE

* Issuance of NF-e and CT-e (physical products/ICMS).
* Replacement of the Accountant’s Legal Signature (ME above MEI).
* Payment Initiation (Pix Outbound) in V1.
* Human Access to the A1 Vault.

---

## 🏁 8. PROJECT SCOPE (FINAL DELIVERABLES)

* Core Backend (RESTful API + Swagger).
* Multiplatform Frontend.
* AI Module (Asynchronous Worker).
* Cloud Infrastructure and CI/CD Pipeline (Supabase w/ RLS, Vitest, Playwright, SonarCloud).
**Data de Atualização:** 09 de Março de 2026
**Fase Atual:** Sprint 1 (Hub do Contador / Modelo B2B2C)

---

## 🎯 1. VISÃO GERAL DO PRODUTO E PIVÔ ESTRATÉGICO
O WSP Finance evoluiu para se tornar o **Sistema Nervoso Central de BPO Financeiro (Hub do Contador)**. Atua como um **"Motor de Pré-Auditoria e Saneamento"**.

**A Nova Dinâmica:**
- O usuário final (MEI/ME) sofre de "Fadiga do Input". Toda ingestão será passiva via **WhatsApp (OCR de recibos)** e **Open Finance (Belvo)**.
- O **Contador (`ACCOUNTANT`)** é a nossa persona principal. Ele usa o sistema para aprovar transações, auditar a saúde de múltiplos clientes em lote e exportar arquivos perfeitos para seu ERP legado.

---

## 🎯 2. OBJETIVO FINAL DO PROJETOO
atua como um "Contador Digital Pedagógico" e uma infraestrutura operacional robusta para microempreendedores (MEI/ME) e escritórios de contabilidade. O sistema visa resolver a confusão patrimonial, prevenir multas fiscais proativamente via IA e automatizar a conciliação bancária e emissão de notas fiscais.

---

## 📋 3. ESCOPO FUNCIONAL (OPERAÇÕES PRÁTICAS)

### 3.1 Gestão de Contextos Isolados (Workspaces)
Único login para transitar entre conta Pessoa Física (CPF) e Pessoa Jurídica (CNPJ) sem mistura de saldos.

### 3.2 Transferências Legalizadas (Bridge Service)
Formaliza retiradas (Pró-labore ou Lucros) realizando partida dobrada automática entre CNPJ e CPF de forma atômica.

### 3.3 Prevenção de Malha Fina (Linter Fiscal)
IA analisa transações para bloquear ações irregulares (ex: pagamento residencial pelo caixa da empresa).

### 3.4 Provisão de Impostos ("Sócio Oculto")
Bloqueio visual dinâmico de porcentagem do saldo (alíquota DAS) para o fisco.

### 3.5 Fluxos de Onboarding Multidirecionais
Top-Down (Contador convida cliente) e Bottom-Up (Cliente convida contador).

---

## 📦 4. ESCOPO DE PRODUTO (FUNCIONALIDADES E INTERFACE)

### 4.1 Frontend Multiplataforma
Responsividade Híbrida (mobile para inserção rápida, desktop para relatórios densos). Modo privado e contexto visual (cores distintas para CPF e CNPJ). Modo Sazonal (IR). Widget No-Code Belvo.

### 4.2 Cálculo Reverso de Marketplaces
Dedução automática de taxas/fretes de plataformas como Shopee e Mercado Livre.

### 4.3 Emissor Nacional de NFS-e
Integração com API Nacional para emissão de Notas de Serviço com preenchimento automático.

### 4.4 Hub do Contador (Painel B2B)
Painel de Vitalidade (Certificados A1 e Procurações) e Motor de Exportação "De-Para" para ERPs legados (Domínio, Contmatic, etc.). Capture via WhatsApp (OCR).

### 4.5 Módulo Backoffice (Super Admin)
Monitoramento de saúde (KPIs). Bloqueio técnico de visualização de dados nominais/financeiros (LGPD).

---

## 🚦 5. LIMITAÇÕES TÉCNICAS E RESTRIÇÕES OPERACIONAIS
- **Armazenamento:** Limite de 500MB no Supabase (proibido binários no DB).
- **Latência:** Cold start na Render (exige rotina de Keep-Alive).
- **Sandbox:** Limite de 25 contas reais no agregador Belvo na Fase 1.

---

## 💰 6. MODELO DE NEGÓCIOS E CONTRATAÇÃO
- **SaaS:** Assinatura mensal.
- **Plano Premium:** ~R$ 59,99/mês para usuário final.
- **Planos Contadores:** Modelo B2B2C por volume de CNPJs.
- **Estratégia Buy vs. Build (Pagamentos):** Billing 100% terceirizado (Stripe/Asaas).

---

## 🚫 7. FORA DE ESCOPO (OUT OF SCOPE)
- Emissão de NF-e e CT-e (produtos físicos/ICMS).
- Substituição da Assinatura Legal do Contador (ME acima de MEI).
- Iniciação de Pagamentos (Pix Outbound) na V1.
- Acesso Humano ao Cofre A1.

---

## 🏁 8. ESCOPO DE PROJETO (ENTREGÁVEIS FINAIS)
- Core Backend (API RESTful + Swagger).
- Frontend Multiplataforma.
- Módulo de IA (Worker Assíncrono).
- Infraestrutura Cloud e Esteira CI/CD (Supabase c/ RLS, Vitest, Playwright, SonarCloud).
