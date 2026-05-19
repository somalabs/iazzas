# Agentes Fase 2 — Split Panel + TestPanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resizable split-panel layout to `/d/agentes` so users can configure a new agent on the left and test it via ephemeral chat on the right before hitting "Publicar".

**Architecture:** `AgentDraftContext` (new context) bridges form values from inside `AgentPanel`'s `FormProvider` boundary to `TestPanel` on the right. `AgentesLayout` wraps both panels in a CSS flex split with a native drag handle (no external library). `PreviewChatView` adapts `ChatView` to accept a `conversationId` prop and injects ephemeral agent params into the Recoil conversation atom at a dedicated preview index.

**Tech Stack:** React 18, TypeScript, react-hook-form (`useWatch`), Recoil (conversation atoms via `useChatHelpers`), TanStack Query, Tailwind CSS, `librechat-data-provider` (`Constants.EPHEMERAL_AGENT_ID`, `Constants.NEW_CONVO`, `AgentCapabilities`, `TEphemeralAgent`)

---

## Constraints (read before touching anything)

- **`client/vite.config.ts` must never enter a commit.** Always use explicit `git add <path>` — never `git add -A` or `git add .`.
- **i18n:** Only edit `client/src/locales/en/translation.json`. Values are PT-BR text (localized fork). CI fails if a key exists in JSON but is not referenced in code — add keys and reference them in the same task or back-to-back tasks.
- **ESLint:** Run `rtk proxy npx eslint --config eslint.config.mjs --fix <explicit-path>` (never without an explicit path — the RTK hook converts `$(git diff)` into an empty list which nukes the whole repo).
- **Tests:** Run from the project root: `npx jest --config client/jest.config.cjs <path>`.
- **Test file extension in Agents:** use `.spec.tsx` (existing pattern: `client/src/components/SidePanel/Agents/__tests__/*.spec.tsx`).

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `client/src/Providers/AgentDraftContext.tsx` | Context + provider + hook; bridges form state to TestPanel |
| `client/src/components/Agentes/DragHandle.tsx` | Draggable divider; emits clientX via `onDrag` callback |
| `client/src/components/Agentes/AgentesLayout.tsx` | Split layout (desktop: flex + drag; mobile: segmented toggle) |
| `client/src/components/Agentes/TestPanel.tsx` | Right panel: tab bar, ephemeral badge, PreviewChatView |
| `client/src/components/Agentes/PreviewChatView.tsx` | ChatView adapted to accept conversationId prop + draftParams injection |
| `client/src/Providers/__tests__/AgentDraftContext.spec.tsx` | Unit tests for context |
| `client/src/components/Agentes/__tests__/DragHandle.spec.tsx` | Unit tests for drag logic |
| `client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx` | Render + toggle tests |
| `client/src/components/Agentes/__tests__/TestPanel.spec.tsx` | Render + tab bar tests |

### Modified files
| File | Change |
|---|---|
| `client/src/locales/en/translation.json` | 8 new `com_ui_ux_*` keys |
| `client/src/Providers/index.ts` | Export `AgentDraftProvider`, `useAgentDraftContext`, `AgentDraftParams` |
| `client/src/components/Agentes/index.ts` | Export `AgentesLayout`, `DragHandle`, `TestPanel`, `PreviewChatView` |
| `client/src/components/Agentes/AgentesView.tsx` | Wrap with `AgentDraftProvider` + `AgentesLayout` |
| `client/src/components/SidePanel/Agents/AgentPanel.tsx` | Add `useEffect` that feeds `AgentDraftContext` (debounced 300ms) |
| `client/src/components/SidePanel/Agents/AgentFooter.tsx` | `renderSaveButton`: show "Publicar" when `!agent_id` |

---

## Tasks

---

### Task 1: i18n keys

**Files:**
- Modify: `client/src/locales/en/translation.json` (after line 1795, after `"com_ui_ux_flows_canvas"`)

> CI validates that every key in the JSON is referenced in code. These 8 keys will be referenced in Tasks 3–9. Add them all now so you don't have to touch this file again.

- [ ] **Step 1: Open the file and find insertion point**

Search for `"com_ui_ux_flows_canvas"` — it's the last `com_ui_ux_` key (~line 1795). Insert the 8 new keys immediately after it, preserving JSON comma syntax.

- [ ] **Step 2: Add keys**

```json
"com_ui_ux_configurar_tab": "Configurar",
"com_ui_ux_construir_agente": "🛠 Construir",
"com_ui_ux_conversar_tab": "Conversar",
"com_ui_ux_fase3_badge": "Fase 3",
"com_ui_ux_publicar_agente": "Publicar",
"com_ui_ux_rascunho_efemero": "Rascunho efêmero — não salvo",
"com_ui_ux_resize_panels": "Redimensionar painéis",
"com_ui_ux_testar_rascunho": "💬 Testar",
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./client/src/locales/en/translation.json')" && echo "JSON OK"
```

Expected: `JSON OK`

- [ ] **Step 4: Commit**

```bash
git add client/src/locales/en/translation.json
git commit -m "feat(agentes-fase2): i18n keys — split panel, testar, publicar"
```

