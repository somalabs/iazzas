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

### Validações implementadas (canvas/validation.ts) — LEM-39

**Detecção client-side completa** (espelha o backend `validateGraph`):

| Código | Detectado | Severity | Bloqueia salvar |
|--------|-----------|----------|-----------------|
| `no_trigger` | ✅ | error | sim |
| `no_output` | ✅ | error | sim |
| `multiple_triggers` | ✅ | error | sim |
| `cycle` | ✅ (Kahn) | error | sim |
| `path_without_output` | ✅ | error | sim |
| `disconnected_node` | ✅ (reachability) | warning | não |

**`hasBlockingErrors()`**: cobre os 5 códigos de severity=error → bloqueia `canSave` e `canRun`.

**Canvas banner** (bottom, scrollável, max-h-40):
- Todos os erros aparecem (red = blocking, amber = warning)
- Linhas com `nodeId` são clicáveis → seleciona o nó problemático no canvas

**Run 422** (RunModal.tsx `onError`):
- Parseia `error.response.data.details[0].code`
- Mapeia para chave `com_studio_flow_run_error_{code}`
- Fallback genérico se parsing falhar

### Pontos de extensão para o stream tech

| Local | O que fazer |
|-------|-------------|
| `Toolbar.tsx` `handleSave` | Wire `PUT /flows/:flowId` |
| `RunModal.tsx` `handleRun` | Wire `POST /flows/:flowId/run` |
| `RunsDrawer.tsx` `handleApprove/Reject` | Wire `POST /runs/:runId/resume` |
| `AgentStudioView.tsx` | Carregar flow por param de rota + usar React Query |
| `AgentInspector.tsx` agent dropdown | Substituir input por dropdown com agentes do tenant |
| `ApprovalInspector.tsx` role dropdown | Substituir input por dropdown com roles do tenant |

---

## Decisões pendentes recorrentes

- Storage de assets: plataforma vs. download local → afeta spec de galeria
- Confidencialidade de processing: on-prem/VPC vs. APIs externas
- Curadoria de presets: sign-off do time criativo por marca (Farm ≠ Animale ≠ Cris Barros)
