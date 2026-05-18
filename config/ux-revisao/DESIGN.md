# Especificação Visual/Interação — LEM-52

**Épico:** LEM-52 | **Versão:** 1.0 | **Data:** 2026-05-18
**Autor:** agente design | **Fonte:** DECISAO.md (ratificada, lida na íntegra)
**Status:** PRONTO PARA TECH

---

## Contexto arquitetural importante

> Leia antes de implementar qualquer área.

O `UnifiedSidebar` usa **um único array `links: NavLink[]`** que é passado tanto para
`ExpandedPanel` (strip de ícones) quanto para `SidePanelNav` (conteúdo do painel direito).
Os links atuais são todos "panel links" — abrem um painel no sidebar ao serem clicados.

Os novos links de destino (Studio, Flows, Automações, Admin) são **nav links** — navegam
para uma rota via `react-router` e **não abrem painel**. Isso exige estender o tipo `NavLink`
e atualizar `ExpandedPanel` + `SidePanelNav` para tratá-los diferentemente.

**Extensão mínima do tipo `NavLink`** (`client/src/common/types.ts`):

```ts
export type NavLink = {
  title: TranslationKeys;
  label?: string;
  icon: LucideIcon | React.FC;
  id: string;
  Component?: React.ComponentType;
  onClick?: (e?: React.MouseEvent) => void;
  href?: string;        // NOVO: presente → nav link (navigate(href)); ausente → panel link
  separator?: true;     // NOVO: presente → renderiza divisor visual, sem ícone, sem painel
  adminOnly?: boolean;  // NOVO: se true, só visível quando user.role === SystemRoles.ADMIN
};
```

Regras de renderização:
- `href` presente → `ExpandedPanel` renderiza botão de navegação; `SidePanelNav` ignora
- `separator: true` → `ExpandedPanel` renderiza `<div role="separator">` (ver abaixo); `SidePanelNav` ignora
- `adminOnly: true` → `ExpandedPanel` e `SidePanelNav` só renderizam se `isAdmin`

---

## Área 1 — Menu, Navegação e Hierarquia

### 1.1 Estrutura de links — `useUnifiedSidebarLinks.ts`

Substituir a composição atual por grupos ordenados:

```
Grupo A — Destinos primários (nav links, href)
  1. Studio de Imagens     href="/d/studio"        icon=Image         id="nav-studio"
  2. Flows                 href="/d/agent-studio"  icon=GitFork       id="nav-flows"
  3. Automações            href="/d/automacoes"    icon=CalendarClock id="nav-automacoes"

  { separator: true, id: 'sep-1', title: '' }   ← divisor visual

Grupo B — Painéis contextuais (panel links, sem href)
  4. Conversas             Component=ConversationsSection  id="conversations"
  5. Agentes               Component=AgentPanelSwitch      id="agents"
  6. Prompts               Component=PromptsAccordion      id="prompts"
  7. Arquivos              Component=FilesPanel            id="files"
  [Memórias, MCP, Params — condicionais existentes mantidos]

  { separator: true, id: 'sep-2', title: '' }   ← divisor visual (só se Admin visível)

Grupo C — Admin (nav link + adminOnly)
  8. Admin                 href="/d/admin"         icon=ShieldCheck   id="nav-admin"
                           adminOnly: true
```

> **Dependência tech (Área 5):** `bookmarks` está oculto por config — não constar aqui.

### 1.2 NavIconButton — `ExpandedPanel.tsx`

**Nav link (href presente):**

```tsx
// Detecta rota ativa
const isNavActive = href ? location.pathname.startsWith(href) : false;

// Clique → navigate, não chama setActive nem onExpand
const handleNavClick = () => navigate(link.href!);
```