---

### Task 2: AgentDraftContext

**Files:**
- Create: `client/src/Providers/AgentDraftContext.tsx`
- Create: `client/src/Providers/__tests__/AgentDraftContext.spec.tsx`
- Modify: `client/src/Providers/index.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/Providers/__tests__/AgentDraftContext.spec.tsx`:

```tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AgentDraftProvider, useAgentDraftContext } from '../AgentDraftContext';
import type { AgentDraftParams } from '../AgentDraftContext';

const blank: AgentDraftParams = {
  provider: '',
  model: '',
  instructions: '',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

function Consumer() {
  const { draftParams, setDraftParams } = useAgentDraftContext();
  return (
    <div>
      <span data-testid="model">{draftParams.model}</span>
      <span data-testid="web">{String(draftParams.webSearch)}</span>
      <button
        onClick={() => setDraftParams({ ...blank, model: 'gpt-4o', webSearch: true })}
      >
        update
      </button>
    </div>
  );
}

describe('AgentDraftContext', () => {
  it('provides default empty draft params', () => {
    render(
      <AgentDraftProvider>
        <Consumer />
      </AgentDraftProvider>,
    );
    expect(screen.getByTestId('model').textContent).toBe('');
    expect(screen.getByTestId('web').textContent).toBe('false');
  });

  it('updates when setDraftParams is called', () => {
    render(
      <AgentDraftProvider>
        <Consumer />
      </AgentDraftProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'update' }).click();
    });
    expect(screen.getByTestId('model').textContent).toBe('gpt-4o');
    expect(screen.getByTestId('web').textContent).toBe('true');
  });

  it('throws when used outside AgentDraftProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'useAgentDraftContext must be used within AgentDraftProvider',
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/Providers/__tests__/AgentDraftContext.spec.tsx
```

Expected: FAIL — module `../AgentDraftContext` not found.

- [ ] **Step 3: Create AgentDraftContext.tsx**

Create `client/src/Providers/AgentDraftContext.tsx`:

```tsx
import React, { createContext, useContext, useState } from 'react';

export type AgentDraftParams = {
  provider: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[];
};

const defaultDraftParams: AgentDraftParams = {
  provider: '',
  model: '',
  instructions: '',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: (params: AgentDraftParams) => void;
};

const AgentDraftContext = createContext<AgentDraftContextValue | null>(null);

export function AgentDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftParams, setDraftParams] = useState<AgentDraftParams>(defaultDraftParams);
  return (
    <AgentDraftContext.Provider value={{ draftParams, setDraftParams }}>
      {children}
    </AgentDraftContext.Provider>
  );
}

export function useAgentDraftContext(): AgentDraftContextValue {
  const ctx = useContext(AgentDraftContext);
  if (!ctx) {
    throw new Error('useAgentDraftContext must be used within AgentDraftProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/Providers/__tests__/AgentDraftContext.spec.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Export from Providers/index.ts**

Add to the end of `client/src/Providers/index.ts`:

```ts
export * from './AgentDraftContext';
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep AgentDraft
```

Expected: no output (no errors for AgentDraftContext).

- [ ] **Step 7: Commit**

```bash
git add client/src/Providers/AgentDraftContext.tsx client/src/Providers/__tests__/AgentDraftContext.spec.tsx client/src/Providers/index.ts
git commit -m "feat(agentes-fase2): AgentDraftContext — bridge form → TestPanel"
```

---

### Task 3: DragHandle component

**Files:**
- Create: `client/src/components/Agentes/DragHandle.tsx`
- Create: `client/src/components/Agentes/__tests__/DragHandle.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/Agentes/__tests__/DragHandle.spec.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

import DragHandle from '../DragHandle';

describe('DragHandle', () => {
  it('calls onDrag with clientX after mousedown then mousemove', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);
    const handle = document.querySelector('[role="separator"]')!;

    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 400 });

    expect(onDrag).toHaveBeenCalledWith(400);
    expect(onDrag).toHaveBeenCalledTimes(1);
  });

  it('does not call onDrag on mousemove without prior mousedown', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);

    fireEvent.mouseMove(document, { clientX: 400 });

    expect(onDrag).not.toHaveBeenCalled();
  });

  it('stops calling onDrag after mouseup', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);
    const handle = document.querySelector('[role="separator"]')!;

    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 300 });
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 500 });

    expect(onDrag).toHaveBeenCalledTimes(1);
    expect(onDrag).toHaveBeenCalledWith(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/DragHandle.spec.tsx
```

Expected: FAIL — `../DragHandle` not found.

- [ ] **Step 3: Create DragHandle.tsx**

Create `client/src/components/Agentes/DragHandle.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useLocalize } from '~/hooks';

interface DragHandleProps {
  onDrag: (clientX: number) => void;
}

