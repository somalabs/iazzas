# Agentes Fase 3 — Aba "🛠 Construir" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar a aba "🛠 Construir" no TestPanel, conectada ao agente `CONSTRUTOR_AGENT_ID` que edita o formulário ao vivo via tool call `atualizar_rascunho` interceptado no SSE.

**Architecture:** Um novo `BuilderChatView` (espelho de `PreviewChatView`) envia mensagens ao agente salvo `CONSTRUTOR_AGENT_ID`, injetando o estado atual do rascunho via `promptPrefix` em cada render. O hook `useBuilderToolInterceptor` escuta mensagens e, ao detectar um tool call `atualizar_rascunho` completo, aplica os args ao form via `applyDraftUpdate`. O `AgentDraftContext` expõe `registerFormSetValue` para que o `AgentPanel` (painel esquerdo) registre seu `setValue` e o `BuilderChatView` (painel direito) consiga atualizar o form cross-panel. O backend expõe um stub TS (`createAtualizarRascunhoTool`) que retorna `{aplicado: true}` — a lógica real é frontend-only.

**Tech Stack:** React, react-hook-form, Recoil, librechat-data-provider, @langchain/core/tools, LibreChat SSE/agents pipeline, Jest + Testing Library.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `packages/data-provider/src/config.ts` | Modify | Adicionar `CONSTRUTOR_AGENT_ID` ao enum `Constants` |
| `client/src/Providers/AgentDraftContext.tsx` | Modify | Adicionar `name`, `category`, `temperature?`, `top_p?` ao `AgentDraftParams` + `registerFormSetValue`/`setFormValue` ao contexto |
| `client/src/components/SidePanel/Agents/AgentPanel.tsx` | Modify | Incluir `name` e `category` no `useWatch` → `setDraftParams`; chamar `registerFormSetValue(setValue)` no mount |
| `packages/api/src/tools/registry/definitions.ts` | Modify | Adicionar `atualizarRascunhoSchema` e entry em `toolDefinitions` |
| `packages/api/src/tools/construtor.ts` | Create | Factory `createAtualizarRascunhoTool` (DynamicStructuredTool stub) |
| `packages/api/src/tools/index.ts` | Modify | Re-exportar `createAtualizarRascunhoTool` |
| `api/app/clients/tools/util/handleTools.js` | Modify | Adicionar `atualizar_rascunho` em `customConstructors` |
| `client/src/utils/applyDraftUpdate.ts` | Create | Função pura: merge de args parciais no draftParams + setValue no form |
| `client/src/utils/__tests__/applyDraftUpdate.spec.ts` | Create | Testes unitários de `applyDraftUpdate` |
| `client/src/hooks/Agentes/useBuilderToolInterceptor.ts` | Create | Hook: detecta `atualizar_rascunho` no SSE e chama `applyDraftUpdate` |
| `client/src/hooks/Agentes/__tests__/useBuilderToolInterceptor.spec.ts` | Create | Testes do hook |
| `client/src/locales/en/translation.json` | Modify | 3 novas chaves i18n |
| `client/src/components/Agentes/BuilderChatView.tsx` | Create | Chat que conversa com CONSTRUTOR_AGENT_ID + intercepta tool calls |
| `client/src/components/Agentes/__tests__/BuilderChatView.spec.tsx` | Create | Smoke tests do componente |
| `client/src/components/Agentes/TestPanel.tsx` | Modify | Tab switching, dois convoIds, badge só no Testar |
| `client/src/components/Agentes/__tests__/TestPanel.spec.tsx` | Modify | Atualizar para nova UI; adicionar teste de tab switching |
| `client/src/components/Agentes/index.ts` | Modify | Exportar `BuilderChatView` |

---

## Task 1: Constants no data-provider

**Files:**
- Modify: `packages/data-provider/src/config.ts` (linha ~1922, após `EPHEMERAL_AGENT_ID`)

- [ ] **Step 1: Adicionar `CONSTRUTOR_AGENT_ID` ao enum `Constants`**

Localizar o bloco:
```ts
EPHEMERAL_AGENT_ID = 'ephemeral',
```
Adicionar logo após:
```ts
CONSTRUTOR_AGENT_ID = 'construtor-agente-iazzas',
```

**Nota:** `BUILDER_CHAT_INDEX` é definido como constante local (`const BUILDER_CHAT_INDEX = 3`) em `BuilderChatView.tsx` — não no enum, pois misturar values numéricos e string em um enum TypeScript gera problemas de inferência.

- [ ] **Step 2: Rebuild data-provider**

```bash
npm run build:data-provider
```
Expected: `packages/data-provider/dist/` atualizado sem erros.

