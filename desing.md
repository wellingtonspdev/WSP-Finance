# WSP Finance - Guia de Design Visual

Documento extraido do frontend atual para servir como referencia visual em outro projeto.

> Observacao: o nome do arquivo segue o pedido original (`desing.md`). Se for padronizar em outro repositorio, recomendo renomear para `design.md`.

## 1. Identidade visual

### Personalidade

O sistema usa uma estetica SaaS financeiro premium, escura, com atmosfera de painel operacional. A interface combina:

- fundo dark com gradientes profundos;
- superficies glassmorphism com blur e borda translucida;
- CTA principal em gradiente magenta-azul;
- tipografia sem serifa moderna;
- cards densos, voltados para leitura rapida de metricas financeiras;
- icones lineares da biblioteca `lucide-react`;
- animacoes discretas de entrada, hover e transicao de pagina.

O design tem duas variantes principais:

1. **Tema Personal/Pessoal**: mais expressivo, com aurora roxa, azul e magenta.
2. **Tema Business/Contador**: mais sobrio, institucional, com base slate/preta e azul corporativo.

## 2. Fontes de evidencia

Principais arquivos analisados:

- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `frontend/src/shared/components/layout/ThemeWrapper.tsx`
- `frontend/src/shared/components/layout/AppLayout.tsx`
- `frontend/src/shared/components/layout/AuthLayout.tsx`
- `frontend/src/shared/components/layout/Sidebar.tsx`
- `frontend/src/shared/components/layout/BottomNav.tsx`
- `frontend/src/shared/components/ui/Button.tsx`
- `frontend/src/shared/components/ui/Input.tsx`
- `frontend/src/features/dashboard/components/SummaryCards.tsx`
- `frontend/src/features/transactions/components/TransactionModal.tsx`
- `frontend/src/features/accountant/routes/AccountantHubPage.tsx`
- `frontend/src/assets/logo_WSP_Finance_sem_fundo.svg`
- `frontend/src/assets/wsp_finance_sem_fundo.png`

## 3. Logo e marca

### Assets

Use os assets atuais como referencia de marca:

- Logo SVG principal: `frontend/src/assets/logo_WSP_Finance_sem_fundo.svg`
- Logo PNG alternativo: `frontend/src/assets/wsp_finance_sem_fundo.png`

### Uso recomendado

- Em telas de login/autenticacao: logo centralizado, grande, com altura aproximada de `160px` (`h-40`).
- Em sidebar desktop: logo com altura aproximada de `96px` (`h-24`).
- Em sidebar recolhida: reduzir escala visualmente, mantendo o asset intacto.
- Usar `object-contain` para evitar corte.
- Aplicar `drop-shadow` em fundos escuros.
- Em hover, pode haver `scale(1.05)` com transicao de `500ms`.

### Regras de aplicacao

- Nao aplicar a logo sobre fundo claro sem revisar contraste.
- Nao distorcer proporcao.
- Nao usar dentro de cards pequenos.
- Priorizar area livre ao redor da logo, principalmente na tela de autenticacao.

## 4. Paleta de cores

### Tema Personal/Pessoal

| Token | Valor | Uso |
|---|---:|---|
| `--color-wsp-bg-start` | `#1e0b36` | inicio do gradiente global |
| `--color-wsp-bg-end` | `#1a225a` | fim do gradiente global |
| `auth-bg` | `#11051f` | base escura de autenticacao e app pessoal |
| `surface-deep` | `#1a0b2e` | sidebar, cards fortes, fundos de painel |
| `blob-1` | `#4c1d95` | aurora roxa |
| `blob-2` | `#1e40af` | aurora azul |
| `blob-3` | `#be185d` | aurora magenta |
| `cta-start` | `#D946EF` | inicio do gradiente principal |
| `cta-end` | `#3B82F6` | fim do gradiente principal |
| `btn-start` | `#ec4899` | token Tailwind do botao, variacao rosa |
| `btn-end` | `#3b82f6` | token Tailwind do botao, azul |

### Tema Business/Contador

| Token | Valor | Uso |
|---|---:|---|
| `business-bg-start` | `#0a0a0a` | fundo escuro neutro |
| `business-bg-end` | `#111821` | fundo slate muito escuro |
| `accountant-shell` | `#0f172a` | shell principal contador |
| `business-primary` | `#1978e5` | azul institucional |
| `business-secondary` | `#0ea5e9` | azul claro de apoio |
| `business-blob-1` | `#0f172a` | aurora profissional |
| `business-blob-2` | `#1e40af` | profundidade azul |
| `business-blob-3` | `#0284c7` | ciano |