export default function DragHandle({ onDrag }: DragHandleProps) {
  const localize = useLocalize();
  const isDragging = useRef(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        onDrag(e.clientX);
      }
    }
    function handleMouseUp() {
      isDragging.current = false;
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={localize('com_ui_ux_resize_panels')}
      className="relative flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-border-medium transition-colors hover:bg-surface-hover"
      onMouseDown={() => {
        isDragging.current = true;
      }}
    >
      <div className="h-8 w-1 rounded-full bg-border-heavy" aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/DragHandle.spec.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Agentes/DragHandle.tsx client/src/components/Agentes/__tests__/DragHandle.spec.tsx
git commit -m "feat(agentes-fase2): DragHandle — divisor arrastável com mouse events"
```

---

### Task 4: AgentesLayout component

**Files:**
- Create: `client/src/components/Agentes/AgentesLayout.tsx`
- Create: `client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock DragHandle — its own tests cover it; here we just need it to render.
jest.mock('../DragHandle', () => ({
  __esModule: true,
  default: ({ onDrag }: { onDrag: (x: number) => void }) => (
    <div data-testid="drag-handle" onMouseDown={() => onDrag(500)} />
  ),
}));

import AgentesLayout from '../AgentesLayout';

describe('AgentesLayout — mobile (width < 768)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
  });

  it('renders the segmented toggle with both tabs', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('com_ui_ux_configurar_tab')).toBeInTheDocument();
    expect(screen.getByText('com_ui_ux_conversar_tab')).toBeInTheDocument();
  });

  it('shows the left panel by default', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(screen.queryByText('chat')).not.toBeInTheDocument();
  });

  it('switches to the right panel when "Conversar" tab is clicked', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    fireEvent.click(screen.getByText('com_ui_ux_conversar_tab'));
    expect(screen.queryByText('form')).not.toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});

describe('AgentesLayout — desktop (width >= 768)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
  });

  it('renders both panels simultaneously', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('renders the DragHandle', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx
```

Expected: FAIL — `../AgentesLayout` not found.

- [ ] **Step 3: Create AgentesLayout.tsx**

Create `client/src/components/Agentes/AgentesLayout.tsx`:

```tsx
import React, { useState } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import DragHandle from './DragHandle';

interface AgentesLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function AgentesLayout({ left, right }: AgentesLayoutProps) {
  const localize = useLocalize();
  const [leftPct, setLeftPct] = useState(40);
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config');
  const isDesktop = window.innerWidth >= 768;

  function onDrag(clientX: number) {
    const pct = (clientX / window.innerWidth) * 100;
    setLeftPct(Math.min(Math.max(pct, 25), 70));
  }

  if (!isDesktop) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex border-b border-border-medium">
          <button
            type="button"
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'config'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => setActiveTab('config')}
          >
            {localize('com_ui_ux_configurar_tab')}
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'chat'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => setActiveTab('chat')}
          >
            {localize('com_ui_ux_conversar_tab')}
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'config' ? left : right}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div style={{ width: `${leftPct}%`, overflowY: 'auto', overflowX: 'hidden' }}>
        {left}
      </div>
      <DragHandle onDrag={onDrag} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {right}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Agentes/AgentesLayout.tsx client/src/components/Agentes/__tests__/AgentesLayout.spec.tsx
git commit -m "feat(agentes-fase2): AgentesLayout — split resizável desktop + toggle mobile"
```

---

### Task 5: AgentFooter — "Publicar" button for new agents

**Files:**
- Modify: `client/src/components/SidePanel/Agents/AgentFooter.tsx` (lines 64–74)
- Modify: `client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx`

The current `renderSaveButton()` returns `localize('com_ui_create')` when `!agent_id`. Change this to `localize('com_ui_ux_publicar_agente')` and add a green accent class to the button when creating.

- [ ] **Step 1: Read the existing AgentFooter test to understand the test pattern**

```bash
head -60 client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx
```

Understand how it renders `AgentFooter` (look for the `renderFooter` helper or direct `render()`). You'll add a test using the same pattern.

- [ ] **Step 2: Add a failing test for "Publicar"**

Open `client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx` and add a test in the appropriate describe block:

```tsx
it('shows "Publicar" text on the submit button when there is no agent_id (new agent)', () => {
  // Render AgentFooter using the same helper as existing tests, but with agent 'id' = undefined.
  // The exact setup depends on how the existing tests configure react-hook-form.
  // Look for a helper like `renderWithForm()` or `renderFooter()` above and reuse it.
  // The submit button is identified by type="submit".
  const submitBtn = screen.getByRole('button', { name: /publicar/i });
  expect(submitBtn).toBeInTheDocument();
});

it('shows "Salvar" text on the submit button when agent_id is set (existing agent)', () => {
  // Render with agent 'id' set to a non-empty string.
  const submitBtn = screen.getByRole('button', { name: /salvar/i });
  expect(submitBtn).toBeInTheDocument();
});
```

> **Note:** After reading the existing test file in Step 1, adjust the test setup to match the existing pattern exactly. Do not introduce a new rendering pattern — reuse whatever helper exists.

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx
```

Expected: The new "Publicar" test fails (button text is currently "Criar").

- [ ] **Step 4: Modify renderSaveButton in AgentFooter.tsx**

