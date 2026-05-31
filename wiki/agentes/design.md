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
| Agente | `Bot` | blue | 1: default (bottom) |
| Condição | `GitBranch` | amber | 2: true (75%) / false (25%) bottom |
| HTTP | `Globe` | sky | 1: default (bottom) |
| Aprovação | `UserCheck` | orange | 2: approved (75%) / rejected (25%) bottom |
| Saída | `Flag` | emerald | 0 (terminal) |

- Handles coloridos: true/approved = `border-emerald-400`, false/rejected = `border-red-400`, default = cor do tipo
- `BaseNode` (shared.tsx): 200-260px, header com accent stripe, botão delete visível no hover
- **Estado de erro**: nó com `nodeId` em `validationErrors` (severity=error) → `border-red-500/60` + `ring-red-500/50` + badge `AlertTriangle` no header

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

### Layout responsivo (LEM-50)

```
DESKTOP (≥768px):
┌──── header 12px ────────────────────────────────────────┐
│ [←→/c/new] Automações                                  │
├────────────────────┬───────────────────────┬────────────┤
│ AutomationList     │ AutomationEditor       │ RunsDrawer │
│ w-[300px]         │ flex-1                 │ w-[320px]  │
│ border-r           │ bg-surface-secondary   │ border-l   │
│                    │                        │ slide-right│
└────────────────────┴───────────────────────┴────────────┘

MOBILE (<768px) — drill-in:
Estado 1 — lista:
┌──── header ─────────────────┐
│ [←→/c/new] Automações      │
├─────────────────────────────┤
│ AutomationList (w-full)     │
│ Selecionar/criar → Estado 2 │
└─────────────────────────────┘

Estado 2 — editor/criação (full-screen):
┌──── header ─────────────────┐
│ [←→lista] Automações        │
├─────────────────────────────┤
│ AutomationEditor (flex-1)   │
└─────────────────────────────┘
```

`useMediaQuery('(max-width: 768px)')` de `@librechat/client` (mesmo hook do Studio de imagens).

Header back button: mobile+showEditor → `dispatch({type:'CANCEL'})` + `aria-label` = `com_automacoes_back_to_list`; caso contrário → `navigate('/c/new')`.

---

## Arquitetura NavLink (LEM-52)

`NavLink` em `client/src/common/types.ts` foi estendido com:
- `href?: string` — presente → nav link (navigate + route-based active); ausente → panel link
- `separator?: true` — render como `<div role="separator">`, ignorado por SidePanelNav
- `adminOnly?: boolean` — filtrado por `isAdmin` no ExpandedPanel

`SidePanelNav` filtra: `links.filter(l => !l.href && !l.separator)` antes de renderizar painéis.

## Ícones dos destinos primários (iazzas sidebar)

| Destino | Ícone Lucide | Rota |
|---|---|---|
| Studio de Imagens | `Image` | `/d/studio` |
| Flows (AgentStudio) | `GitFork` | `/d/agent-studio` |
| Automações | `CalendarClock` | `/d/automacoes` |
| Admin | `ShieldCheck` | `/d/admin` |

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

### ExpandedPanel.tsx — 5 mudanças

**1. Marcador terracota + plate creme (estado ativo)**

Constante `ACTIVE_MARKER` aplicada no `Button` do item ativo:
```
"relative bg-canvas text-action before:absolute before:content-[''] before:left-0 before:top-[15%] before:bottom-[15%] before:w-[3px] before:rounded-r-full before:bg-ember"
```
- `bg-canvas` (#F9F6EA) = plate creme sobre fundo paper branco (contraste visível)
- `text-action` (#274566 navy) = ícone navy no ativo (o ícone herda a cor do button)
- `before:*` = barra terracota (#C25A3C) 3px, 70% da altura, arredondada à direita

**2. Hover isolado para itens inativos**

`hover:!bg-transparent` removido de `ROW_EXPANDED` (era global). Agora é condicional:
```tsx
!isNavActive && expanded && 'hover:!bg-transparent'
```
Itens ativos mantêm `bg-canvas` no hover (plate persiste); inativos ganham hover só no icon slot.

**3. Remoção do highlight do icon slot no ativo**

Removido: `expanded && isNavActive && 'bg-surface-active-alt text-text-primary'` do icon slot. A cor do ícone agora vem de `text-action` no button (herança CSS limpa).

**4. Remoção dos subtítulos de 2 linhas**

`link.description` não é mais renderizado. Label simplificado de `flex min-w-0 flex-col > span + span` para `span` único. Os dados `description` nos hooks ficam inertes (não quebra a tipagem `NavLink`).

**5. Tagline Playfair-itálica sob o logo**

```tsx
<div className="flex flex-col gap-0.5">
  <img src="assets/azzas-logo-dark.svg" alt="Azzas 2154" className="h-[18px] w-auto" />
  <span className="font-editorial text-[10px] italic leading-none text-white/50">
    Fashion &amp; Lifestyle
  </span>
</div>
```
Só no estado expanded. Header (52px) acomoda confortavelmente (logo 18px + gap 2px + tagline ~12px = 32px, centralizado).

**6. Nav body + footer: `bg-surface-primary-alt` → `bg-paper`**

`surface-primary-alt` = `--canvas` creme (após P0-B). Sidebar branca permite que o plate creme dos itens ativos seja visível. Sem o contraste `paper > canvas`, a plate seria invisível.

### Constraint de logo (documentada)

`azzas-logo-dark.svg` tem `fill="white"` (logo branco para fundo escuro). A régua permanece com `bg-azzas-navy` no header band. A conversão para paper-white requer um variant dark (navy sobre transparente) — fora do escopo de P1-B.

### Gate

- `tsc --noEmit`: exit 0 (sem erros)
- `npm run frontend`: ✓ 54.14s + `✅ PWA icons … copied successfully` (heap 4096, `BUILD_EXIT=0`)