Visual (mesmos tokens dos panel links):
- Default: `text-text-secondary bg-transparent`
- Active (rota atual): `bg-surface-active-alt text-text-primary`
- Hover: `hover:bg-surface-hover`
- Focus-visible: `focus-visible:ring-2 focus-visible:ring-ring-primary`
- Tamanho: `h-9 w-9 rounded-lg` (igual ao existente)
- Ícone: `h-4 w-4 aria-hidden="true"`

**Separator (`separator: true`):**

```tsx
<div
  role="separator"
  aria-hidden="true"
  className="mx-1.5 my-1 h-px bg-border-light"
/>
```

Sem TooltipAnchor, sem botão, sem aria interativo.

**Admin (`adminOnly: true`):**
- Filtrar no render: `if (link.adminOnly && !isAdmin) return null`

### 1.3 SidePanelNav — `Nav.tsx`

Filtrar links antes de renderizar painéis:
```ts
const panelLinks = links.filter(l => !l.href && !l.separator);
```
Usar `panelLinks` no lugar de `links` para renderização de painéis.

### 1.4 AccountSettings — `AccountSettings.tsx`

Remover entradas de navegação para Studios. Nova estrutura do dropdown:

```
[email do usuário]             role="note", desabilitado
[DropdownMenuSeparator]
[saldo]                        condicional: balance.enabled && data != null
[DropdownMenuSeparator]        condicional: aparece apenas se saldo foi exibido
[Meus Arquivos]                icon=FileText    → setShowFiles(true)
[Ajuda / FAQ]                  icon=LinkIcon    → window.open (se helpAndFaqURL !== '/')
[Configurações]                icon=GearIcon    → setShowSettings(true)
[DropdownMenuSeparator]
[Logout]                       icon=LogOut      → logout()
```

Remover completamente:
- `canUseAgentStudio` (hook + condicional)
- MenuItem "Studio de Agentes" (`com_studio_flow_nav`)
- MenuItem "Studio de Imagens" (`com_studio_image_nav`)
- MenuItem "Admin" (`com_admin_panel`) — agora está no sidebar

Manter imports não utilizados somente se ainda referenciados em outro lugar; caso contrário, remover.

### 1.5 i18n — chaves novas

Adicionar em `client/src/locales/en/translation.json` (prefixo `com_ui_ux_`):

```json
"com_ui_ux_nav_studio_imagens": "Studio de Imagens",
"com_ui_ux_nav_flows": "Flows",
"com_ui_ux_nav_automacoes": "Automações",
"com_ui_ux_nav_agentes": "Agentes"
```

Usar `com_ui_ux_nav_agentes` no `title` do NavLink do AgentPanelSwitch em `useSideNavLinks.ts`
(substituindo `com_sidepanel_agent_builder`).

### 1.6 Automações — seam tech

A rota `/d/automacoes` **não existe** em `Dashboard.tsx` e `AutomacoesScreen` **não existe**
como componente. Tech deve criar seguindo a spec de LEM-45/LEM-50 (wiki design) e registrar:

```ts
// Dashboard.tsx
import AutomacoesScreen from '~/components/Automacoes/AutomacoesScreen';
// ...
{ path: 'automacoes', element: <AutomacoesScreen /> }
```

### 1.7 Estados mobile

O `UnifiedSidebar` em mobile renderiza `ExpandedPanel` dentro de um drawer. Nenhuma mudança
de comportamento: ícones de nav link estão presentes, tooltips não aparecem em touch (padrão
do `TooltipAnchor`), `aria-label` sempre presente para screen readers.

Touch target mínimo: `h-9 w-9` já cobre 36×36px (acima do mínimo WCAG de 24×24px).

---

## Área 2 — Tokens: Uso e Disponibilidade até a Virada

### 2.1 Dados necessários

Do `useGetUserBalance`, o `BalanceWidget` precisa:

| Campo | Já disponível | Usado para |
|---|---|---|
| `tokenCredits` | ✅ | Saldo atual |
| `refillAmount` | ✅ (Balance.tsx já desestrutura) | Teto do ciclo |
| `lastRefill` | ✅ | Cálculo da próxima virada |
| `refillIntervalUnit` | ✅ | Cálculo da próxima virada |
| `refillIntervalValue` | ✅ | Cálculo da próxima virada |
| `autoRefillEnabled` | ✅ | Gate para exibir barra |