### Neutros e glass

| Token | Valor | Uso |
|---|---:|---|
| `white` | `#ffffff` | texto principal |
| `slate-200` | Tailwind | texto claro secundario em business |
| `slate-300` | Tailwind | labels, texto auxiliar visivel |
| `slate-400` | Tailwind | metadados e descricoes |
| `slate-500` | Tailwind | icones e placeholders |
| `slate-600` | Tailwind | placeholder em inputs |
| `glass-bg` | `rgba(255, 255, 255, 0.08)` | superficie translucida |
| `glass-border` | `rgba(255, 255, 255, 0.10)` | borda sutil |
| `glass-hover` | `rgba(255, 255, 255, 0.10)` | hover de card/nav |
| `glass-subtle` | `rgba(255, 255, 255, 0.05)` | cards e itens inativos |

### Feedback semantico

| Semantica | Cores atuais | Uso |
|---|---|---|
| Sucesso/entrada | `green-400`, `green-500`, `emerald-300`, `emerald-500` | entradas, status OK, atualizado |
| Erro/saida | `red-400`, `red-500`, `red-600` | despesas, erros, alertas criticos |
| Alerta | `yellow-500`, `amber-400`, `amber-500` | prazo, pendencias, inbox |
| Informacao | `blue-400`, `blue-500`, `#1978e5` | business, acesso, pro-labore |
| Destaque premium | `purple-400`, `purple-500`, `#D946EF` | analytics, documentos, foco pessoal |

## 5. Gradientes

### Fundo global personal

```css
background-color: #1e0b36;
background-image: linear-gradient(to bottom, #1e0b36, #1a225a);
```

### Fundo de autenticacao/app personal

```css
background: #11051f;
```

Com auroras:

```css
background: linear-gradient(to bottom, #4c1d95, #2e1065, transparent);
filter: blur(100px);
opacity: 0.60;
```

```css
background: linear-gradient(to top, #1e3a8a, transparent);
filter: blur(80px);
opacity: 0.40;
```

### Fundo business

```css
background-color: #0f172a;
```

Aurora business:

```css
background: linear-gradient(to bottom left, #0f172a, #1e1b4b, #0f172a);
filter: blur(120px);
opacity: 0.70;
```

### CTA principal

```css
background: linear-gradient(to right, #D946EF, #3B82F6);
box-shadow: 0 10px 15px rgba(168, 85, 247, 0.20-0.30);
```

Use esse gradiente para:

- botao principal;
- FAB mobile;
- acao de criar transacao;
- destaque de categoria premium/marketplace.

Nao usar esse gradiente em todos os botoes. Ele deve indicar acao primaria.

## 6. Tipografia

### Familia

Fonte principal:

```css
font-family: Inter, sans-serif;
```

Fallback:

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### Escala observada

| Papel | Classe/Tamanho | Peso | Uso |
|---|---:|---:|---|
| Display financeiro | `text-4xl` a `text-5xl` | `font-bold` | saldo total |
| Titulo de pagina | `text-2xl` | `font-bold` | saudacao, hub contador |
| Titulo de secao | `text-xl` ou `text-lg` | `font-bold`/`font-semibold` | secoes, cards |
| Titulo de modal | `text-xl` | `font-bold` | drawer/modal |
| Corpo | `text-sm` | `font-medium` normal | textos operacionais |
| Label | `text-xs`/`text-sm` | `font-medium` | campos e metadados |
| Badge/contador | `text-[10px]` a `text-xs` | `font-bold` | status, chips, indicadores |

### Regras

- Texto principal sempre branco ou slate claro.
- Labels em `text-slate-300` ou `text-slate-400`.
- Placeholders em `text-slate-500`/`text-slate-600`.
- Para valores financeiros, usar peso alto e tracking normal/tight.
- Evitar letter-spacing negativo. O sistema usa `tracking-tight` pontualmente e `tracking-wider` em labels uppercase.
- Labels uppercase devem ser reservados para metrica ou cabecalho de tabela.

## 7. Layout e grid

### Shell principal

O app usa layout full-screen:

- `h-screen`
- `overflow-hidden`
- sidebar fixa/sticky no desktop
- area principal com scroll vertical proprio
- conteudo com padding lateral responsivo

Padrao:

```tsx
<div className="flex h-screen text-white font-sans antialiased overflow-hidden relative">
  <Sidebar />
  <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-32 lg:pb-8" />
</div>
```

### Breakpoints

O projeto usa breakpoints padrao do Tailwind:

| Prefixo | Largura minima |
|---|---:|
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |
| `2xl` | `1536px` |

### Desktop

- Sidebar visivel a partir de `lg`.
- Sidebar expandida: `w-72` (`288px`).
- Sidebar recolhida: `w-20` (`80px`).
- Conteudo principal: `px-8`.
- Cards de resumo: grid de 3 colunas.
- Tabelas em painels com `overflow-x-auto`.

### Mobile

- Sidebar escondida.
- Bottom navigation fixa.
- FAB central elevado.
- Conteudo com `pb-32` para nao colidir com bottom nav.
- Cards com scroll horizontal/snap em hubs densos.
- Modais viram bottom sheets com bordas superiores arredondadas.

## 8. Espacamento

Escala dominante baseada em Tailwind:

| Token | Valor | Uso |
|---|---:|---|
| `1` | `4px` | offsets pequenos |
| `1.5` | `6px` | labels e detalhes |
| `2` | `8px` | gaps compactos |
| `3` | `12px` | gaps de botoes e linhas |
| `4` | `16px` | padding padrao compacto |
| `5` | `20px` | cards secundarios |
| `6` | `24px` | padding de secao/card |
| `8` | `32px` | cards auth e blocos grandes |
| `12` | `48px` | header mobile/top padding |

Padroes:

- Secoes: `mb-6` a `mb-8`.
- Cards KPI: `p-5` ou `p-6`.
- Form cards: `p-8`.
- Form fields: `space-y-4` ou `space-y-6`.
- Botoes principais: `py-4`, altura visual aproximada de `56px`.
- Icon buttons: `p-2`, tamanho visual entre `36px` e `44px`.

## 9. Radius

O sistema usa cantos bem arredondados, com linguagem mobile-first.

| Token | Classe | Uso |
|---|---|---|
| `radius-sm` | `rounded-lg` | botoes pequenos, chips, filtro |
| `radius-md` | `rounded-xl` | nav items, inputs compactos, acoes |
| `radius-lg` | `rounded-2xl` | botoes, cards, quick actions |
| `radius-xl` | `rounded-3xl` | cards grandes e auth card |
| `radius-full` | `rounded-full` | avatar, pills, indicadores |
| `sheet-radius` | `rounded-t-[32px]` | bottom sheet mobile |

Recomendacao para outro projeto: manter `rounded-xl`/`rounded-2xl` como padrao e reservar `rounded-3xl` para cards principais ou superficies de destaque.

## 10. Sombras, blur e vidro

### Superficies glass

Padrao de card:

```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.10);
```

Card forte:

```css
background: rgba(26, 11, 46, 0.80);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.10);
box-shadow: 0 25px 50px rgba(88, 28, 135, 0.20);
```

### Sombras

| Uso | Classe observada |
|---|---|
| CTA principal | `shadow-lg shadow-purple-500/20` |
| CTA hover | `hover:shadow-purple-500/40` |
| Auth card | `shadow-2xl shadow-purple-900/20` |
| Tabela/painel | `shadow-2xl` |
| Skeleton/cards leves | `shadow-sm` |
| Sidebar toggle | `shadow-lg` |

### Noise

Existe textura sutil `.bg-noise`:

```css
opacity: 0.03;
background-image: inline SVG fractal noise;
```

Uso recomendado: apenas como camada fixa global para reduzir aspecto chapado do fundo escuro.

## 11. Componentes padrao

### Botao primario

Visual:

- largura total quando em formulario;
- `rounded-2xl`;
- gradiente `#D946EF -> #3B82F6`;
- texto branco, `font-bold`, `text-lg`;
- hover com sombra mais forte e scale `1.02`;
- active scale `0.98`;
- loading com spinner `Loader2`.

Exemplo:

```tsx
<button className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D946EF] to-[#3B82F6] text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
  Registrar Transacao
</button>
```

### Botao secundario

Visual:

- fundo `white/5` ou cor semantica com alpha;
- borda `white/10` ou alpha da cor;
- texto `slate-300`, azul, amber ou purple;
- `rounded-xl`;
- hover com `white/10` ou cor alpha mais forte.

### Inputs

Padrao:

- `rounded-2xl`;
- texto branco;
- fundo `#11051f/50` ou `white/5`;
- borda `white/5` ou `white/10`;
- placeholder `slate-600`;
- foco com ring magenta no tema personal ou azul no business;
- icone a esquerda em `slate-500`, mudando para magenta no foco.

