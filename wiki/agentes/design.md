# Design — Memória de Longo Prazo

## Princípios de design ratificados

### Ratificados em LEM-52 (aguardando merge)

1. **Destinos de trabalho nunca ficam no menu de conta.** Menu de conta é exclusivo para
   operações sobre o perfil (Settings, Ajuda, Logout). Studios/Flows/Automações são ícones
   primários na sidebar.
2. **Raciocínio expandido = estado transitório.** Durante streaming o bloco está expandido
   (feedback de progresso); ao completar, colapsa automaticamente. Toggle global em Settings
   é anti-padrão — estado contextual por mensagem.
3. **Nomenclatura resolve hierarquia.** Agente = assistente individual (AgentPanel). Flow =
   pipeline visual (AgentStudio). Automação = flow agendado. Nunca intercambiar os termos.
4. **Degradação graciosa em dados opcionais.** Quando `refillAmount` ou `autoRefillEnabled`
   não disponíveis, widget exibe apenas saldo — sem erro, sem barra incompleta.
5. **Subtítulos não mencionam features desabilitadas.** Quando uma feature (ex: marketplace) está desabilitada via config, nenhum subtítulo ou copy visível deve referenciá-la — copie sem o ramo condicional, não esconda por CSS.

## Padrões visuais por projeto

### iazzas (LibreChat fork, Azzas 2154)

- Shell: React SPA, sidebar esquerda de conversas, header com model selector
- Identidade visual: fontes definidas em `client/tailwind.config.cjs` — `font-editorial` (Playfair Display) para títulos/headings editoriais, `font-sans` (Red Hat Display) para UI, `font-mono` (Roboto Mono) para código
- Design tokens: usar `surface-*`, `text-*`, `border-*`, `ring-primary`, `surface-submit` — nenhuma cor hardcoded
- Exceção ratificada: accent de status (vermelho/verde/âmbar) usa Tailwind palette com opacity modifier (ex: `border-red-500/40 bg-red-500/10`) — não quebra regra dos tokens, são estados semânticos
- Padrão de split-pane: seguir `PromptsView` — painel esquerdo colapsável em mobile (drawer por cima), conteúdo principal à direita
- Estado mobile: o workspace é primário; histórico/lista colapsa e abre por drawer
- Rota `/d/studio`: standalone, bookmarkável, layout próprio (não usa o chat)

### Regras Playfair (P0-D · LEM-88 ratificado)

**Quando usar `font-editorial` (Playfair Display):**
- Saudação/greeting hero (Landing.tsx) — `text-3xl sm:text-4xl font-medium tracking-[-0.5px]`
- H1 de destinos principais (AgentesHome, FlowsHome, AutomacoesScreen) — `text-2xl font-medium tracking-[-0.5px]`
- Heading de auth (AuthLayout) — `text-3xl font-medium tracking-[-0.5px]`
- Nome de agente/assistente no landing (caso entity) — `getNameSizeClass font-medium tracking-[-0.5px]`
- Tagline da sidebar "Fashion & Lifestyle" — exceção: `text-[10px] italic` (brand tagline P1-B)

**Quando NÃO usar `font-editorial`:**
- Topbar labels (`com_studio_title` em Studio/View.tsx) — operacional → Red Hat
- Section headers de form (UC name em Workspace.tsx) — operacional → Red Hat
- Qualquer texto < 24px (exceto a tagline que é exceção de marca)
- Botões, labels, chips, badges

**Regras de tamanho:**
- Mínimo: `text-2xl` (24px) — nunca Playfair abaixo disso (exceto tagline)
- Greeting hero: `text-3xl sm:text-4xl` (30→36px)
- Auth/page H1: `text-3xl` ou `text-2xl`
- Agent names: `getNameSizeClass` — min `text-2xl`, max `text-4xl`

**Tracking:** sempre `tracking-[-0.5px]` (não `tracking-tight` que é -0.75px a 30px)

**Greeting format:** `"Bom dia, Artur."` — só primeiro nome (`user.name.split(' ')[0]`), vírgula, ponto final. Sem ícone de robô no estado genérico.