**Cálculo de percentual:**
```ts
const pct = refillAmount > 0
  ? Math.round(((refillAmount - toDisplayCredits(tokenCredits)) / refillAmount) * 100)
  : 0;
// Clamp: Math.min(100, Math.max(0, pct))
```

**Cor semântica (3 estados):**
```ts
const colorState = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';
const iconColor   = { safe: 'text-text-secondary', warning: 'text-yellow-500', danger: 'text-red-500' }[colorState];
const barColor    = { safe: 'bg-green-500',         warning: 'bg-yellow-500',  danger: 'bg-red-500'   }[colorState];
```

**Data formatada ("Vira DD/MM"):**
```ts
const nextRefillDate = autoRefillEnabled && lastRefill
  ? getNextFutureInterval(new Date(lastRefill), refillIntervalValue, refillIntervalUnit)
  : null;

const viraDDMM = nextRefillDate
  ? nextRefillDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  : null;
// Resultado: "01/06"
```

`getNextFutureInterval` já existe em `AutoRefillSettings.tsx` — mover para `utils/credits.ts`
ou importar diretamente de lá.

### 2.2 BalanceWidget — modo colapsado (`collapsed=true`)

```
[SVG progress ring 18px] ← substitui <Coins> quando autoRefillEnabled && refillAmount > 0
```

**SVG progress ring:**

```tsx
const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 43.98

<svg width="18" height="18" viewBox="0 0 18 18" className={iconColor} aria-hidden="true">
  {/* Track */}
  <circle
    cx="9" cy="9" r={RADIUS}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    opacity={0.2}
  />
  {/* Progress — começa no topo (-90°) */}
  <circle
    cx="9" cy="9" r={RADIUS}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeDasharray={CIRCUMFERENCE}
    strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
    strokeLinecap="round"
    transform="rotate(-90 9 9)"
  />
</svg>
```

Fallback quando `!autoRefillEnabled || !refillAmount`: exibe `<Coins size={18} />` (comportamento atual).

**Tooltip:**
```
"847 / 1.000 créditos · Vira 01/06"
```
Quando sem data: `"847 créditos"` (comportamento atual).

**ARIA:**
```tsx
aria-label={viraDDMM
  ? `${formattedCredits} ${localize('com_ui_ux_balance_de')} ${displayCeiling} ${localize('com_ui_ux_balance_creditos')} · ${localize('com_ui_ux_balance_vira_em')} ${viraDDMM}`
  : `${localize('com_nav_balance')}: ${formattedCredits}`}
```

### 2.3 BalanceWidget — modo expandido (`collapsed=false`)

Layout:

```
┌────────────────────────────────────────┐
│ [Coins 14px]  847 / 1.000 créditos     │  ← linha 1
│               [████████░░] · Vira 01/06│  ← linha 2
└────────────────────────────────────────┘
```

```tsx
<button
  type="button"
  role="status"
  onClick={() => openSettingsBalance()}   // ← abre Settings na tab Balance
  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs
             hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-ring-primary"
  aria-label={/* ver acima */}
>
  <Coins size={14} className={cn('flex-shrink-0', iconColor)} aria-hidden="true" />
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="truncate font-medium text-text-primary">
      {formattedCredits} / {displayCeiling} {localize('com_ui_ux_balance_creditos')}
    </span>
    {autoRefillEnabled && refillAmount > 0 && (
      <div className="flex items-center gap-1.5">
        {/* Barra de progresso */}
        <div
          className="h-1 w-20 flex-shrink-0 overflow-hidden rounded-full bg-surface-tertiary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cn('h-full rounded-full transition-all duration-300', barColor)}
               style={{ width: `${pct}%` }} />
        </div>
        {viraDDMM && (
          <span className={cn('truncate text-text-tertiary', colorState !== 'safe' && iconColor)}>
            {localize('com_ui_ux_balance_vira_em')} {viraDDMM}
          </span>
        )}
      </div>
    )}
  </div>
</button>
```

