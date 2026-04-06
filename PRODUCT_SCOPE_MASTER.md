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