### Referências de mercado para geração de imagem (moda)

- **Freepik**: hero prompt + style presets visuais + galeria inline na mesma tela + painel de parâmetros colapsável
- **Magnific**: creativity slider como controle único + before/after slider interativo + upload-first ou prompt-first + relight por drag de ponto de luz
- Padrão crítico compartilhado: prompt e resultado ficam **na mesma tela, sempre**

## Críticas recorrentes (moda)

- **Negative prompts expostos**: técnico demais para público criativo — sempre colapsar em Advanced
- **Side-by-side estático**: não substitui o slider interativo para before/after — dois objetos vs. um objeto em dois estados
- **Gallery pública/community feed**: risco de confidencialidade para peças pré-lançamento em marcas de moda — não incluir por padrão

## Vocabulário de presets fashion-specific (Azzas)

5 UCs v1 implementados em `client/src/components/Studio/schemas.ts`:
- **Color Variants** — recolorir peça mantendo silhueta, textura e construção
- **Aplicar Estampa** — aplicar arte/print na superfície (all-over, placement, panel, engineered)
- **Produto em Modelo** — virtual try-on (human review gate obrigatório)
- **Múltiplas Referências** — composição lookbook/editorial até 14 refs (human review gate)
- **Sketch-to-Render** — sketch/flat/CAD → render fotorrealista ou editorial

## Arquitetura Studio (`/d/studio`)

Rota registrada em `client/src/routes/Dashboard.tsx` como filho de `DashboardRoute` (auth-gated).

```
StudioScreen                              # entry: envolve com StudioProvider
  └── StudioProvider (context.tsx)
        └── View.tsx                      # split-pane, mobile drawer
              ├── [left] Creations.tsx    # F5: histórico + busca (migrado para AtelierDrawer em P0-A.2)
              └── [right] Workspace.tsx ou ImageDetail.tsx
```

### Tipos compartilhados (Studio de imagens)

`packages/data-provider/src/types/studio.ts` — `StudioUseCase`, `AspectRatio`, `Resolution`, `StudioReference`, `StudioCreation`, `StudioUseCaseSchema`, `StudioFormField`, `StudioImageSlot`.

---

## Arquitetura Agent Studio (`/d/agent-studio`)

### Rota

Registrada em `client/src/routes/Dashboard.tsx`:
```tsx
{ path: 'agent-studio', element: <AgentStudioView /> }
```
Auth-gated via `PermissionTypes.AGENTS` + `Permissions.USE` (redireciona para `/c/new` sem acesso).

### Estrutura de componentes

```
AgentStudio/
  index.ts
  context.tsx                        # FlowProvider + useReducer (importa ValidationError de canvas/validation)
  canvas/
    Canvas.tsx                       # ReactFlow wrapper + banner completo de validação
    validation.ts                    # validateFlow(), hasBlockingErrors(), ValidationError type
    nodes/
      shared.tsx                     # BaseNode: accent + error ring via context
      TriggerNode.tsx / AgentNode.tsx / ConditionNode.tsx / HttpNode.tsx
      ApprovalNode.tsx / OutputNode.tsx / index.ts
    edges/
      LabeledEdge.tsx / index.ts
  palette/
    Palette.tsx + PaletteCard.tsx
  inspector/
    Inspector.tsx + 6 sub-inspetores tipados + shared.tsx
  runs/
    RunsDrawer.tsx + RunCard.tsx + NodeStatusRow.tsx
  toolbar/
    Toolbar.tsx                      # bloqueia salvar quando hasBlockingErrors
  dialogs/
    RunModal.tsx                     # parseia 422 details → mensagem específica
  layouts/
    AgentStudioView.tsx
```

### Linguagem visual dos nós

| Nó | Ícone | Accent | Handles saída |
|----|-------|--------|---------------|
| Trigger | `Zap` | violet | 1: default (bottom) |
| Agente | `ManequimIcon` (fashion) | blue | 1: default (bottom) |
| Condição | `GitBranch` | amber | 2: true (75%) / false (25%) bottom |
| HTTP | `Globe` | sky | 1: default (bottom) |
| Aprovação | `UserCheck` | orange | 2: approved (75%) / rejected (25%) bottom |
| Saída | `Flag` | emerald | 0 (terminal) |

