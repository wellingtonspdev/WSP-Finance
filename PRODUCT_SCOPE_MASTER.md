# 🎯 WSP Finance - Product Scope Master (V4.2)

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
