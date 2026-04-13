# 🎨 WSP Finance - Frontend & Design Guidelines (V4.2)

**Update Date:** March 9, 2026
**Main Guideline:** Visual homogeneity, consistency, and simplicity of implementation.

---

## 🎨 1. DESIGN SYSTEM & VISUAL IDENTITY

### 1.1 Mobile-First Philosophy

| Prefix   | Min-Width | Typical Use            |
| -------- | --------- | ---------------------- |
| *(base)* | `0px`     | Portable / Smartphones |
| `sm`     | `640px`   | Portable Landscape     |
| `md`     | `768px`   | Tablets                |
| `lg`     | `1024px`  | Laptops                |
| `xl`     | `1280px`  | Desktop                |

### 1.2 Color Semantics (Financial Meaning)

| Color         | Tailwind Class | Meaning                   |
| ------------- | -------------- | ------------------------- |
| 🟢 **Green**  | `green-600`    | **Success / Income**      |
| 🔴 **Red**    | `red-600`      | **Danger / Expense**      |
| 🔵 **Blue**   | `blue-600`     | **Transfer / Accounting** |
| 🟡 **Yellow** | `yellow-500`   | **Warning / Pending**     |
| ⚪ **Gray**    | `gray-500`     | **Neutral / Disabled**    |

### 1.3 Rounding Standards

* **Buttons/Inputs**: `rounded-md` (6px)
* **Cards**: `rounded-lg` (8px)
* **Modals**: `rounded-xl` (12px)
* **Avatars/Badges**: `rounded-full`

### 1.4 Spacing (Base-4 Scale)

| Token           | Value  | Typical Use           |
| --------------- | ------ | --------------------- |
| `p-1` / `gap-1` | `4px`  | Micro (icon + text)   |
| `p-2` / `gap-2` | `8px`  | Badges                |
| `p-3` / `gap-3` | `12px` | Inputs                |
| `p-4` / `gap-4` | `16px` | Standard (Grid/Stack) |
| `p-6` / `gap-6` | `24px` | Cards / Sections      |
| `p-8` / `gap-8` | `32px` | Main layout           |

### 1.5 Typography & Currency

* **Monetary Values**: Mandatory use of `tabular-nums` and `font-semibold` for alignment in tables.
* **Labels**: `text-xs font-medium text-gray-500`.

---

## 🚦 2. UI & UX GUIDELINES

### 2.1 Core Principle

Priority 1: solve in the simplest way possible while maintaining consistency with the existing pattern. Use **shadcn/ui** for base components and **Framer Motion** for functional animations (feedback).

### 2.2 Visual Governance: Fiscal Lock (Rule 7)

Elements blocked by fiscal closing (`date` <= `closedUntil`):

* **Visual**: `opacity-50` and `cursor-not-allowed`.
* **LockIcon**: Use `Lock` (`red-500`) for closed periods and `LockOpen` (`gray-400`) for open periods.
* **Tooltip**: Display the message "🔒 Fiscal period closed" on hover. Background `bg-gray-900`, text `white`, delay of **200ms**.

### 2.3 Loading States (Skeletons)

* **General Rule**: Every asynchronous component must display an animated skeleton (`animate-pulse`).
* **Standard**: `bg-gray-200` (Light) or `bg-gray-700` (Dark). The skeleton must have the same shape and spacing as the real component.

### 2.4 Feedback Guidelines (Toasts)

* **Toasts**: Duration of 4s. Maximum 3 visible. Top right. Green (Success), Red (Error), Blue (Info).

---

## 🏗️ 3. FRONTEND STACK

**Data de Atualização:** 09 de Março de 2026
**Diretriz Principal:** Homogeneidade visual, consistência e simplicidade de implementação.

---

## 🎨 1. DESIGN SYSTEM & IDENTIDADE VISUAL

### 1.1 Filosofia Mobile-First
| Prefixo | Min-Width | Uso típico |
|---|---|---|
| _(base)_ | `0px` | Portátil / Smartphones |
| `sm` | `640px` | Portátil Paisagem |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Laptops |
| `xl` | `1280px` | Desktop |

### 1.2 Semântica de Cores (Significado Financeiro)
| Cor | Tailwind Class | Significado |
|---|---|---|
| 🟢 **Verde** | `green-600` | **Sucesso / Entrada** |
| 🔴 **Vermelho** | `red-600` | **Perigo / Saída** |
| 🔵 **Azul** | `blue-600` | **Transferência / Contabilístico** |
| 🟡 **Amarelo** | `yellow-500` | **Aviso / Pendente** |
| ⚪ **Cinza** | `gray-500` | **Neutro / Desabilitado** |

### 1.3 Padrões de Arredondamento
- **Botões/Inputs**: `rounded-md` (6px)
- **Cards**: `rounded-lg` (8px)
- **Modais**: `rounded-xl` (12px)
- **Avatares/Badges**: `rounded-full`

### 1.4 Espaçamentos (Escala Base-4)
| Token | Valor | Uso típico |
|---|---|---|
| `p-1` / `gap-1` | `4px` | Micro (ícone + texto) |
| `p-2` / `gap-2` | `8px` | Badges |
| `p-3` / `gap-3` | `12px` | Inputs |
| `p-4` / `gap-4` | `16px` | Padrão (Grid/Stack) |
| `p-6` / `gap-6` | `24px` | Cards / Sections |
| `p-8` / `gap-8` | `32px` | Layout principal |

### 1.5 Tipografia & Moeda
- **Valores Monetários**: Obrigatório o uso de `tabular-nums` e `font-semibold` para alinhamento em tabelas.
- **Labels**: `text-xs font-medium text-gray-500`.

---

## 🚦 2. DIRETRIZES DE UI & UX

### 2.1 Princípio Central
Prioridade 1: resolver da forma mais simples possível, mantendo consistência com o padrão já existente. Use **shadcn/ui** para componentes bases e **Framer Motion** para animações funcionais (feedback).

### 2.2 Governança Visual: Fiscal Lock (Regra 7)
Elementos bloqueados por fechamento fiscal (`data` <= `closedUntil`):
- **Visual**: `opacity-50` e `cursor-not-allowed`.
- **LockIcon**: Use `Lock` (`red-500`) para períodos fechados e `LockOpen` (`gray-400`) para abertos.
- **Tooltip**: Exibir mensagem "🔒 Período fiscal fechado" em hover. Fundo `bg-gray-900`, texto `white`, delay de **200ms**.

### 2.3 Estados de Carregamento (Skeletons)
- **Regra Geral**: Todo componente assíncrono deve exibir um skeleton animado (`animate-pulse`).
- **Padrão**: `bg-gray-200` (Light) ou `bg-gray-700` (Dark). O skeleton deve ter a mesma forma e espaçamento do componente real.

### 2.4 Diretrizes de Feedback (Toasts)
- **Toasts**: Duração de 4s. Máximo 3 visíveis. Topo direito. Verde (Sucesso), Vermelho (Erro), Azul (Info).

---

## 🏗️ 3. STACK DE FRONTEND
React + Tailwind + shadcn/ui + Framer Motion.