Exemplo:

```tsx
<input className="w-full py-4 rounded-2xl text-white font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D946EF]/50 border border-white/5 bg-[#11051f]/50 shadow-inner" />
```

### Cards KPI

Card principal:

- `bg-gradient-to-br from-white/10 to-white/5`;
- `backdrop-blur-md`;
- `border-white/10`;
- `rounded-3xl`;
- `p-6`;
- valor financeiro `text-4xl lg:text-5xl font-bold`.

Cards secundarios:

- `bg-white/5`;
- `rounded-2xl`;
- `p-5`;
- hover `bg-white/10`;
- icone dentro de circulo semantico (`green-500/20`, `red-500/20`, etc.).

### Sidebar desktop

Personal:

- fundo `#1a0b2e/95`;
- blur forte;
- borda direita `white/5`;
- largura `288px`, recolhida `80px`.

Nav item:

- ativo: `bg-white/10 text-white`;
- inativo: `text-slate-400 hover:bg-white/5 hover:text-white`;
- icone ativo: azul `#3B82F6`;
- radius `rounded-xl`.

### Bottom navigation mobile

- fixa embaixo;
- fundo `#1a0b2e/90`;
- `backdrop-blur-lg`;
- borda superior `white/5`;
- altura aproximada `80px`;
- FAB central circular com gradiente magenta-azul;
- home indicator `white/20`.

### Modal / bottom sheet

Desktop:

- drawer lateral direito;
- largura aproximada `500px`;
- `h-full`;
- borda esquerda `white/10`;
- background `#11051f/85`;
- blur `backdrop-blur-xl`;
- shadow `2xl`.

Mobile:

- bottom sheet;
- `height: 92%`;
- `rounded-t-[32px]`;
- handle superior `w-12 h-1.5 bg-white/20 rounded-full`;
- footer fixo com blur e CTA.

### Tabelas

Uso observado no hub contador:

- container `bg-[#11051f]/50`;
- border `white/5`;
- `rounded-2xl`;
- header `bg-white/5`;
- linhas com `divide-y divide-white/5`;
- hover `bg-white/5`;
- cabecalhos `text-xs uppercase tracking-wider text-slate-400`.

## 12. Iconografia

Biblioteca padrao:

```ts
lucide-react
```

Icones observados:

- Navegacao: `Home`, `Receipt`, `BarChart2`, `User`, `FileText`, `MessageCircle`, `WalletCards`
- Acoes: `Plus`, `LogOut`, `ChevronLeft`, `ChevronRight`, `ArrowRight`
- Feedback: `AlertTriangle`, `Bell`, `Clock`, `RefreshCw`
- Financeiro: `ArrowDown`, `ArrowUp`, `ArrowUpRight`, `ArrowDownRight`, `Store`, `Repeat`
- UI: `Search`, `MoreVertical`, `X`, `Eye`, `Loader2`

Regras:

- Usar icones lineares, stroke padrao do Lucide.
- Tamanhos comuns: `w-4 h-4`, `w-5 h-5`, `w-6 h-6`.
- FAB principal: `w-8 h-8`.
- Icones em cards devem ficar em containers circulares ou `rounded-xl`.
- Nao misturar familias de icones sem necessidade. Ha um SVG manual em um caso pontual, mas o padrao deve ser Lucide.

## 13. Motion e transicoes

### Keyframes globais

Blob:

```css
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
```

Fade in up:

```css
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### Framer Motion

Transicao de pagina:

```ts
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
exit: { opacity: 0, y: -8 }
transition: { duration: 0.25, ease: 'easeOut' }
```

Cards:

- entrada com `opacity: 0 -> 1`;
- `y: 20 -> 0`;
- stagger entre filhos `0.10s` a `0.12s`.

Modal:

- overlay: fade `0.2s`;
- drawer: spring com `damping: 28`, `stiffness: 300`;
- deslocamento inicial `x: 100%`.

### Interacoes

- CTA hover: `scale(1.02)`.
- CTA active: `scale(0.98)`.
- FAB hover: `scale(1.05)`.
- Botao plus da sidebar: icone gira `90deg` no hover.
- Botoes de retorno/acesso: icone desloca `translate-x` ou `-translate-x`.
- Sidebar: transicao `duration-300 ease-in-out`.
- Troca de tema: `transition-colors duration-500 ease-in-out`.

## 14. Estados visuais

### Loading

- Botoes: `Loader2` com `animate-spin`.
- Cards: skeleton com `animate-pulse`.
- Blocos skeleton: `bg-white/10`, `bg-white/5`, `rounded`, `rounded-full`.

### Disabled

- `opacity-70`;
- `cursor-not-allowed`;
- `grayscale` em botoes principais.

### Erro

Inputs:

```css
border: 1px solid rgba(239, 68, 68, 0.50);
background: rgba(239, 68, 68, 0.05);
```

Mensagem:

- `text-xs`;
- `font-medium`;
- `text-red-400`.

### Alertas

Alerta amarelo:

```css
background: rgba(234, 179, 8, 0.10);
border: 1px solid rgba(234, 179, 8, 0.20);
color: yellow-500;
```

### Badges

Padrao:

- `rounded-full`;
- border com alpha da cor;
- fundo com alpha `10%`;
- texto `text-[10px]` ou `text-xs`;
- `font-bold`;
- uppercase em status critico/pendente/ok.

## 15. Tematizacao por persona

### Regra atual

O tema business e aplicado quando:

- usuario tem `type === 'ACCOUNTANT'`; ou
- workspace ativo tem `type === 'BUSINESS'`.

O componente que aplica isso e `ThemeWrapper`.

### Personal

Use para:

- pessoa fisica;
- dashboard pessoal;
- experiencia principal de usuario final;
- telas com apelo mais emocional e premium.

Visual:

- fundo roxo profundo;
- auroras roxa/azul;
- magenta como foco;
- gradiente magenta-azul em CTA.

### Business/Contador

Use para:

- central do contador;
- workspace empresarial;
- telas de auditoria;
- fluxos de revisao, documentos e pendencias.

Visual:

- fundo slate/preto;
- azul institucional `#1978e5`;
- cards menos coloridos;
- tons semanticos para risco e status;
- densidade maior de dados.

## 16. Padroes por tipo de tela

### Autenticacao

- Tela centralizada.
- Fundo `#11051f`.
- Auroras grandes no background.
- Logo grande no topo.
- Card `max-w-sm`, `p-8`, `rounded-3xl`, `backdrop-blur-xl`.
- Formularios com inputs grandes e CTA full-width.

### Dashboard pessoal

- Header com saudacao.
- Seletor de workspace em pill translucida.
- KPI principal com saldo em destaque.
- Cards de entrada/saida em grid.
- Acoes rapidas em botoes iconograficos.
- Historico recente abaixo.

### Hub contador

- Header funcional com busca, filtros e refresh.
- Cards KPI em grid desktop e snap horizontal mobile.
- Tabela desktop para clientes.
- Cards mobile para clientes.
- Botoes semanticos por acao: inbox amber, docs purple, acesso blue.

### Transacao

- Modal/drawer para manter contexto.
- Abas de tipo de transacao em grid 4 colunas.
- Cores semanticas:
  - ganho: verde;
  - marketplace: gradiente/purple;
  - despesa: vermelho;
  - pro-labore: azul.
- Footer fixo com CTA.
- Campos organizados em blocos `space-y-4`.

## 17. Tokens recomendados para novo projeto

### CSS variables base

```css
:root {
  --wsp-font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --wsp-bg-start: #1e0b36;
  --wsp-bg-end: #1a225a;
  --wsp-bg-deep: #11051f;
  --wsp-surface: rgba(255, 255, 255, 0.05);
  --wsp-surface-strong: rgba(26, 11, 46, 0.80);
  --wsp-border: rgba(255, 255, 255, 0.10);
  --wsp-border-subtle: rgba(255, 255, 255, 0.05);

  --wsp-primary-start: #D946EF;
  --wsp-primary-end: #3B82F6;
  --wsp-primary-blue: #3B82F6;
  --wsp-primary-magenta: #D946EF;

  --wsp-business-bg: #0f172a;
  --wsp-business-primary: #1978e5;
  --wsp-business-secondary: #0ea5e9;

  --wsp-success: #22c55e;
  --wsp-success-text: #4ade80;
  --wsp-danger: #ef4444;
  --wsp-danger-text: #f87171;
  --wsp-warning: #f59e0b;
  --wsp-info: #3b82f6;

  --wsp-radius-sm: 8px;
  --wsp-radius-md: 12px;
  --wsp-radius-lg: 16px;
  --wsp-radius-xl: 24px;
  --wsp-radius-2xl: 32px;

  --wsp-blur-card: 12px;
  --wsp-blur-panel: 24px;
  --wsp-duration-fast: 200ms;
  --wsp-duration-normal: 300ms;
  --wsp-duration-theme: 500ms;
  --wsp-ease-standard: ease-in-out;
}
```