**Click → abrir Settings na aba Balance:** O `AccountSettings` já controla o `showSettings`
state. O `BalanceWidget` precisa de um callback ou de um estado compartilhado. Abordagem
recomendada: `BalanceWidget` recebe `onOpenSettings?: () => void` como prop, chamado no click.
`ExpandedPanel` passa `onOpenSettings` conectado ao estado de `AccountSettings`.

Alternativa mais simples: `BalanceWidget` emite um custom event ou usa um atom Jotai
`openSettingsTabAtom` que `AccountSettings` observa e abre na tab correta.

**Spec de seam para tech**: `BalanceWidget` expõe `onOpenSettings?: () => void` prop.
`ExpandedPanel` cria o handler e o passa. `AccountSettings` se move para cima no contexto
se necessário (sem refatoração forçada — tech decide implementação).

**Estado: loading:**
```tsx
// collapsed
<div className="flex h-9 w-9 items-center justify-center">
  <Skeleton className="h-[18px] w-[18px] rounded-full" />
</div>

// expanded
<div className="flex items-center gap-2 px-3 py-1.5">
  <Skeleton className="h-3.5 w-3.5 rounded-full" />
  <div className="flex flex-col gap-0.5">
    <Skeleton className="h-3 w-28 rounded" />
    <Skeleton className="h-1 w-20 rounded-full" />
  </div>
</div>
```

**Estado: balance.enabled = false** → return null (comportamento mantido).

**Estado: refillAmount = 0 ou undefined** → exibe widget sem barra, sem data, só saldo atual.

### 2.4 Settings > Balance — `Balance.tsx` + `AutoRefillSettings.tsx`

**Balance.tsx — adicionar card de destaque no topo:**

```tsx
{/* Card de ciclo — visível se autoRefillEnabled e dados presentes */}
{autoRefillEnabled && hasValidRefillSettings && (
  <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-medium text-text-primary">
        {localize('com_ui_ux_balance_cycle')}
      </span>
      {viraDDMM && (
        <span className={cn('text-xs', colorState !== 'safe' ? iconColor : 'text-text-tertiary')}>
          {localize('com_ui_ux_balance_vira_em')} {viraDDMM}
        </span>
      )}
    </div>
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-2xl font-semibold text-text-primary">{formattedCredits}</span>
      <span className="text-sm text-text-secondary">
        / {displayCeiling} {localize('com_ui_ux_balance_creditos')}
      </span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary"
         role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', barColor)}
           style={{ width: `${pct}%` }} />
    </div>
    <p className="mt-1.5 text-right text-xs text-text-tertiary">{pct}%</p>
  </div>
)}
```

**AutoRefillSettings.tsx — renomear labels (sem alterar lógica):**

| Chave atual | Chave nova | Valor PT-BR |
|---|---|---|
| `com_nav_balance_auto_refill_settings` | `com_ui_ux_balance_cycle` | "Ciclo atual" |
| `com_nav_balance_last_refill` | `com_ui_ux_balance_ultimo_ciclo` | "Último ciclo:" |
| `com_nav_balance_refill_amount` | `com_ui_ux_balance_creditos_ciclo` | "Créditos do ciclo:" |
| `com_nav_balance_interval` | `com_ui_ux_balance_frequencia` | "Frequência:" |
| `com_nav_balance_next_refill` | `com_ui_ux_balance_proxima_virada` | "Próxima virada:" |
| `com_nav_balance_every` | manter ou `com_ui_ux_balance_a_cada` | "A cada" |

> Não remover as chaves `com_nav_balance_*` — apenas adicionar as novas. AutoRefillSettings
> atualiza para usar as novas. Chaves antigas permanecem no JSON para não quebrar histórico.