- [ ] **Step 3: Commit**

```bash
git add packages/data-provider/src/config.ts packages/data-provider/dist/
git commit -m "feat(agentes-fase3): CONSTRUTOR_AGENT_ID constant"
```

---

## Task 2: Estender AgentDraftParams + registerFormSetValue + sync no AgentPanel

**Files:**
- Modify: `client/src/Providers/AgentDraftContext.tsx`
- Modify: `client/src/components/SidePanel/Agents/AgentPanel.tsx`

**Contexto:** `BuilderChatView` (painel direito) precisa atualizar o form de agente
(`AgentForm`) que pertence ao `AgentPanel` (painel esquerdo). A solução é registrar
o `setValue` do form no `AgentDraftContext`, que já é compartilhado entre os dois painéis.

- [ ] **Step 1: Atualizar `AgentDraftContext.tsx` — tipo, defaults e `registerFormSetValue`**

Substituir TODO o conteúdo de `client/src/Providers/AgentDraftContext.tsx`:

```tsx
import React, { createContext, useContext, useRef, useState } from 'react';

export type AgentDraftParams = {
  name: string;
  category: string;
  provider: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[];
  temperature?: number;
  top_p?: number;
};

type FormSetValue = (field: string, value: unknown, options?: object) => void;

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>;
  /** Called by AgentPanel on mount to register its react-hook-form setValue. */
  registerFormSetValue: (fn: FormSetValue) => void;
  /** Used by BuilderChatView to update AgentForm fields cross-panel. Null until AgentPanel mounts. */
  setFormValue: FormSetValue | null;
};

const defaultDraftParams: AgentDraftParams = {
  name: '',
  category: '',
  provider: '',
  model: '',
  instructions: '',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

const AgentDraftContext = createContext<AgentDraftContextValue | null>(null);

export function AgentDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftParams, setDraftParams] = useState<AgentDraftParams>(defaultDraftParams);
  const formSetValueRef = useRef<FormSetValue | null>(null);
  const [setFormValue, setSetFormValue] = useState<FormSetValue | null>(null);

  const registerFormSetValue = (fn: FormSetValue) => {
    formSetValueRef.current = fn;
    setSetFormValue(() => fn);
  };

  return (
    <AgentDraftContext.Provider value={{ draftParams, setDraftParams, registerFormSetValue, setFormValue }}>
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

- [ ] **Step 2: Atualizar `useWatch` e `setDraftParams` no AgentPanel**

Em `client/src/components/SidePanel/Agents/AgentPanel.tsx`, localizar o bloco `useWatch` (linha ~318).

**2a.** Substituir a lista de campos observados para incluir `'name'` e `'category'`:
```ts
const [
  watchedName,
  watchedCategory,
  watchedProvider,
  watchedModel,
  watchedInstructions,
  watchedTools,
  watchedWebSearch,
  watchedFileSearch,
  watchedExecuteCode,
] = useWatch({
  control,
  name: [
    'name',
    'category',
    'provider',
    'model',
    'instructions',
    'tools',
    AgentCapabilities.web_search,
    AgentCapabilities.file_search,
    AgentCapabilities.execute_code,
  ],
});
```

**2b.** No `useEffect` de setDraftParams, adicionar os dois novos campos:
```ts
setDraftParams({
  name: (watchedName as string | null) ?? '',
  category: (watchedCategory as string | null) ?? '',
  provider: providerValue,
  model: (watchedModel as string | null) ?? '',
  instructions: (watchedInstructions as string | null) ?? '',
  webSearch: Boolean(watchedWebSearch),
  fileSearch: Boolean(watchedFileSearch),
  executeCode: Boolean(watchedExecuteCode),
  mcpServers: extractMcpServerNames(watchedTools as string[] | undefined, mcpServersMap),
});
```

Adicionar `watchedName` e `watchedCategory` ao array de dependências do `useEffect`.

**2c.** Registrar `setValue` do form no contexto. Localizar a linha que desestrutura `useAgentDraftContext`:
```ts
const { setDraftParams } = useAgentDraftContext();
```
Substituir por:
```ts
const { setDraftParams, registerFormSetValue } = useAgentDraftContext();
```

Logo após, adicionar um `useEffect` de registro (sem dependências — executa uma vez no mount):
```ts
useEffect(() => {
  registerFormSetValue((field, value, options) => setValue(field as any, value, options));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

(O `setValue` aqui é o do `useFormContext<AgentForm>()` já disponível em `AgentPanel`.)

- [ ] **Step 3: Verificar TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | grep -E "AgentDraftContext|AgentPanel" | head -20
```
Expected: sem erros nessas linhas.

- [ ] **Step 4: Commit**

```bash
git add client/src/Providers/AgentDraftContext.tsx \
        client/src/components/SidePanel/Agents/AgentPanel.tsx
git commit -m "feat(agentes-fase3): AgentDraftParams estendido + registerFormSetValue para cross-panel setValue"
```

---

## Task 3: Backend tool stub `atualizar_rascunho`

**Files:**
- Modify: `packages/api/src/tools/registry/definitions.ts`
- Create: `packages/api/src/tools/construtor.ts`
- Modify: `packages/api/src/tools/index.ts`
- Modify: `api/app/clients/tools/util/handleTools.js`

- [ ] **Step 1: Adicionar schema ao registry**

Em `packages/api/src/tools/registry/definitions.ts`, antes de `export const toolDefinitions`, adicionar:

```ts
/** Schema for the atualizar_rascunho frontend-bridge tool */
export const atualizarRascunhoSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    name:         { type: 'string', description: 'Nome do agente.' },
    instructions: { type: 'string', description: 'Instruções do sistema do agente.' },
    provider:     { type: 'string', description: 'Endpoint/provider do agente.' },
    model:        { type: 'string', description: 'Modelo a usar.' },
    webSearch:    { type: 'boolean', description: 'Habilitar busca na web.' },
    fileSearch:   { type: 'boolean', description: 'Habilitar busca em arquivos.' },
    executeCode:  { type: 'boolean', description: 'Habilitar execução de código.' },
    mcpServers:   { type: 'array', items: { type: 'string' }, description: 'Servidores MCP habilitados.' },
    temperature:  { type: 'number', description: 'Temperatura do modelo (0–2).' },
    top_p:        { type: 'number', description: 'Top-p do modelo (0–1).' },
  },
  required: [],
};
```

Na constante `toolDefinitions`, adicionar a entry:
```ts
atualizar_rascunho: {
  name: 'atualizar_rascunho',
  description: 'Atualiza campos do agente em construção diretamente no formulário do usuário. Use sempre que quiser modificar nome, instrução, modelo, capacidades ou parâmetros avançados do agente.',
  schema: atualizarRascunhoSchema,
  toolType: 'builtin',
},
```

- [ ] **Step 2: Criar `packages/api/src/tools/construtor.ts`**

```ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const atualizarRascunhoInput = z.object({
  name:         z.string().optional(),
  instructions: z.string().optional(),
  provider:     z.string().optional(),
  model:        z.string().optional(),
  webSearch:    z.boolean().optional(),
  fileSearch:   z.boolean().optional(),
  executeCode:  z.boolean().optional(),
  mcpServers:   z.array(z.string()).optional(),
  temperature:  z.number().optional(),
  top_p:        z.number().optional(),
});