In `client/src/components/SidePanel/Agents/AgentFooter.tsx`, change `renderSaveButton` (lines 64–74):

**Before:**
```tsx
const renderSaveButton = () => {
  if (isSaving) {
    return <Spinner className="icon-md" aria-hidden="true" />;
  }

  if (agent_id) {
    return localize('com_ui_save');
  }

  return localize('com_ui_create');
};
```

**After:**
```tsx
const renderSaveButton = () => {
  if (isSaving) {
    return <Spinner className="icon-md" aria-hidden="true" />;
  }

  if (agent_id) {
    return localize('com_ui_save');
  }

  return localize('com_ui_ux_publicar_agente');
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx
```

Expected: all tests pass including the new "Publicar" test.

- [ ] **Step 6: ESLint**

```bash
rtk proxy npx eslint --config eslint.config.mjs --fix client/src/components/SidePanel/Agents/AgentFooter.tsx
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/SidePanel/Agents/AgentFooter.tsx client/src/components/SidePanel/Agents/__tests__/AgentFooter.spec.tsx
git commit -m "feat(agentes-fase2): AgentFooter — 'Publicar' para novos agentes"
```

---

### Task 6: AgentPanel → feeds AgentDraftContext

**Files:**
- Modify: `client/src/components/SidePanel/Agents/AgentPanel.tsx`

`AgentPanel` owns the `FormProvider`. It already has `useWatch` for `id` (line 302). We add a second `useWatch` for the draft fields and a debounced `useEffect` that pushes values into `AgentDraftContext`.