### 2.5 i18n — chaves novas Balance

```json
"com_ui_ux_balance_cycle": "Ciclo atual",
"com_ui_ux_balance_vira_em": "Vira",
"com_ui_ux_balance_creditos": "créditos",
"com_ui_ux_balance_de": "de",
"com_ui_ux_balance_ultimo_ciclo": "Último ciclo:",
"com_ui_ux_balance_creditos_ciclo": "Créditos do ciclo:",
"com_ui_ux_balance_frequencia": "Frequência:",
"com_ui_ux_balance_proxima_virada": "Próxima virada:",
"com_ui_ux_balance_a_cada": "A cada"
```

---

## Área 3 — Interface de Chat e Fluxo de Raciocínio

### 3.1 Reasoning.tsx — comportamento contextual

**Substituir estado inicial baseado em `showThinkingAtom` por estado contextual:**

```tsx
// ANTES (remover):
const showThinking = useAtomValue(showThinkingAtom);
const [isExpanded, setIsExpanded] = useState(showThinking);

// DEPOIS:
const [isExpanded, setIsExpanded] = useState(
  () => Boolean(effectiveIsSubmitting && isLast)
);
```

> `effectiveIsSubmitting` e `isLast` já existem no componente. O estado inicial expandido
> ocorre apenas quando este é o último bloco de raciocínio de uma mensagem em streaming.

**Auto-colapso ao término do streaming:**

```tsx
useEffect(() => {
  if (!effectiveIsSubmitting && isLast) {
    setIsExpanded(false);
  }
}, [effectiveIsSubmitting, isLast]);
```

Essa transição é o sinal visual de que o modelo terminou de pensar e a resposta chegou.

### 3.2 Labels PT-BR — `Reasoning.tsx`

```tsx
const label = useMemo(() => {
  if (effectiveIsSubmitting && isLast) {
    return localize('com_ui_ux_reasoning_analisando');  // "Analisando..."
  }
  return isExpanded
    ? localize('com_ui_ux_reasoning_ocultar')           // "Ocultar raciocínio"
    : localize('com_ui_ux_reasoning_ver');              // "Ver raciocínio"
}, [effectiveIsSubmitting, isLast, isExpanded, localize]);
```

### 3.3 ThinkingButton — ícone e animação

**Substituir `Lightbulb` por `BrainCircuit`** em `Thinking.tsx` (arquivo compartilhado):

```tsx
// ANTES:
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

// DEPOIS:
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
```

**Adicionar prop `isStreaming` ao `ThinkingButton`:**

```tsx
export const ThinkingButton = memo(({
  isExpanded,
  onClick,
  label,
  content,
  contentId,
  showCopyButton = true,
  isStreaming = false,     // NOVO
}: { ..., isStreaming?: boolean }) => {
```

No ícone:
```tsx
<BrainCircuit
  className={cn(
    'icon-sm absolute text-text-secondary opacity-100 transition-opacity group-hover/button:opacity-0',
    isStreaming && 'animate-pulse'
  )}
  aria-hidden="true"
/>
```

**Raciocínio para passar `isStreaming`:** `Reasoning.tsx` passa
`isStreaming={effectiveIsSubmitting && isLast}` para `ThinkingButton`.

### 3.4 FloatingThinkingBar — mobile

Ocultar em telas pequenas (mobile):

```tsx
// FloatingThinkingBar wrapper div — adicionar hidden sm:flex
<div
  className={cn(
    'absolute bottom-3 right-3 hidden sm:flex items-center gap-2 transition-opacity duration-150',
    isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
  )}
>
```

O conteúdo permanece acessível via `ThinkingButton` no topo do bloco.

### 3.5 ShowThinking.tsx — remover de Settings

