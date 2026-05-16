# Design — Memória de Longo Prazo

## Princípios de design ratificados

*(ainda sem ratificação do Artur — primeira entrega)*

## Padrões visuais por projeto

### iazzas (LibreChat fork, Azzas 2154)

- Shell: React SPA, sidebar esquerda de conversas, header com model selector
- Identidade visual: fontes definidas em `client/tailwind.config.cjs` — `font-editorial` (Playfair Display) para títulos/headings editoriais, `font-sans` (Red Hat Display) para UI, `font-mono` (Roboto Mono) para código
- Design tokens: usar `surface-*`, `text-*`, `border-*`, `ring-primary`, `surface-submit` — nenhuma cor hardcoded
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

Presets implementados em `usecase/schemas.ts` (5 UCs v1):
- **Color Variants** — recolorir peça mantendo silhueta, textura e construção
- **Aplicar Estampa** — aplicar arte/print na superfície (all-over, placement, panel, engineered)
- **Produto em Modelo** — virtual try-on (requer human review gate)
- **Múltiplas Referências** — composição lookbook/editorial com até 14 refs (requer human review gate)
- **Sketch-to-Render** — sketch/flat/CAD → render fotorrealista ou editorial

## Arquitetura Studio (`/d/studio`)

Rota registrada em `client/src/routes/Dashboard.tsx` como filho de `DashboardRoute` (auth-gated).

```
StudioScreen                              # entry: envolve com StudioProvider
  └── StudioProvider (context.tsx)
        └── View.tsx                      # split-pane, mobile drawer
              ├── [left] Creations.tsx    # histórico F5 + busca + filtro
              └── [right] workspace ou detail
                    Workspace.tsx         # workspace padrão
                      ├── UseCaseSelector     # UC chips (5 UCs) + Advanced toggle
                      ├── GuidedForm          # schema renderer (genérico)
                      ├── AdvancedMode        # F13 model override (TODO tech)
                      ├── PromptInput         # F2 @-autocomplete
                      ├── ReferencesPanel     # F1 8 slots (Style, Character, @imgN)
                      └── toolbar: ImageCount(F3) + AspectRatio(F4) + Resolution(F6) + Generate
                    ImageDetail.tsx       # F7 detalhe, substitui workspace quando criação selecionada
                      └── InlineEditor.tsx    # F8 prompt-only + extensão visual (roadmap)
```

### Schema de UC (contrato frontend)

```typescript
// packages/data-provider/src/types/studio.ts
type StudioUseCaseSchema = {
  id: StudioUseCase;
  displayName: string;
  formFields: StudioFormField[];  // text | select | toggle | boolean | textarea
  imageSlots: StudioImageSlot[];  // slots tipados required/optional
  uiDefaults: { aspectRatio, imageCount, resolution };
  compliance?: { requiresHumanReview, reviewReason };
};
```

Schemas hardcoded em `client/src/components/Studio/schemas.ts` — stream tech substitui por YAML parsing quando backend estiver pronto.

### Estado do Studio (`context.tsx`)

- `StudioProvider` + `useReducer` — sem Redux, estado local simples
- `useGenerateImages()` — cria `StudioCreation` com status `'generating'`, TODO: wire API
- Referências: local `File` + `URL.createObjectURL()` — stream tech wira upload real
- `Creations`: array de `StudioCreation` no estado local — stream tech wira React Query

### Pontos de extensão para o stream tech

| Local | O que fazer |
|-------|-------------|
| `useGenerateImages()` em `context.tsx` | Wira chamada real de geração via React Query |
| `ReferencesPanel.tsx` upload | Usar `UploadMutationOptions` / data-provider file upload |
| `AdvancedMode.tsx` model select | Habilitar override via router do stream produto |
| `ImageDetail.tsx` Comments tab | Wira endpoint de comentários |
| `Creations.tsx` | Wira React Query para buscar histórico do servidor |
| `InlineEditor.tsx` | Wira image edit API quando disponível |

### Chaves i18n adicionadas

Prefixo: `com_studio_` — ~50 chaves em `client/src/locales/en/translation.json`.

## Decisões pendentes recorrentes

- Storage de assets: plataforma vs. download local → afeta toda spec de galeria
- Confidencialidade de processing: on-prem/VPC vs. APIs externas → pode bloquear o caso de uso principal em marcas de moda
- Curadoria de presets: precisa de sign-off do time criativo interno para cada marca (Farm ≠ Animale ≠ Cris Barros)
- Schema definitivo dos UCs do stream `produto` → consumido agora via `schemas.ts` (pode substituir)
- `tsc --noEmit` não pode ser rodado no ambiente CI atual (sem node_modules) — tech deve verificar no build