`mcpServersMap` is already available from `useAgentPanelContext()` (AgentPanel imports it at line 32). MCP server extraction replicates the logic from `useVisibleTools` (`client/src/hooks/MCP/useVisibleTools.ts`) as a plain function inside the effect (can't call hooks inside effects).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/SidePanel/Agents/__tests__/AgentPanelDraftSync.spec.tsx`:

```tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { AgentDraftProvider, useAgentDraftContext } from '~/Providers/AgentDraftContext';

// We test the hook logic in isolation via a thin wrapper, not the full AgentPanel
// (which has too many dependencies). The test verifies that when watched fields change,
// setDraftParams is called with the correct shape.

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ user: null }),
  useSelectAgent: () => ({ handleSelectAgent: jest.fn() }),
  useHasAccess: () => false,
  useResourcePermissions: () => ({ hasPermission: () => false, isLoading: false }),
}));

// Import the pure extraction helper that AgentPanel uses internally.
// It lives in '~/utils' after Task 6 adds it.
import { extractMcpServerNames } from '~/utils';

describe('extractMcpServerNames', () => {
  const mcpServersMap = new Map([
    ['server-a', {}],
    ['server-b', {}],
  ]);

  it('extracts server names from MCP-prefixed tool IDs', () => {
    const tools = ['mcp::server-a', 'mcp::server-b', 'regular-tool'];
    expect(extractMcpServerNames(tools, mcpServersMap)).toEqual(['server-a', 'server-b']);
  });

  it('extracts legacy server names (bare server name in map)', () => {
    const tools = ['server-a', 'not-a-server'];
    expect(extractMcpServerNames(tools, mcpServersMap)).toEqual(['server-a']);
  });

  it('returns empty array when tools is undefined', () => {
    expect(extractMcpServerNames(undefined, mcpServersMap)).toEqual([]);
  });
});
```

> The test targets `extractMcpServerNames`, a pure function you'll add to `client/src/utils/`. This keeps the logic testable without mounting the full `AgentPanel`.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/SidePanel/Agents/__tests__/AgentPanelDraftSync.spec.tsx
```

Expected: FAIL — `extractMcpServerNames` not found in `~/utils`.

- [ ] **Step 3: Add `extractMcpServerNames` to utils**

Find where utils are exported (likely `client/src/utils/index.ts`). Add a new file `client/src/utils/agents.ts`:

```ts
import { Constants } from 'librechat-data-provider';

export function extractMcpServerNames(
  toolIds: string[] | undefined,
  mcpServersMap: Map<string, unknown>,
): string[] {
  const servers = new Set<string>();
  for (const toolId of toolIds ?? []) {
    if (toolId.includes(Constants.mcp_delimiter)) {
      const serverName = toolId.split(Constants.mcp_delimiter)[1];
      if (serverName) {
        servers.add(serverName);
      }
    } else if (mcpServersMap.has(toolId)) {
      servers.add(toolId);
    }
  }
  return Array.from(servers).sort((a, b) => a.localeCompare(b));
}
```

Then export it from `client/src/utils/index.ts`:

```ts
export * from './agents';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/SidePanel/Agents/__tests__/AgentPanelDraftSync.spec.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Add draft context sync to AgentPanel.tsx**

Open `client/src/components/SidePanel/Agents/AgentPanel.tsx`.

**Add to imports** (after the existing `useAgentPanelContext` import on line 32):

```ts
import { AgentCapabilities } from 'librechat-data-provider';
import { useAgentDraftContext } from '~/Providers';
import { extractMcpServerNames } from '~/utils';
```

> Check if `AgentCapabilities` is already imported from `librechat-data-provider` before adding it — the file already imports several named exports from there (lines 7–13). Add only what's missing.

**Add after the `agent_id` watch** (line 302, after `const agent_id = useWatch({ control, name: 'id' });`):

```ts
const { setDraftParams } = useAgentDraftContext();
const { mcpServersMap } = useAgentPanelContext();

const [watchedProvider, watchedModel, watchedInstructions, watchedTools, watchedWebSearch, watchedFileSearch, watchedExecuteCode] =
  useWatch({
    control,
    name: [
      'provider',
      'model',
      'instructions',
      'tools',
      AgentCapabilities.web_search,
      AgentCapabilities.file_search,
      AgentCapabilities.execute_code,
    ],
  });

useEffect(() => {
  const timer = setTimeout(() => {
    const providerValue =
      watchedProvider != null && typeof watchedProvider === 'object' && 'value' in watchedProvider
        ? (watchedProvider as { value: string }).value
        : (watchedProvider as string | undefined) ?? '';

    setDraftParams({
      provider: providerValue,
      model: (watchedModel as string | null) ?? '',
      instructions: (watchedInstructions as string | null) ?? '',
      webSearch: Boolean(watchedWebSearch),
      fileSearch: Boolean(watchedFileSearch),
      executeCode: Boolean(watchedExecuteCode),
      mcpServers: extractMcpServerNames(watchedTools as string[] | undefined, mcpServersMap),
    });
  }, 300);
  return () => clearTimeout(timer);
}, [
  watchedProvider,
  watchedModel,
  watchedInstructions,
  watchedTools,
  watchedWebSearch,
  watchedFileSearch,
  watchedExecuteCode,
  setDraftParams,
  mcpServersMap,
]);
```

- [ ] **Step 6: TypeScript + ESLint**

```bash
npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -i "agentpanel\|agentdraft\|draftparam" | head -20
rtk proxy npx eslint --config eslint.config.mjs --fix client/src/components/SidePanel/Agents/AgentPanel.tsx client/src/utils/agents.ts
```

Expected: no TypeScript errors for the modified files; ESLint clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/SidePanel/Agents/AgentPanel.tsx client/src/utils/agents.ts client/src/utils/index.ts client/src/components/SidePanel/Agents/__tests__/AgentPanelDraftSync.spec.tsx
git commit -m "feat(agentes-fase2): AgentPanel → AgentDraftContext sync (debounced 300ms)"
```

---

### Task 7: TestPanel

**Files:**
- Create: `client/src/components/Agentes/TestPanel.tsx`
- Create: `client/src/components/Agentes/__tests__/TestPanel.spec.tsx`

TestPanel is the right-side container: tab bar ("💬 Testar" active, "🛠 Construir" disabled with Fase 3 badge), ephemeral badge, and a placeholder for `PreviewChatView` (to be wired in Task 8).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/Agentes/__tests__/TestPanel.spec.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentDraftProvider } from '~/Providers/AgentDraftContext';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Stub PreviewChatView — it's wired in Task 8
jest.mock('../PreviewChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-chat" />,
}));

import TestPanel from '../TestPanel';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AgentDraftProvider>{children}</AgentDraftProvider>;
}

describe('TestPanel', () => {
  it('renders the "Testar" tab as active', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_testar_rascunho')).toBeInTheDocument();
  });

  it('renders the "Construir" tab with the Fase 3 badge', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_construir_agente')).toBeInTheDocument();
    expect(screen.getByText('com_ui_ux_fase3_badge')).toBeInTheDocument();
  });

  it('renders the ephemeral draft badge', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_rascunho_efemero')).toBeInTheDocument();
  });

  it('renders the PreviewChatView stub', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByTestId('preview-chat')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/TestPanel.spec.tsx
```

Expected: FAIL — `../TestPanel` not found.

- [ ] **Step 3: Create TestPanel.tsx**

Create `client/src/components/Agentes/TestPanel.tsx`:

```tsx
import { useState, useRef } from 'react';
import { useLocalize } from '~/hooks';
import { useAgentDraftContext } from '~/Providers';
import { cn } from '~/utils';
import PreviewChatView from './PreviewChatView';

export default function TestPanel() {
  const localize = useLocalize();
  const { draftParams } = useAgentDraftContext();
  const [conversationId, setConversationId] = useState<string | null>(null);

  function handleConversationCreated(id: string) {
    setConversationId(id);
  }

  return (
    <div className="flex h-full flex-col border-l border-border-medium">
      {/* Tab bar */}
      <div className="flex border-b border-border-medium px-1">
        <div className="border-b-2 border-green-500 px-3 py-2 text-sm font-semibold text-green-600">
          {localize('com_ui_ux_testar_rascunho')}
        </div>
        <div
          className="flex cursor-not-allowed items-center gap-1 px-3 py-2 text-sm text-text-tertiary opacity-50"
          aria-disabled="true"
        >
          {localize('com_ui_ux_construir_agente')}
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
            {localize('com_ui_ux_fase3_badge')}
          </span>
        </div>
      </div>
      {/* Ephemeral badge */}
      <div className="flex justify-center py-1.5">
        <span className="rounded-full border border-yellow-400 bg-yellow-50 px-3 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          {localize('com_ui_ux_rascunho_efemero')}
        </span>
      </div>
      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <PreviewChatView
          conversationId={conversationId}
          draftParams={draftParams}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create a stub PreviewChatView so TestPanel can be imported**

PreviewChatView will be fully implemented in Task 8. For now create a minimal stub at `client/src/components/Agentes/PreviewChatView.tsx`:

```tsx
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

interface PreviewChatViewProps {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
}

export default function PreviewChatView(_props: PreviewChatViewProps) {
  return <div className="h-full w-full" />;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/TestPanel.spec.tsx
```

Expected: 4 tests pass.

- [ ] **Step 6: ESLint**

```bash
rtk proxy npx eslint --config eslint.config.mjs --fix client/src/components/Agentes/TestPanel.tsx client/src/components/Agentes/PreviewChatView.tsx
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Agentes/TestPanel.tsx client/src/components/Agentes/PreviewChatView.tsx client/src/components/Agentes/__tests__/TestPanel.spec.tsx
git commit -m "feat(agentes-fase2): TestPanel — tab bar, badge efêmero, stub PreviewChatView"
```

---

### Task 8: PreviewChatView — full implementation

**Files:**
- Modify: `client/src/components/Agentes/PreviewChatView.tsx` (replace stub from Task 7)

This is the most complex task. `PreviewChatView` adapts `ChatView` to:
1. Accept `conversationId: string | null` instead of reading from `useParams()`.
2. Accept `draftParams: AgentDraftParams` and inject ephemeral params into the Recoil conversation atom.
3. Accept `onConversationCreated(id: string)` and call it once the Recoil atom receives a real conversation ID.
4. Mount `ChatFormProvider` and `ChatContext.Provider` internally (same as `ChatView`).

**How it works:**
- Uses a fixed Recoil index `PREVIEW_CHAT_INDEX = 1` (index 0 is the main chat, index 1 is free for preview).
- `useChatHelpers(PREVIEW_CHAT_INDEX, effectiveConvoId)` gives us `chatHelpers` including `setConversation`.
- A `useEffect` on `draftParams` calls `chatHelpers.setConversation(prev => ({ ...prev, ephemeral params }))`.
- A second `useEffect` watches `chatHelpers.conversation?.conversationId` — when it transitions from `'new'` to a real ID, calls `onConversationCreated` and updates local `activeConvoId` state so `useGetMessagesByConvoId` refetches.
- `useAdaptiveSSE` and `useAddedResponse` are wired the same way as in `ChatView` to support streaming.

**Reference files to read before implementing:**
- `client/src/components/Chat/ChatView.tsx` — the original (80 lines visible earlier; read the rest with `Read` from line 80)
- `client/src/hooks/Chat/useChatHelpers.ts` — understand the `paramId` + `conversationId` interplay

- [ ] **Step 1: Read the rest of ChatView.tsx**

```bash
sed -n '79,120p' client/src/components/Chat/ChatView.tsx
```

This reveals the `ChatContext.Provider` + `AddedChatContext.Provider` wrapping structure. You'll replicate it.

- [ ] **Step 2: Write the failing test**

> `PreviewChatView` has too many Recoil/React Query dependencies for a unit test to be practical. Write a smoke test that verifies it renders without crashing when given valid props and a mocked chat infrastructure.

Create `client/src/components/Agentes/__tests__/PreviewChatView.spec.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentDraftProvider } from '~/Providers/AgentDraftContext';

// Heavy hooks need mocking to avoid network calls and missing providers
jest.mock('~/hooks/Chat/useChatHelpers', () => ({
  __esModule: true,
  default: () => ({
    conversation: { conversationId: 'new', endpoint: null, model: null },
    setConversation: jest.fn(),
    getMessages: jest.fn(),
    setMessages: jest.fn(),
    isSubmitting: false,
    ask: jest.fn(),
    regenerate: jest.fn(),
    stopGenerating: jest.fn(),
    latestMessage: null,
    setLatestMessage: jest.fn(),
  }),
}));
jest.mock('~/hooks/SSE/useAdaptiveSSE', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('~/hooks/Chat/useAddedResponse', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('~/hooks/Chat/useResumeOnLoad', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('~/data-provider', () => ({
  useGetMessagesByConvoId: () => ({ data: null, isLoading: false }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useFileMapContext: () => ({}),
}));

import PreviewChatView from '../PreviewChatView';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

const draftParams: AgentDraftParams = {
  provider: 'openAI',
  model: 'gpt-4o',
  instructions: 'Be helpful',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return (
    <RecoilRoot>
      <QueryClientProvider client={qc}>
        <AgentDraftProvider>{children}</AgentDraftProvider>
      </QueryClientProvider>
    </RecoilRoot>
  );
}

describe('PreviewChatView', () => {
  it('renders without crashing with null conversationId', () => {
    expect(() =>
      render(
        <PreviewChatView
          conversationId={null}
          draftParams={draftParams}
          onConversationCreated={jest.fn()}
        />,
        { wrapper: Wrapper },
      ),
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/PreviewChatView.spec.tsx
```

Expected: FAIL (stub doesn't have the real providers).

- [ ] **Step 4: Implement PreviewChatView.tsx**

Replace `client/src/components/Agentes/PreviewChatView.tsx` with the full implementation:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useForm } from 'react-hook-form';
import { Constants, buildTree } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ChatFormValues } from '~/common';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import {
  ChatContext,
  AddedChatContext,
  ChatFormProvider,
  useFileMapContext,
} from '~/Providers';
import {
  useChatHelpers,
  useAddedResponse,
  useAdaptiveSSE,
} from '~/hooks';
import { useGetMessagesByConvoId } from '~/data-provider';
import MessagesView from '~/components/Chat/Messages/MessagesView';
import ChatForm from '~/components/Chat/Input/ChatForm';
import store from '~/store';

const PREVIEW_CHAT_INDEX = 1;

interface PreviewChatViewProps {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
}

export default function PreviewChatView({
  conversationId,
  draftParams,
  onConversationCreated,
}: PreviewChatViewProps) {
  const initialConvoId = conversationId ?? Constants.NEW_CONVO;
  const [activeConvoId, setActiveConvoId] = useState(initialConvoId);

  const methods = useForm<ChatFormValues>({ defaultValues: { text: '' } });
  const fileMap = useFileMapContext();
  const rootSubmission = useRecoilValue(store.submissionByIndex(PREVIEW_CHAT_INDEX));

  const chatHelpers = useChatHelpers(PREVIEW_CHAT_INDEX, activeConvoId);
  const addedChatHelpers = useAddedResponse();

  // Sync draftParams → conversation atom (ephemeral agent config)
  useEffect(() => {
    chatHelpers.setConversation((prev) => ({
      ...prev,
      endpoint: draftParams.provider || prev?.endpoint,
      model: draftParams.model || prev?.model,
      agent_id: Constants.EPHEMERAL_AGENT_ID,
      promptPrefix: draftParams.instructions || undefined,
      ephemeralAgent: {
        web_search: draftParams.webSearch,
        file_search: draftParams.fileSearch,
        execute_code: draftParams.executeCode,
        mcp: draftParams.mcpServers.length > 0 ? draftParams.mcpServers : undefined,
      },
    }));
  }, [
    draftParams.provider,
    draftParams.model,
    draftParams.instructions,
    draftParams.webSearch,
    draftParams.fileSearch,
    draftParams.executeCode,
    draftParams.mcpServers,
  ]);

  // When a new conversation is created (first message sent), capture the ID
  const recoilConvoId = chatHelpers.conversation?.conversationId;
  useEffect(() => {
    if (
      recoilConvoId &&
      recoilConvoId !== Constants.NEW_CONVO &&
      recoilConvoId !== activeConvoId
    ) {
      setActiveConvoId(recoilConvoId);
      onConversationCreated(recoilConvoId);
    }
  }, [recoilConvoId]);

  useAdaptiveSSE(rootSubmission, chatHelpers, false, PREVIEW_CHAT_INDEX);

  const { data: messagesTree = null } = useGetMessagesByConvoId(activeConvoId, {
    select: useCallback(
      (data: TMessage[]) => {
        const tree = buildTree({ messages: data, fileMap });
        return tree?.length === 0 ? null : (tree ?? null);
      },
      [fileMap],
    ),
    enabled: !!fileMap && activeConvoId !== Constants.NEW_CONVO,
  });

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <div className="flex h-full flex-col">
            <div className="relative flex-1 overflow-hidden overflow-y-auto">
              {messagesTree ? (
                <MessagesView messagesTree={messagesTree} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-tertiary" />
              )}
            </div>
            <ChatForm index={PREVIEW_CHAT_INDEX} />
          </div>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}
```

> **Implementation notes:**
> - `useAdaptiveSSE` from `~/hooks/SSE/useAdaptiveSSE` — check exact import path: `import { useAdaptiveSSE } from '~/hooks'` if re-exported, or direct import if not.
> - `useAddedResponse` from `~/hooks/Chat/useAddedResponse` — same check.
> - `ChatForm` index prop: verify `ChatForm` accepts an `index` prop by checking `client/src/components/Chat/Input/ChatForm.tsx`. If not, omit the prop and it defaults to 0 — this is OK for MVP.
> - `useResumeOnLoad` is intentionally omitted — preview sessions don't need auto-resume.
> - If TypeScript complains about `setConversation` callback shape, check the return type of `useCreateConversationAtom` and adjust the setter signature accordingly.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/PreviewChatView.spec.tsx
```

Expected: 1 test passes (smoke test: renders without crashing).

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -i "previewchat\|previewChat" | head -20
```

Expected: no errors.

- [ ] **Step 7: ESLint**

```bash
rtk proxy npx eslint --config eslint.config.mjs --fix client/src/components/Agentes/PreviewChatView.tsx
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/Agentes/PreviewChatView.tsx client/src/components/Agentes/__tests__/PreviewChatView.spec.tsx
git commit -m "feat(agentes-fase2): PreviewChatView — chat efêmero com draftParams + conversationId prop"
```

---

### Task 9: AgentesView wiring + Agentes/index.ts

**Files:**
- Modify: `client/src/components/Agentes/AgentesView.tsx`
- Modify: `client/src/components/Agentes/index.ts`

This is the final wiring step: wrap `AgentesView` with `AgentDraftProvider` + `AgentesLayout`, passing `AgentPanelSwitch` as left and `TestPanel` as right.

- [ ] **Step 1: Write the failing test**

The existing test (if any) for `AgentesView` can be used. More practically, write a smoke test:

Create `client/src/components/Agentes/__tests__/AgentesView.spec.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAgentsAccessRedirect: () => true,
}));
jest.mock('~/hooks/Agents', () => ({
  useAgentsAccessRedirect: () => true,
}));
jest.mock('~/components/SidePanel/Agents/AgentPanelSwitch', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-panel-switch" />,
}));
jest.mock('../TestPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="test-panel" />,
}));
jest.mock('../AgentesLayout', () => ({
  __esModule: true,
  default: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div>
      <div data-testid="left">{left}</div>
      <div data-testid="right">{right}</div>
    </div>
  ),
}));

import AgentesView from '../AgentesView';

describe('AgentesView', () => {
  it('renders AgentPanelSwitch on the left and TestPanel on the right', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <AgentesView />
      </MemoryRouter>,
    );
    expect(getByTestId('agent-panel-switch')).toBeInTheDocument();
    expect(getByTestId('test-panel')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/AgentesView.spec.tsx
```

Expected: FAIL (AgentesView still renders old layout without TestPanel).

- [ ] **Step 3: Rewrite AgentesView.tsx**

Replace `client/src/components/Agentes/AgentesView.tsx`:

```tsx
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import { useAgentsAccessRedirect } from '~/hooks/Agents';
import { useLocalize } from '~/hooks';
import { AgentDraftProvider } from '~/Providers';
import AgentesLayout from './AgentesLayout';
import TestPanel from './TestPanel';

export default function AgentesView() {
  const localize = useLocalize();
  const hasAccess = useAgentsAccessRedirect();

  if (!hasAccess) {
    return null;
  }

  return (
    <AgentDraftProvider>
      <main
        className="h-full w-full overflow-hidden bg-surface-primary"
        aria-label={localize('com_ui_ux_nav_agentes')}
      >
        <AgentesLayout
          left={<AgentPanelSwitch />}
          right={<TestPanel />}
        />
      </main>
    </AgentDraftProvider>
  );
}
```

> **Note:** `overflow-y-auto` on `<main>` was removed — scroll is now handled per-panel inside `AgentesLayout`. The centred `max-w-2xl` wrapper is also removed so the split uses the full width. If the form looks too narrow on the left panel, add a `min-w-[320px]` or `max-w-xl` constraint inside `AgentesLayout` for the left side.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/__tests__/AgentesView.spec.tsx
```

Expected: 1 test passes.

- [ ] **Step 5: Update Agentes/index.ts**

Open `client/src/components/Agentes/index.ts` and add exports for all new components:

```ts
export { default as AgentesLayout } from './AgentesLayout';
export { default as DragHandle } from './DragHandle';
export { default as TestPanel } from './TestPanel';
export { default as PreviewChatView } from './PreviewChatView';
```

- [ ] **Step 6: Run all Agentes tests**

```bash
npx jest --config client/jest.config.cjs client/src/components/Agentes/
```

Expected: all tests pass.

- [ ] **Step 7: Run all Agent-related tests**

```bash
npx jest --config client/jest.config.cjs client/src/components/SidePanel/Agents/
```

Expected: all pass (or same failures as CI baseline — no new regressions).

- [ ] **Step 8: TypeScript full check**

```bash
npx tsc --noEmit -p client/tsconfig.json 2>&1 | head -30
```

Expected: no new errors beyond the project's existing CI baseline.

- [ ] **Step 9: ESLint**

```bash
rtk proxy npx eslint --config eslint.config.mjs --fix client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts
```

- [ ] **Step 10: Commit**

```bash
git add client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts client/src/components/Agentes/__tests__/AgentesView.spec.tsx
git commit -m "feat(agentes-fase2): AgentesView — split layout + TestPanel wired"
```

---

## Success Criteria (from spec)

- [ ] `/d/agentes` shows split resizável no desktop (>768px) — form on left, chat on right.
- [ ] Arrastando o divisor, os painéis redimensionam (25%–70% clamp).
- [ ] Enviar uma mensagem no TestPanel usa o agente efêmero (sem criar agente no banco).
- [ ] Botão "✦ Publicar" aparece só para agentes novos (sem `agent_id`); agentes existentes mostram "Salvar".
- [ ] Mobile: toggle [⚙ Configurar | 💬 Conversar] funciona e o formulário é preservado ao alternar.
- [ ] Lint limpo; `client/vite.config.ts` não entra em nenhum commit.