Em `client/src/components/Nav/SettingsTabs/Chat/` existe o componente que renderiza o toggle
"Show thinking". **Remover da aba Chat do painel de Settings** (não deletar o arquivo — apenas
remover o render no componente pai que o inclui).

Localizar onde `ShowThinking` é importado/renderizado no chat settings:
```
Grep: ShowThinking
```
E remover o `<ShowThinking />` do JSX. Não alterar `ShowThinking.tsx` em si (preserve para
backward compat com possível testes).

> `showThinkingAtom` ainda é usado por `Thinking.tsx` (legado). **Não remover o atom.**
> `Reasoning.tsx` deixa de importar `showThinkingAtom`.

### 3.6 Thinking.tsx (legado)

**Nenhuma alteração.** Mantém `Lightbulb`, `showThinkingAtom`, labels em inglês
(`com_ui_thoughts`). Serve apenas para renderizar mensagens antigas no banco.

> Exceção: a mudança de `Lightbulb` → `BrainCircuit` em `ThinkingButton` (3.3) afeta **ambos**
> os sistemas, pois `ThinkingButton` é compartilhado. Isso é intencional — unifica o ícone
> semanticamente. A consistência visual entre legado e moderno é preferível a divergência.

### 3.7 i18n — chaves novas Raciocínio

```json
"com_ui_ux_reasoning_analisando": "Analisando...",
"com_ui_ux_reasoning_ver": "Ver raciocínio",
"com_ui_ux_reasoning_ocultar": "Ocultar raciocínio"
```

Manter `com_ui_thinking` ("Thinking...") e `com_ui_thoughts` ("Thoughts") — usados pelo
legado `Thinking.tsx`.

---

## Área 4 — Unificação da Criação de Agentes

### 4.1 Label "Agentes" no painel sidebar

`useSideNavLinks.ts` — alterar o `title` do link do AgentPanelSwitch:

```ts
// ANTES:
title: 'com_sidepanel_agent_builder',

// DEPOIS:
title: 'com_ui_ux_nav_agentes',
```

Tooltip e aria-label do ícone passam a exibir "Agentes".

### 4.2 Toolbar da página Flows — `Toolbar.tsx`

**Adicionar rótulo "Flows" estático** no lado esquerdo da toolbar, entre o botão de voltar e
o input de nome do flow:

```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => navigate('/c/new')}
    className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
    aria-label={localize('com_ui_ux_flows_back')}  // LOCALIZAR (era hardcoded)
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
  </button>

  {/* NOVO: rótulo estático da página */}
  <span
    className="select-none text-sm font-semibold text-text-primary"
    aria-label={localize('com_ui_ux_nav_flows')}
  >
    {localize('com_ui_ux_nav_flows')}  {/* "Flows" */}
  </span>

  {/* Separador visual */}
  <span className="text-text-tertiary" aria-hidden="true">/</span>

  <input
    type="text"
    value={state.flowName}
    ...
  />
</div>
```

O `aria-label` da página (para screen readers) é comunicado pelo rótulo "Flows" + o nome do
flow no input.

### 4.3 Nó Agente no canvas — empty state

O `AgentInspector.tsx` já tem um seam identificado para dropdown de agentes. A spec de
interação para o **empty state** (quando nenhum agente existe no tenant):

**Empty state visual:**

```
┌─────────────────────────────────────────────┐
│                                             │
│   [Bot icon 24px, text-text-tertiary]       │
│                                             │
│   Nenhum agente criado ainda.               │  text-sm text-text-secondary text-center
│                                             │
│   [→ Criar um agente]                       │  link text-sm text-ring-primary underline
│                                             │
└─────────────────────────────────────────────┘
```

O link "Criar um agente" navega para `/c/new` — que abre o chat onde o AgentPanel está
disponível na sidebar. **Não abre modal de criação dentro do AgentStudio.**

Chave i18n:
```json
"com_ui_ux_flows_empty_agent": "Nenhum agente criado ainda.",
"com_ui_ux_flows_criar_agente": "Criar um agente"
```

