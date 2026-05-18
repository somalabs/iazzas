# Design — Memória de Longo Prazo

## Princípios de design ratificados

*(ainda sem ratificação do Artur — primeira entrega)*

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
              ├── [left] Creations.tsx    # F5: histórico + busca
              └── [right] Workspace.tsx ou ImageDetail.tsx
                    Workspace.tsx
                      ├── UseCaseSelector     # UC chips (5) + Advanced toggle
                      ├── GuidedForm          # schema renderer genérico
                      ├── AdvancedMode        # F13 model override (stub)
                      ├── PromptInput         # F2 @-autocomplete
                      ├── ReferencesPanel     # F1 slots Style/Character/@imgN
                      └── toolbar: ImageCount(F3) + AspectRatio(F4) + Resolution(F6) + Generate
                    ImageDetail.tsx       # F7: detalhe + "Use image" menu
                      └── InlineEditor.tsx    # F8: prompt-only editor
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
  context.tsx                        # FlowProvider + useReducer
  canvas/
    Canvas.tsx                       # ReactFlow wrapper + validação + drop zone
    validation.ts                    # validateFlow(), hasBlockingErrors()
    nodes/
      shared.tsx                     # BaseNode (shell + accent colors)
      TriggerNode.tsx                # violet
      AgentNode.tsx                  # blue
      ConditionNode.tsx              # amber — 2 handles: true (75%) / false (25%)
      HttpNode.tsx                   # sky
      ApprovalNode.tsx               # orange — 2 handles: approved (75%) / rejected (25%)
      OutputNode.tsx                 # emerald
      index.ts                       # nodeTypes map
    edges/
      LabeledEdge.tsx                # edge colorida por handle (true=green, false=red)
      index.ts                       # edgeTypes map
  palette/
    Palette.tsx                      # sidebar 220px, itens arrastáveis
    PaletteCard.tsx                  # draggable card com accent + icon
  inspector/
    Inspector.tsx                    # shell que despacha para sub-inspetor
    TriggerInspector.tsx
    AgentInspector.tsx
    ConditionInspector.tsx
    HttpInspector.tsx
    ApprovalInspector.tsx
    OutputInspector.tsx
    shared.tsx                       # FieldLabel, FieldHint, InspectorInput, InspectorTextarea, InspectorSelect
  runs/
    RunsDrawer.tsx                   # slide-in-right, toggle via Toolbar
    RunCard.tsx                      # expand/collapse + approve/reject com confirmação 2-step
    NodeStatusRow.tsx                # ícone + label de status por nó
  toolbar/
    Toolbar.tsx                      # nome do flow editável + Salvar + Histórico + Executar
  dialogs/
    RunModal.tsx                     # modal Radix para input do disparo
  layouts/
    AgentStudioView.tsx              # FlowProvider > ReactFlowProvider > layout 3 zonas
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

### Tipos — data-provider

`packages/data-provider/src/types/flow.ts` — exportado em `src/index.ts`:
- `FlowNodeType`, `FlowRunStatus`, `FlowNodeRunStatus`, `HttpMethod`, `ConditionOperator`
- `TriggerNodeData`, `AgentNodeData`, `ConditionNodeData`, `HttpNodeData`, `HumanApprovalNodeData`, `OutputNodeData`, `FlowNodeData` (union)
- `FlowNode`, `FlowEdge`, `Flow`, `FlowNodeRun`, `FlowRun`

### Dependência adicionada

`@xyflow/react: "^12.3.6"` em `client/package.json` (canvas visual).

### i18n (Agent Studio)

92 chaves `com_studio_flow_*` adicionadas em `client/src/locales/en/translation.json`.
Valores em **PT-BR** (padrão do projeto para cliente Azzas).

### Estado do FlowContext (context.tsx)

```typescript
type FlowState = {
  flowId: string | null; flowName: string;
  nodes: Node[]; edges: Edge[];  // tipos do @xyflow/react
  selectedNodeId: string | null;
  validationErrors: ValidationError[];
  runsOpen: boolean; runs: FlowRun[];
  runModalOpen: boolean; saving: boolean;
};
```

### Pontos de extensão marcados para o stream tech

| Local | O que fazer |
|-------|-------------|
| `Toolbar.tsx` `handleSave` | Wire `PUT /flows/:flowId` |
| `RunModal.tsx` `handleRun` | Wire `POST /flows/:flowId/run` |
| `RunsDrawer.tsx` `handleApprove/Reject` | Wire `POST /runs/:runId/resume` |
| `AgentStudioView.tsx` | Carregar flow por param de rota + usar React Query |
| `AgentInspector.tsx` agent dropdown | Substituir input por dropdown com agentes do tenant |
| `ApprovalInspector.tsx` role dropdown | Substituir input por dropdown com roles do tenant |
| `Toolbar.tsx` history button | Wire React Query para puxar runs do servidor |

### Validações implementadas (canvas/validation.ts)

- `validateFlow()`: retorna array de erros — sem trigger, sem output, nó desconectado
- `hasBlockingErrors()`: true se `no_trigger` ou `no_output` presentes
- Toolbar bloqueia "Executar" se `hasBlockingErrors` — apenas aviso visual para nós desconectados (não bloqueia salvar)
- Validation banner no bottom do canvas mostra erros de trigger/output em tempo real

---

## Decisões pendentes recorrentes

- Storage de assets: plataforma vs. download local → afeta spec de galeria
- Confidencialidade de processing: on-prem/VPC vs. APIs externas
- Curadoria de presets: sign-off do time criativo por marca (Farm ≠ Animale ≠ Cris Barros)