export function createAtualizarRascunhoTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'atualizar_rascunho',
    description:
      'Atualiza campos do agente em construção diretamente no formulário do usuário.',
    schema: atualizarRascunhoInput,
    func: async () => JSON.stringify({ aplicado: true }),
  });
}
```

- [ ] **Step 3: Exportar de `packages/api/src/tools/index.ts`**

Adicionar no final do arquivo:
```ts
export { createAtualizarRascunhoTool } from './construtor';
```

- [ ] **Step 4: Registrar em `handleTools.js`**

Em `api/app/clients/tools/util/handleTools.js`, localizar a linha que importa de `@librechat/api` (linha ~16):
```js
} = require('@librechat/api');
```

Adicionar `createAtualizarRascunhoTool` à desestruturação:
```js
  createAtualizarRascunhoTool,
} = require('@librechat/api');
```

Dentro de `customConstructors`, adicionar após `gemini_image_gen`:
```js
atualizar_rascunho: async () => createAtualizarRascunhoTool(),
```

- [ ] **Step 5: Build packages/api e verificar**

```bash
cd packages/api && npx tsc --noEmit 2>&1 | grep -E "construtor|atualizar" | head -10
```
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/tools/registry/definitions.ts \
        packages/api/src/tools/construtor.ts \
        packages/api/src/tools/index.ts \
        api/app/clients/tools/util/handleTools.js
git commit -m "feat(agentes-fase3): backend stub atualizar_rascunho tool"
```

---

## Task 4: `applyDraftUpdate` — utilitário de merge

**Files:**
- Create: `client/src/utils/applyDraftUpdate.ts`
- Create: `client/src/utils/__tests__/applyDraftUpdate.spec.ts`

- [ ] **Step 1: Escrever o teste**

Criar `client/src/utils/__tests__/applyDraftUpdate.spec.ts`:

```ts
import { AgentCapabilities } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { applyDraftUpdate, DRAFT_FORM_FIELD_MAP } from '../applyDraftUpdate';

describe('applyDraftUpdate', () => {
  const baseParams: AgentDraftParams = {
    name: 'Old Name',
    category: '',
    provider: 'openAI',
    model: 'gpt-4o',
    instructions: 'Old instructions',
    webSearch: false,
    fileSearch: false,
    executeCode: false,
    mcpServers: [],
  };

  it('merges partial args onto draftParams', () => {
    let captured: AgentDraftParams | null = null;
    const setDraftParams = jest.fn((fn: (prev: AgentDraftParams) => AgentDraftParams) => {
      captured = fn(baseParams);
    });
    const setFormValue = jest.fn();

    applyDraftUpdate({ name: 'New Name', webSearch: true }, setDraftParams, setFormValue);

    expect(captured).toMatchObject({ name: 'New Name', webSearch: true });
    expect(captured).toMatchObject({ model: 'gpt-4o' }); // unchanged
  });

  it('calls setFormValue for each known form field', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));
    const setFormValue = jest.fn();

    applyDraftUpdate(
      { name: 'X', instructions: 'Y', model: 'gpt-4', webSearch: true, fileSearch: false },
      setDraftParams,
      setFormValue,
    );

    expect(setFormValue).toHaveBeenCalledWith('name', 'X', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith('instructions', 'Y', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith('model', 'gpt-4', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith(AgentCapabilities.web_search, true, { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith(AgentCapabilities.file_search, false, { shouldDirty: true });
  });

  it('does not call setFormValue for unmapped fields (mcpServers, temperature, top_p)', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));
    const setFormValue = jest.fn();

    applyDraftUpdate({ mcpServers: ['server1'], temperature: 0.7 }, setDraftParams, setFormValue);

    expect(setFormValue).not.toHaveBeenCalled();
  });

  it('is a no-op for form updates when setFormValue is null', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));

    expect(() =>
      applyDraftUpdate({ name: 'X' }, setDraftParams, null),
    ).not.toThrow();
    expect(setDraftParams).toHaveBeenCalled();
  });

  it('ignores undefined values — does not override existing params', () => {
    let captured: AgentDraftParams | null = null;
    const setDraftParams = jest.fn((fn: any) => { captured = fn(baseParams); });

    applyDraftUpdate({ name: 'New', instructions: undefined }, setDraftParams, null);

    expect(captured?.instructions).toBe('Old instructions');
  });

  it('exports DRAFT_FORM_FIELD_MAP with expected keys', () => {
    expect(Object.keys(DRAFT_FORM_FIELD_MAP)).toEqual(
      expect.arrayContaining(['name', 'instructions', 'category', 'model', 'webSearch', 'fileSearch', 'executeCode']),
    );
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

```bash
cd client && npx jest --testPathPattern="applyDraftUpdate" --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `Cannot find module '../applyDraftUpdate'`

- [ ] **Step 3: Implementar `applyDraftUpdate`**

Criar `client/src/utils/applyDraftUpdate.ts`:

```ts
import { AgentCapabilities } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

type FormSetValue = ((field: string, value: unknown, options?: object) => void) | null;

/**
 * Maps AgentDraftParams keys to their corresponding AgentForm field names.
 * Fields absent here (mcpServers, temperature, top_p, provider) are updated
 * in context only — they require special handling not available in a pure function.
 */
export const DRAFT_FORM_FIELD_MAP: Partial<Record<keyof AgentDraftParams, string>> = {
  name:         'name',
  category:     'category',
  instructions: 'instructions',
  model:        'model',
  webSearch:    AgentCapabilities.web_search,
  fileSearch:   AgentCapabilities.file_search,
  executeCode:  AgentCapabilities.execute_code,
};

export function applyDraftUpdate(
  args: Partial<AgentDraftParams>,
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setFormValue: FormSetValue,
): void {
  setDraftParams((prev) => {
    const next = { ...prev };
    for (const [key, value] of Object.entries(args) as [keyof AgentDraftParams, unknown][]) {
      if (value !== undefined) {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    return next;
  });

  if (!setFormValue) return;

  for (const [draftKey, formField] of Object.entries(DRAFT_FORM_FIELD_MAP)) {
    const value = args[draftKey as keyof AgentDraftParams];
    if (value !== undefined && formField !== undefined) {
      setFormValue(formField, value, { shouldDirty: true });
    }
  }
}
```

- [ ] **Step 4: Rodar o teste para confirmar aprovação**

```bash
cd client && npx jest --testPathPattern="applyDraftUpdate" --no-coverage 2>&1 | tail -20
```
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/applyDraftUpdate.ts \
        client/src/utils/__tests__/applyDraftUpdate.spec.ts