- Handles coloridos: true/approved = `border-emerald-400`, false/rejected = `border-red-400`, default = cor do tipo
- `BaseNode` (shared.tsx): 200-260px, header com accent stripe, botão delete visível no hover
- **Estado de erro**: nó com `nodeId` em `validationErrors` (severity=error) → `border-red-500/60` + `ring-red-500/50` + badge `AlertTriangle` no header
- **GitBranch (ConditionNode) mantido intencionalmente** — é conceito semântico de fluxo (bifurcação lógica), não vocabulário de identidade de destino. Sem substituto fashion definido.

### Tipos — data-provider

`packages/data-provider/src/types/flow.ts` — exportado em `src/index.ts`:
- `FlowNodeType`, `FlowRunStatus`, `FlowNodeRunStatus`, `HttpMethod`, `ConditionOperator`
- `TriggerNodeData`, `AgentNodeData`, `ConditionNodeData`, `HttpNodeData`, `HumanApprovalNodeData`, `OutputNodeData`, `FlowNodeData` (union)
- `FlowNode`, `FlowEdge`, `Flow`, `FlowNodeRun`, `FlowRun`

### Dependência adicionada

`@xyflow/react: "^12.3.6"` em `client/package.json` (canvas visual).

### i18n (Agent Studio)

108 chaves `com_studio_flow_*` em `client/src/locales/en/translation.json` (PT-BR).
Inclui chaves de erro de grafo (banner) e `com_studio_flow_run_error_{code}` (toast de 422).

### Estado do FlowContext (context.tsx)

```typescript
type FlowState = {
  flowId: string | null; flowName: string;
  nodes: Node[]; edges: Edge[];
  selectedNodeId: string | null;
  validationErrors: ValidationError[];  // importado de canvas/validation
  runsOpen: boolean; runs: FlowRun[];
  runModalOpen: boolean; saving: boolean;
};
```

`ValidationError` exportado de `canvas/validation.ts`:
```typescript
type ValidationError = { key: string; label?: string; nodeId?: string; severity: 'error' | 'warning' };
```

---

## Arquitetura Automações (`/d/automacoes`) — LEM-45/LEM-50

### Rota

```tsx
{ path: 'automacoes', element: <AutomacoesScreen /> }
```
Auth-gated via `PermissionTypes.AUTOMATIONS` + `Permissions.USE`.
Link no AccountSettings (menu de avatar) gated em `AUTOMATIONS.USE`, ícone `CalendarClock`.

### Estrutura de componentes

```
Automacoes/
  index.ts
  context.tsx              # AutomacoesProvider + useAutomacoesContext
                           # Tipos locais Automation, AutomationRun (seam — tech move para data-provider)
  AutomacoesScreen.tsx     # shell: header + layout responsivo (drill-in mobile / split-pane desktop) + gate RBAC
  AutomationList.tsx       # lista com toggle, status, ações inline — aceita className? para mobile
  AutomationEditor.tsx     # formulário com 4 modos de agenda
  RunsDrawer.tsx           # histórico de execuções (drawer direito)
```

---

## Arquitetura NavLink (LEM-52)

`NavLink` em `client/src/common/types.ts` foi estendido com:
- `href?: string` — presente → nav link (navigate + route-based active); ausente → panel link
- `separator?: true` — render como `<div role="separator">`, ignorado por SidePanelNav
- `adminOnly?: boolean` — filtrado por `isAdmin` no ExpandedPanel
- `iconFilled?: LucideIcon | React.FC` — variante preenchida, renderizada quando `isNavActive=true` no `NavRouteButton` (P1-C)

`SidePanelNav` filtra: `links.filter(l => !l.href && !l.separator)` antes de renderizar painéis.

## Ícones dos destinos primários (iazzas sidebar) — P1-C