### Tailwind extend sugerido

```js
extend: {
  colors: {
    'wsp-bg-start': '#1e0b36',
    'wsp-bg-end': '#1a225a',
    'wsp-bg-deep': '#11051f',
    'wsp-surface': 'rgba(255,255,255,0.05)',
    'wsp-border': 'rgba(255,255,255,0.10)',
    'wsp-primary-start': '#D946EF',
    'wsp-primary-end': '#3B82F6',
    'wsp-business': '#1978e5'
  },
  fontFamily: {
    sans: ['Inter', 'sans-serif']
  },
  borderRadius: {
    'wsp-card': '1.5rem',
    'wsp-sheet': '2rem'
  }
}
```

## 18. Acessibilidade e contraste

### Pontos fortes

- Base escura com texto branco oferece bom contraste para conteudo principal.
- Estados semanticos usam icone + cor + texto em varios pontos.
- Botoes possuem area de toque adequada em mobile.
- Navegacao mobile tem FAB claro e labels curtos.

### Cuidados ao reutilizar

- Texto `text-slate-500` pode ficar fraco em fundos `white/5`; use para placeholder/metadado, nao para conteudo principal.
- `white/5` com borda `white/5` pode ser sutil demais em telas de baixo contraste.
- Nao depender apenas de cor para status financeiro; manter icone, label ou texto.
- Respeitar `prefers-reduced-motion` se o novo projeto tiver publico sensivel a animacao.
- Garantir foco visivel em todos os botoes icon-only.
- Em tabelas densas, manter altura e padding suficientes para leitura.

## 19. Do and don't

### Fazer

- Usar fundo dark com profundidade e aurora controlada.
- Usar glass cards com borda sutil.
- Reservar gradiente magenta-azul para acao primaria.
- Usar azul institucional `#1978e5` para business/contador.
- Usar `lucide-react` para iconografia.
- Manter cards financeiros com hierarquia clara: label pequeno, valor grande, metadado discreto.
- Usar semantica de cor consistente: verde entrada, vermelho saida, amber pendencia, azul informacao.
- Preservar mobile-first: bottom nav, FAB central, bottom sheets.

### Evitar

- Usar fundo claro sem redesenhar a paleta.
- Espalhar gradientes em componentes secundarios.
- Misturar muitos tons saturados na mesma tela.
- Criar cards dentro de cards sem necessidade.
- Usar texto longo em badges ou botoes compactos.
- Usar blur/aurora sobre conteudo legivel.
- Usar `slate-500` para textos essenciais.
- Trocar a familia de icones sem criterio.

## 20. Checklist para reproduzir o design em outro projeto

- [ ] Configurar `Inter` como fonte principal.
- [ ] Criar tema personal com `#11051f`, `#1e0b36`, `#1a225a`, `#D946EF`, `#3B82F6`.
- [ ] Criar tema business com `#0f172a`, `#0a0a0a`, `#111821`, `#1978e5`.
- [ ] Implementar background com auroras blur.
- [ ] Implementar superficies glass: `white/5`, `white/10`, `backdrop-blur`.
- [ ] Criar Button primario gradiente com loading.
- [ ] Criar Input dark com icone, erro e foco.
- [ ] Criar Card KPI principal e secundario.
- [ ] Criar Sidebar desktop recolhivel.
- [ ] Criar BottomNav mobile com FAB.
- [ ] Criar Modal/Drawer responsivo.
- [ ] Padronizar badges semanticos.
- [ ] Padronizar skeletons com `animate-pulse`.
- [ ] Adotar `lucide-react`.
- [ ] Validar contraste e foco em mobile/desktop.

## 21. Resumo executivo

O design visual do WSP Finance e um dark glass dashboard com duas camadas de identidade: uma experiencia pessoal mais expressiva em roxo/magenta/azul e uma experiencia business mais institucional em slate/azul. A linguagem depende de fundos profundos, auroras desfocadas, cards translucidos, bordas `white/10`, CTAs em gradiente e tipografia Inter. Para reutilizar em outro projeto, preserve a hierarquia financeira, os tokens de cor por persona, o uso controlado de gradientes, a navegacao mobile com FAB e os componentes base em glassmorphism.