**Estado default com lista de agentes:** `<select>` / combobox mostrando agentes do tenant
por nome. O inspector já tem esse seam — tech implementa o dropdown com `useAgentsQuery`
ou similar.

### 4.4 AgentStudio — estado da página Flows

**Canvas vazio (sem flow carregado + lista de flows vazia):**

Exibir no centro do canvas:

```
[Workflow icon 32px, text-text-tertiary]

Nenhum flow criado ainda.
Comece arrastando um Trigger da paleta ao lado.
```

Chaves:
```json
"com_ui_ux_flows_canvas_vazio": "Nenhum flow criado ainda.",
"com_ui_ux_flows_canvas_hint": "Comece arrastando um Trigger da paleta ao lado."
```

### 4.5 i18n — chaves novas Flows

```json
"com_ui_ux_flows_back": "Voltar ao chat",
"com_ui_ux_flows_titulo": "Flows",
"com_ui_ux_flows_empty_agent": "Nenhum agente criado ainda.",
"com_ui_ux_flows_criar_agente": "Criar um agente",
"com_ui_ux_flows_canvas_vazio": "Nenhum flow criado ainda.",
"com_ui_ux_flows_canvas_hint": "Comece arrastando um Trigger da paleta ao lado."
```

> `com_ui_ux_nav_flows` já listada na Área 1.

---

## Área 5 — Limpeza de Fluxos Secundários

### 5.1 Estratégia

Conforme DECISAO.md: **Fase 1 = config** (este épico). Nenhum código removido, apenas
`librechat.yaml` de produção atualizado.

### 5.2 librechat.yaml — campos a setar como `false`

```yaml
interface:
  bookmarks: false
  multiConvo: false
  temporaryChat: false
  peoplePicker: false
  marketplace: false
  remoteAgents: false
```

> `marketplace` e `remoteAgents` já devem ser `false` por padrão — confirmar e tornar
> explícito no YAML para auditoria.

### 5.3 Verificação de hardcoded references

Antes de declarar DONE, tech deve confirmar que cada feature oculta **não possui
entradas hardcoded** que ignoram o config:

| Feature | Verificar |
|---|---|
| `bookmarks` | `BookmarkPanel` só renderiza se `hasAccessToBookmarks` (já é o caso em `useSideNavLinks`) |
| `multiConvo` | Verificar se há botão/opção de multi-conversa que não checa `interfaceConfig.multiConvo` |
| `temporaryChat` | Verificar se há botão "Chat temporário" no input bar ou menu |
| `peoplePicker` | Verificar se há UI de menção de pessoas (@) no input |
| `marketplace` | Plugin Store — verificar se aparece em algum menu de navegação |
| `remoteAgents` | Verificar se há UI de agentes remotos que não checa config |

### 5.4 Plugin Store — remoção de navegação

Verificar se `Plugins/Store` aparece em qualquer:
- ícone de sidebar
- item de AccountSettings dropdown
- item de menu de chat

Se encontrado: remover o item de navegação (mantendo o componente em si).

---

## Resumo de Chaves i18n Novas (todas `com_ui_ux_*`)

```json
"com_ui_ux_nav_studio_imagens": "Studio de Imagens",
"com_ui_ux_nav_flows": "Flows",
"com_ui_ux_nav_automacoes": "Automações",
"com_ui_ux_nav_agentes": "Agentes",

"com_ui_ux_balance_cycle": "Ciclo atual",
"com_ui_ux_balance_vira_em": "Vira",
"com_ui_ux_balance_creditos": "créditos",
"com_ui_ux_balance_de": "de",
"com_ui_ux_balance_ultimo_ciclo": "Último ciclo:",
"com_ui_ux_balance_creditos_ciclo": "Créditos do ciclo:",
"com_ui_ux_balance_frequencia": "Frequência:",
"com_ui_ux_balance_proxima_virada": "Próxima virada:",
"com_ui_ux_balance_a_cada": "A cada",

"com_ui_ux_reasoning_analisando": "Analisando...",
"com_ui_ux_reasoning_ver": "Ver raciocínio",
"com_ui_ux_reasoning_ocultar": "Ocultar raciocínio",

"com_ui_ux_flows_back": "Voltar ao chat",
"com_ui_ux_flows_titulo": "Flows",
"com_ui_ux_flows_empty_agent": "Nenhum agente criado ainda.",
"com_ui_ux_flows_criar_agente": "Criar um agente",
"com_ui_ux_flows_canvas_vazio": "Nenhum flow criado ainda.",
"com_ui_ux_flows_canvas_hint": "Comece arrastando um Trigger da paleta ao lado."
```

