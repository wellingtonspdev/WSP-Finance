# 🎨 WSP Finance - Frontend & Design Guidelines (V4.2)

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