git commit -m "feat(agentes-fase3): applyDraftUpdate — merge parcial de args no draft + form"
```

---

## Task 5: `useBuilderToolInterceptor` hook

**Files:**
- Create: `client/src/hooks/Agentes/useBuilderToolInterceptor.ts`
- Create: `client/src/hooks/Agentes/__tests__/useBuilderToolInterceptor.spec.ts`

- [ ] **Step 1: Criar diretório e escrever o teste**

```bash
mkdir -p client/src/hooks/Agentes/__tests__
```

Criar `client/src/hooks/Agentes/__tests__/useBuilderToolInterceptor.spec.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { ContentTypes, ToolCallTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { useBuilderToolInterceptor } from '../useBuilderToolInterceptor';

function makeMessage(toolName: string, args: object, hasOutput: boolean): TMessage {
  return {
    messageId: '1',
    conversationId: 'c1',
    parentMessageId: '0',
    role: 'assistant',
    text: '',
    content: [
      {
        type: ContentTypes.TOOL_CALL,
        tool_call: {
          type: ToolCallTypes.TOOL_CALL,
          name: toolName,
          args: JSON.stringify(args),
          output: hasOutput ? JSON.stringify({ aplicado: true }) : undefined,
        },
      },
    ],
  } as unknown as TMessage;
}

describe('useBuilderToolInterceptor', () => {
  it('calls applyDraftUpdate when atualizar_rascunho has output', () => {
    const setDraftParams = jest.fn();
    const setFormValue = jest.fn();
    const messages = [makeMessage('atualizar_rascunho', { name: 'Bot X' }, true)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, setFormValue),
    );

    expect(setDraftParams).toHaveBeenCalled();
  });

  it('ignores tool calls from other tools', () => {
    const setDraftParams = jest.fn();
    const messages = [makeMessage('web_search', { query: 'test' }, true)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });

  it('ignores atualizar_rascunho without output (still streaming)', () => {
    const setDraftParams = jest.fn();
    const messages = [makeMessage('atualizar_rascunho', { name: 'Bot X' }, false)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });

  it('does nothing with empty messages', () => {
    const setDraftParams = jest.fn();

    renderHook(() =>
      useBuilderToolInterceptor([], setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd client && npx jest --testPathPattern="useBuilderToolInterceptor" --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `Cannot find module '../useBuilderToolInterceptor'`

- [ ] **Step 3: Implementar o hook**

Criar `client/src/hooks/Agentes/useBuilderToolInterceptor.ts`:

```ts
import { useEffect } from 'react';
import { ContentTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { applyDraftUpdate } from '~/utils/applyDraftUpdate';

type FormSetValue = ((field: string, value: unknown, options?: object) => void) | null;

const TOOL_NAME = 'atualizar_rascunho';

export function useBuilderToolInterceptor(
  messages: TMessage[],
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setFormValue: FormSetValue,
): void {
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.content) return;
    for (const part of last.content) {
      if (
        part.type === ContentTypes.TOOL_CALL &&
        part.tool_call?.name === TOOL_NAME &&
        part.tool_call.output != null
      ) {
        const args = (() => {
          try {
            return JSON.parse((part.tool_call.args as string) ?? '{}');
          } catch {
            return {};
          }
        })();
        applyDraftUpdate(args, setDraftParams, setFormValue);
      }
    }
  }, [messages, setDraftParams, setFormValue]);
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
cd client && npx jest --testPathPattern="useBuilderToolInterceptor" --no-coverage 2>&1 | tail -20
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/Agentes/useBuilderToolInterceptor.ts \
        client/src/hooks/Agentes/__tests__/useBuilderToolInterceptor.spec.ts
git commit -m "feat(agentes-fase3): useBuilderToolInterceptor — SSE tool call detection"
```

---

## Task 6: i18n — novas chaves

**Files:**
- Modify: `client/src/locales/en/translation.json`

- [ ] **Step 1: Adicionar as 3 novas chaves**

Encontrar uma seção `com_ui_ux_*` no arquivo (ex: próximo de `com_ui_ux_rascunho_efemero`) e adicionar:

```json
"com_ui_ux_construir_ativo": "🛠 Build",
"com_ui_ux_construir_contexto": "[Current draft]:",
"com_ui_ux_construir_placeholder": "Describe what this agent should do..."
```

- [ ] **Step 2: Verificar que o arquivo é JSON válido**

```bash
node -e "require('./client/src/locales/en/translation.json'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add client/src/locales/en/translation.json
git commit -m "feat(agentes-fase3): i18n keys para aba Construir"
```

---

## Task 7: `BuilderChatView` — componente

**Files:**
- Create: `client/src/components/Agentes/BuilderChatView.tsx`
- Create: `client/src/components/Agentes/__tests__/BuilderChatView.spec.tsx`

- [ ] **Step 1: Escrever o teste**

Criar `client/src/components/Agentes/__tests__/BuilderChatView.spec.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('../PreviewChatView', () => ({ __esModule: true, default: () => null }));
jest.mock('~/Providers', () => ({
  ChatContext: { Provider: ({ children }: any) => children },
  AddedChatContext: { Provider: ({ children }: any) => children },
  ChatFormProvider: ({ children }: any) => children,
  useFileMapContext: () => ({}),
}));
jest.mock('~/hooks/Chat/useChatHelpers', () => ({
  __esModule: true,
  default: () => ({
    conversation: null,
    setConversation: jest.fn(),
  }),
}));
jest.mock('~/hooks/Chat/useAddedResponse', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('~/hooks/SSE/useAdaptiveSSE', () => ({ __esModule: true, default: () => {} }));
jest.mock('~/data-provider', () => ({ useGetMessagesByConvoId: () => ({ data: null }) }));
jest.mock('~/store', () => ({ submissionByIndex: () => () => null }));
jest.mock('~/hooks/Agentes/useBuilderToolInterceptor', () => ({
  useBuilderToolInterceptor: jest.fn(),
}));
jest.mock('~/components/Chat/Messages/MessagesView', () => ({
  __esModule: true,
  default: () => <div data-testid="messages-view" />,
}));
jest.mock('~/components/Chat/Input/ChatForm', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-form" />,
}));

import BuilderChatView from '../BuilderChatView';

const defaultDraft: AgentDraftParams = {
  name: 'Test', category: '', provider: 'openAI', model: 'gpt-4o',
  instructions: 'Be helpful', webSearch: false, fileSearch: false,
  executeCode: false, mcpServers: [],
};

describe('BuilderChatView', () => {
  it('renders without conversationId', () => {
    render(
      <BuilderChatView
        conversationId={null}
        draftParams={defaultDraft}
        onConversationCreated={jest.fn()}
      />,
    );
    expect(screen.getByTestId('chat-form')).toBeInTheDocument();
  });

  it('renders with existing conversationId', () => {
    render(
      <BuilderChatView
        conversationId="existing-convo-123"
        draftParams={defaultDraft}
        onConversationCreated={jest.fn()}
      />,
    );
    expect(screen.getByTestId('chat-form')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

```bash
cd client && npx jest --testPathPattern="BuilderChatView" --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `Cannot find module '../BuilderChatView'`

- [ ] **Step 3: Implementar `BuilderChatView`**

Criar `client/src/components/Agentes/BuilderChatView.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useForm } from 'react-hook-form';
import { Constants, buildTree } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ChatFormValues } from '~/common';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { ChatContext, AddedChatContext, ChatFormProvider, useFileMapContext } from '~/Providers';
import useChatHelpers from '~/hooks/Chat/useChatHelpers';
import useAddedResponse from '~/hooks/Chat/useAddedResponse';
import useAdaptiveSSE from '~/hooks/SSE/useAdaptiveSSE';
import { useBuilderToolInterceptor } from '~/hooks/Agentes/useBuilderToolInterceptor';
import { useGetMessagesByConvoId } from '~/data-provider';
import { useAgentDraftContext } from '~/Providers/AgentDraftContext';
import MessagesView from '~/components/Chat/Messages/MessagesView';
import ChatForm from '~/components/Chat/Input/ChatForm';
import store from '~/store';

// Isolated Recoil slot: 0=main, 2=preview, 3=builder
const BUILDER_CHAT_INDEX = 3;

interface BuilderChatViewProps {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
}

export default function BuilderChatView({
  conversationId,
  draftParams,
  onConversationCreated,
}: BuilderChatViewProps) {
  const [activeConvoId, setActiveConvoId] = useState(conversationId ?? Constants.NEW_CONVO);

  const methods = useForm<ChatFormValues>({ defaultValues: { text: '' } });
  const fileMap = useFileMapContext();
  const { setDraftParams, setFormValue } = useAgentDraftContext();

  const rootSubmission = useRecoilValue(store.submissionByIndex(BUILDER_CHAT_INDEX));

  const chatHelpers = useChatHelpers(BUILDER_CHAT_INDEX, activeConvoId);
  const addedChatHelpers = useAddedResponse();

  const { setConversation } = chatHelpers;

  useEffect(() => {
    setConversation((prev) => {
      const base = prev ?? null;
      return {
        ...base,
        conversationId: base?.conversationId ?? activeConvoId,
        title: base?.title ?? '',
        createdAt: base?.createdAt ?? '',
        updatedAt: base?.updatedAt ?? '',
        endpoint: base?.endpoint ?? null,
        agent_id: Constants.CONSTRUTOR_AGENT_ID,
        // Inject current draft state so the agent always has fresh context
        promptPrefix: `[Rascunho atual]:\n${JSON.stringify(draftParams)}`,
      } as Parameters<typeof setConversation>[0] extends (c: infer C) => unknown ? C : never;
    });
  }, [activeConvoId, draftParams, setConversation]);

  const recoilConvoId = chatHelpers.conversation?.conversationId;
  useEffect(() => {
    if (recoilConvoId && recoilConvoId !== Constants.NEW_CONVO && recoilConvoId !== activeConvoId) {
      setActiveConvoId(recoilConvoId);
      onConversationCreated(recoilConvoId);
    }
  }, [recoilConvoId, activeConvoId, onConversationCreated]);

  useAdaptiveSSE(rootSubmission, chatHelpers, false, BUILDER_CHAT_INDEX);

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

  const messages = chatHelpers.messages ?? [];
  useBuilderToolInterceptor(messages, setDraftParams, setFormValue);

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <div className="flex h-full flex-col">
            <div className="relative flex-1 overflow-hidden overflow-y-auto">
              {messagesTree != null ? (
                <MessagesView messagesTree={messagesTree} />
              ) : (
                <div className="flex h-full items-center justify-center" />
              )}
            </div>
            <ChatForm index={BUILDER_CHAT_INDEX} />
          </div>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}
```

- [ ] **Step 4: Rodar o teste para confirmar aprovação**

```bash
cd client && npx jest --testPathPattern="BuilderChatView" --no-coverage 2>&1 | tail -20
```
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Verificar TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | grep "BuilderChatView" | head -10
```
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Agentes/BuilderChatView.tsx \
        client/src/components/Agentes/__tests__/BuilderChatView.spec.tsx
git commit -m "feat(agentes-fase3): BuilderChatView — chat com CONSTRUTOR_AGENT_ID + tool interception"
```

---

## Task 8: Atualizar `TestPanel` — tab switching

**Files:**
- Modify: `client/src/components/Agentes/TestPanel.tsx`
- Modify: `client/src/components/Agentes/__tests__/TestPanel.spec.tsx`

- [ ] **Step 1: Atualizar os testes existentes**

Substituir o conteúdo de `client/src/components/Agentes/__tests__/TestPanel.spec.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('../PreviewChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-chat" />,
}));

jest.mock('../BuilderChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="builder-chat" />,
}));

import { AgentDraftProvider } from '~/Providers/AgentDraftContext';
import TestPanel from '../TestPanel';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AgentDraftProvider>{children}</AgentDraftProvider>;
}

describe('TestPanel', () => {
  it('renders the "Testar" tab as active by default', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_testar_rascunho')).toBeInTheDocument();
  });

  it('renders the "Construir" tab as clickable (no disabled, no badge)', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    const construirTab = screen.getByText('com_ui_ux_construir_agente');
    expect(construirTab).toBeInTheDocument();
    expect(screen.queryByText('com_ui_ux_fase3_badge')).not.toBeInTheDocument();
  });

  it('shows PreviewChatView when "Testar" is active', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByTestId('preview-chat')).toBeInTheDocument();
    expect(screen.queryByTestId('builder-chat')).not.toBeInTheDocument();
  });

  it('switches to BuilderChatView when "Construir" tab is clicked', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('com_ui_ux_construir_agente'));
    expect(screen.getByTestId('builder-chat')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-chat')).not.toBeInTheDocument();
  });

  it('shows ephemeral badge only on Testar tab', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_rascunho_efemero')).toBeInTheDocument();

    fireEvent.click(screen.getByText('com_ui_ux_construir_agente'));
    expect(screen.queryByText('com_ui_ux_rascunho_efemero')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar falha**

```bash
cd client && npx jest --testPathPattern="TestPanel" --no-coverage 2>&1 | tail -20
```
Expected: FAIL — vários testes falham (tab ainda não é clicável, badge ainda presente).

- [ ] **Step 3: Implementar o novo `TestPanel`**

Substituir o conteúdo de `client/src/components/Agentes/TestPanel.tsx`:

```tsx
import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useAgentDraftContext } from '~/Providers';
import PreviewChatView from './PreviewChatView';
import BuilderChatView from './BuilderChatView';

type ActiveTab = 'testar' | 'construir';

export default function TestPanel() {
  const localize = useLocalize();
  const { draftParams } = useAgentDraftContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('testar');
  const [previewConvoId, setPreviewConvoId] = useState<string | null>(null);
  const [builderConvoId, setBuilderConvoId] = useState<string | null>(null);

  const tabBase = 'cursor-pointer px-3 py-2 text-sm transition-colors';
  const activeStyle = 'border-b-2 border-green-500 font-semibold text-green-600';
  const inactiveStyle = 'text-text-secondary hover:text-text-primary';

  return (
    <div className="flex h-full flex-col border-l border-border-medium">
      {/* Tab bar */}
      <div className="flex border-b border-border-medium px-1">
        <button
          type="button"
          className={`${tabBase} ${activeTab === 'testar' ? activeStyle : inactiveStyle}`}
          onClick={() => setActiveTab('testar')}
        >
          {localize('com_ui_ux_testar_rascunho')}
        </button>
        <button
          type="button"
          className={`${tabBase} ${activeTab === 'construir' ? activeStyle : inactiveStyle}`}
          onClick={() => setActiveTab('construir')}
        >
          {localize('com_ui_ux_construir_agente')}
        </button>
      </div>

      {/* Ephemeral badge — only for Testar tab */}
      {activeTab === 'testar' && (
        <div className="flex justify-center py-1.5">
          <span className="rounded-full border border-yellow-400 bg-yellow-50 px-3 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            {localize('com_ui_ux_rascunho_efemero')}
          </span>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'testar' && (
          <PreviewChatView
            conversationId={previewConvoId}
            draftParams={draftParams}
            onConversationCreated={setPreviewConvoId}
          />
        )}
        {activeTab === 'construir' && (
          <BuilderChatView
            conversationId={builderConvoId}
            draftParams={draftParams}
            onConversationCreated={setBuilderConvoId}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar os testes para confirmar aprovação**

```bash
cd client && npx jest --testPathPattern="TestPanel" --no-coverage 2>&1 | tail -20
```
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Rodar a suite completa de Agentes**

```bash
cd client && npx jest --testPathPattern="Agentes|AgentDraft|DragHandle|AgentesLayout|AgentesView|BuilderChatView|useBuilderToolInterceptor|applyDraftUpdate" --no-coverage 2>&1 | tail -30
```
Expected: todos os testes passando, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Agentes/TestPanel.tsx \
        client/src/components/Agentes/__tests__/TestPanel.spec.tsx
git commit -m "feat(agentes-fase3): TestPanel — tab switching Testar↔Construir com histórico isolado"
```

---

## Task 9: Barrel exports + verificação final

**Files:**
- Modify: `client/src/components/Agentes/index.ts`

- [ ] **Step 1: Adicionar `BuilderChatView` ao barrel**

Em `client/src/components/Agentes/index.ts`, adicionar:
```ts
export { default as BuilderChatView } from './BuilderChatView';
```

- [ ] **Step 2: TypeScript check completo**

```bash
cd client && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```
Expected: sem novos erros introduzidos por esta feature.

- [ ] **Step 3: ESLint**

```bash
cd client && npx eslint src/components/Agentes/ src/hooks/Agentes/ src/utils/applyDraftUpdate.ts --fix 2>&1 | tail -20
```
Expected: sem erros após auto-fix.

- [ ] **Step 4: Suite completa de Agentes**

```bash
cd client && npx jest --testPathPattern="Agentes|DragHandle|BuilderChatView|useBuilderToolInterceptor|applyDraftUpdate" --no-coverage 2>&1 | tail -10
```
Expected: todos os testes passando.

- [ ] **Step 5: Commit final**

```bash
git add client/src/components/Agentes/index.ts
git commit -m "feat(agentes-fase3): barrel export BuilderChatView + lint/ts clean"
```

---

## Resumo de Commits Esperados

| # | Mensagem |
|---|---|
| 1 | `feat(agentes-fase3): CONSTRUTOR_AGENT_ID + BUILDER_CHAT_INDEX constants` |
| 2 | `feat(agentes-fase3): estende AgentDraftParams com name/category/temperature/top_p` |
| 3 | `feat(agentes-fase3): backend stub atualizar_rascunho tool` |
| 4 | `feat(agentes-fase3): applyDraftUpdate — merge parcial de args no draft + form` |
| 5 | `feat(agentes-fase3): useBuilderToolInterceptor — SSE tool call detection` |
| 6 | `feat(agentes-fase3): i18n keys para aba Construir` |
| 7 | `feat(agentes-fase3): BuilderChatView — chat com CONSTRUTOR_AGENT_ID + tool interception` |
| 8 | `feat(agentes-fase3): TestPanel — tab switching Testar↔Construir com histórico isolado` |
| 9 | `feat(agentes-fase3): barrel export BuilderChatView + lint/ts clean` |