| Destino | Ícone (inativo) | Ícone (ativo) | Rota |
|---|---|---|---|
| Conversar | `MessageSquare` (Lucide) | — | `/c/new` |
| Studio de Imagens | `CabideIcon` (fashion) | `CabideIconFilled` | `/d/studio` |
| Agentes | `ManequimIcon` (fashion) | `ManequimIconFilled` | `/d/agentes` |
| Fluxos | `CarretelIcon` (fashion) | `CarretelIconFilled` | `/d/flows` |
| Automações | `CalendarClock` (Lucide) | — | `/d/automacoes` |
| Admin | `ShieldCheck` (Lucide) | — | `/d/admin` |

Fashion icons em `client/src/components/icons/fashion.tsx`.

## Padrão de cor semântica — BalanceWidget

| Estado | Threshold | Token Tailwind |
|---|---|---|
| Safe | < 70% consumido | `text-text-secondary` / `bg-green-500` |
| Warning | 70–90% consumido | `text-yellow-500` / `bg-yellow-500` |
| Danger | > 90% consumido | `text-red-500` / `bg-red-500` |

Ring SVG colapsado: dois círculos sobrepostos — track (opacity-20) + progress (dashoffset calculado).

## Decisões pendentes recorrentes

- Storage de assets: plataforma vs. download local → afeta spec de galeria
- Confidencialidade de processing: on-prem/VPC vs. APIs externas
- Curadoria de presets: sign-off do time criativo por marca (Farm ≠ Animale ≠ Cris Barros)

---

## P1-B · Active-nav + régua redesenhada — entregue (LEM-92)

### ExpandedPanel.tsx — 6 mudanças em 1 arquivo

**1. Marcador terracota 3px + plate creme (estado ativo)**