**Total: 23 chaves novas.** Adicionar todas em `client/src/locales/en/translation.json`
(PT-BR — tradução automática externa cuida de outras línguas).

---

## Checklist de aceite por área

### Área 1 — Nav
- [ ] Studio de Imagens, Flows, Automações acessíveis por ícone na sidebar (1 clique)
- [ ] Separadores visuais entre grupos de ícones
- [ ] Admin icon visível apenas para `isAdmin`
- [ ] AccountSettings não contém links para Studios
- [ ] Todos os ícones têm `aria-label` via `useLocalize()`
- [ ] Tooltip em desktop (hover), sem tooltip em mobile touch
- [ ] SidePanelNav não renderiza painéis para nav links
- [ ] Rota `/d/automacoes` acessível (depende de tech criar componente)

### Área 2 — Balance
- [ ] Widget expandido: saldo / teto + barra de progresso + "Vira DD/MM"
- [ ] Barra: verde <70%, âmbar 70–90%, vermelho >90%
- [ ] Widget colapsado: progress ring SVG com mesma cor semântica
- [ ] Tooltip colapsado: "{saldo} / {teto} créditos · Vira DD/MM"
- [ ] Clique no widget navega para Settings > aba Balance
- [ ] Settings > Balance: card de destaque + labels em PT-BR
- [ ] AutoRefillSettings: "Próxima virada:", "Créditos do ciclo:" (sem "auto-refill")
- [ ] Degradação graciosa quando `refillAmount` = 0 ou `autoRefillEnabled = false`
- [ ] `balance.enabled = false` → widget não renderiza

### Área 3 — Raciocínio
- [ ] Durante streaming: bloco expandido, "Analisando...", ícone BrainCircuit pulsando
- [ ] Ao completar: bloco colapsa automaticamente para "Ver raciocínio"
- [ ] Click expande → label "Ocultar raciocínio"; click novamente → "Ver raciocínio"
- [ ] Toggle "Show thinking" removido de Settings > Chat
- [ ] `Reasoning.tsx` não usa `showThinkingAtom`
- [ ] `Thinking.tsx` (legado) inalterado funcionalmente
- [ ] FloatingThinkingBar oculto em mobile (< sm breakpoint)
- [ ] Ícone BrainCircuit em ambos os sistemas (ThinkingButton compartilhado)

### Área 4 — Agentes/Flows
- [ ] Ícone sidebar AgentPanel exibe "Agentes"
- [ ] Toolbar AgentStudio exibe "Flows" como rótulo estático
- [ ] Botão voltar na toolbar localizado (sem hardcode)
- [ ] Nó Agente com lista vazia exibe empty state + CTA "Criar um agente" → `/c/new`
- [ ] Canvas vazio exibe empty state com instrução de início
- [ ] Nenhuma tela exibe "Studio de Agentes" como string visível

### Área 5 — Limpeza
- [ ] `bookmarks`, `multiConvo`, `temporaryChat`, `peoplePicker`, `marketplace`, `remoteAgents`
  = `false` em `librechat.yaml`
- [ ] Nenhuma UI hardcoded exibe features ocultas
- [ ] Features "MANTER" continuam funcionando normalmente
