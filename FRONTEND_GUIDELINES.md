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

React + Tailwind + shadcn/ui + Framer Motion.