Constante `ACTIVE_MARKER` aplicada no `Button` do item ativo:
```
"relative bg-canvas text-action before:absolute before:content-[''] before:left-0 before:top-[15%] before:bottom-[15%] before:w-[3px] before:rounded-r-full before:bg-ember"
```
- `bg-canvas` (#F9F6EA) = plate creme sobre sidebar paper branco
- `text-action` (#274566 navy) = ícone navy no ativo (herança CSS)
- `before:*` = barra terracota (#C25A3C) 3px, 70% altura, arredondada à direita

**2. Hover isolado para itens inativos**

`hover:!bg-transparent` removido de `ROW_EXPANDED` (era global). Agora é condicional: `!isNavActive && expanded && 'hover:!bg-transparent'`. Itens ativos mantêm `bg-canvas` no hover.

**3. Remoção do highlight do icon slot no ativo**

Removido `expanded && isNavActive && 'bg-surface-active-alt text-text-primary'` do icon span. Cor do ícone ativo vem de `text-action` no button por herança.

**4. Remoção dos subtítulos de 2 linhas**

`link.description` não renderizado. Label de `flex min-w-0 flex-col > span + span` → `span` único.

**5. Tagline Playfair-itálica sob o logo**

```tsx
<div className="flex flex-col gap-0.5">
  <img ... className="h-[18px] w-auto" />
  <span className="font-editorial text-[10px] italic leading-none text-white/50">
    Fashion &amp; Lifestyle
  </span>
</div>
```

**6. Nav body + footer: `bg-surface-primary-alt` → `bg-paper`**

Após P0-B, `surface-primary-alt` = creme. Sidebar precisa ser branca para o plate creme do ativo ser visível.

### Constraint de logo (documentada)

`azzas-logo-dark.svg` usa `fill="white"`. Header band permanece `bg-azzas-navy`. Conversão régua → paper-white requer SVG dark variant — fora do escopo de P1-B.

---

## P0-D · Playfair como voz — entregue (LEM-88)

### Arquivos tocados (7)

**`client/src/components/Chat/Landing.tsx`** — alvo principal
- `ConvoIcon` removido do estado de saudação genérica (só aparece quando `hasEntity = !!name`)
- Greeting em `font-editorial text-3xl font-medium tracking-[-0.5px] sm:text-4xl` (30→36px)
- `firstName = user.name.split(' ')[0]` — só primeiro nome
- Formato: `"${getGreeting()}, ${firstName}."` (com ponto final)
- Nome de agente: `font-editorial {getNameSizeClass} font-medium tracking-[-0.5px]`
- `getNameSizeClass` nunca retorna abaixo de `text-2xl` (24px — mínimo Playfair)

**`Agentes/AgentesHome.tsx`** — H1 `font-editorial text-2xl font-medium tracking-[-0.5px]`

**`AgentStudio/layouts/FlowsHome.tsx`** — H1 `font-editorial text-2xl font-medium tracking-[-0.5px]`

**`Automacoes/AutomacoesScreen.tsx`** — `tracking-tight` → `tracking-[-0.5px]` (spec é -0.5px)

**`Auth/AuthLayout.tsx`** — `font-editorial text-3xl font-medium tracking-[-0.5px] text-text-primary`

**`Studio/View.tsx`** — removido `font-editorial` do topbar label `text-sm` (12px → operacional)

**`Studio/workspace/Workspace.tsx`** — removido `font-editorial` do section header `text-lg` (18px → operacional)

### Gate ✓
- `npm run frontend`: ✓ **55.91s** + `✅ PWA icons copied` (BUILD_EXIT=0, heap 4096)
- `npx tsc --noEmit`: **exit 0** (árvore inteira)

---

## P1-C · Set de ícones custom — entregue (LEM-93)

### Vocabulário de moda implementado

| Destino | Metáfora | Ícone | Path SVG (outline) |
|---|---|---|---|
| Estúdio | Cabide | `CabideIcon` | Hook: `M10 7Q10 4 12 4Q14 4 14 7` + Arch: `M12 7L3 20H21L12 7` |
| Agentes | Manequim | `ManequimIcon` | Body: `M6 8Q9 5 12 5Q15 5 18 8Q19 13 16 15Q17 18 17 20Q12 22 7 20Q7 18 8 15Q5 13 6 8Z` + Stand: `M12 20V22M9 22H15` |
| Fluxos | Carretel | `CarretelIcon` | Flanges: `rect x=3/y=3/w=18/h=3.5/rx=1.5` (top e bottom) + Barrel: `M7 6.5V17.5M17 6.5V17.5` |

### Especificações técnicas

- **Grid**: 24×24px viewBox
- **Stroke**: 1.5px (`strokeWidth="1.5"`)
- **Joins**: arredondados (`strokeLinecap/Join="round"`)
- **Cor**: `currentColor` (herda `text-text-secondary` em repouso, `text-action` navy no ativo)
- **Variante preenchida**: mesma path com `fill="currentColor"` no body — renderizada quando `isNavActive=true` via `NavLink.iconFilled`

### Arquivos tocados (8)

| Arquivo | Mudança |
|---|---|
| `client/src/components/icons/fashion.tsx` | **novo** — 6 componentes: Cabide/Manequim/Carretel × outline+filled |
| `client/src/common/types.ts` | `iconFilled?: LucideIcon \| React.FC` adicionado ao `NavLink` |
| `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` | `NavRouteButton` seleciona `iconFilled` quando `isNavActive` |
| `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` | Image/Bot/GitFork → CabideIcon/ManequimIcon/CarretelIcon (+ filled variants) |
| `client/src/components/Agentes/AgentesHome.tsx` | Empty state `Bot` → `ManequimIcon` |
| `client/src/components/AgentStudio/canvas/nodes/AgentNode.tsx` | `Bot` → `ManequimIcon` |
| `client/src/components/AgentStudio/inspector/AgentInspector.tsx` | `Bot` → `ManequimIcon` |
| `client/src/components/AgentStudio/palette/Palette.tsx` | `Bot` → `ManequimIcon` (GitBranch no nó Condição mantido — semântica de fluxo) |

### Decisão de escopo documentada

`Endpoints/MinimalIcon.tsx` e `Endpoints/MessageEndpointIcon.tsx` usam `Bot` como fallback genérico de endpoint de chat — não são vocabulário de identidade de destino. Mantidos como Lucide Bot; não são robô-de-identidade, são fallback técnico.

### Gate ✓
- `npx tsc --noEmit`: exit 0 (árvore inteira, zero erros)
- `npm run frontend`: ✓ **52.86s** + `✅ PWA icons copied` (BUILD_EXIT=0, heap 4096)
