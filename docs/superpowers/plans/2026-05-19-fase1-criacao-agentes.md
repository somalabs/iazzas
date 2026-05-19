# Fase 1 — Tela própria de agentes + rename `/d/flows` + form enxuto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear `/d/agent-studio`→`/d/flows`, dar à criação de agentes uma tela própria em `/d/agentes`, e enxugar o formulário com progressive disclosure — sem mudar o payload de criação.

**Architecture:** Mudanças só de roteamento, navegação e UI no `/client`. O builder existente (`AgentPanelSwitch`) sai da coluna de 360px dentro do `AgentStudioView` e passa a renderizar numa rota própria. O `AgentConfig` é reorganizado: essencial na primeira dobra, técnico dentro de um `AdvancedSection` colapsável. Um helper puro garante provider/model default para um agente ser criável sem abrir "Avançado".

**Tech Stack:** React 18, react-router v6, react-hook-form, Recoil, React Query, Jest + @testing-library/react (config em `client/jest.config.cjs`, rodar de `client/`), lucide-react, Tailwind tokens.

**Restrições do projeto (valem para todas as tasks):**
- `client/vite.config.ts` **NUNCA** entra em commit (tweak local do dev).
- i18n: só editar chaves EN em `client/src/locales/en/translation.json`; o fork guarda o texto PT-BR como valor da chave EN. CI "Detect Unused i18next Strings" falha com chave não usada — toda chave nova é consumida na mesma task.
- ESLint/Prettier devem ficar limpos. Footgun do hook RTK: nunca `eslint --fix` sem caminho explícito; usar `rtk proxy npx eslint --config eslint.config.mjs --fix <caminho único>`.
- Commits com paths explícitos (`git add <arquivo> ...`), nunca `git add -A`.

---

### Task 1: Renomear rota e href `/d/agent-studio` → `/d/flows`

**Files:**
- Test: `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx` (criar)
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts:32`
- Modify: `client/src/routes/Dashboard.tsx:93`

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import useUnifiedSidebarLinks from '../useUnifiedSidebarLinks';

describe('useUnifiedSidebarLinks', () => {
  it('aponta o item Flows para /d/flows (não /d/agent-studio)', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const flows = result.current.find((l) => l.id === 'nav-flows');
    expect(flows?.href).toBe('/d/flows');
    expect(result.current.some((l) => l.href === '/d/agent-studio')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd client && npx jest src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: FAIL — `expect(flows?.href).toBe('/d/flows')` recebe `'/d/agent-studio'`.

- [ ] **Step 3: Editar o href do menu**

Em `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`, na entrada `nav-flows` (linha 32), trocar:

```ts
        href: '/d/agent-studio',
```
por:
```ts
        href: '/d/flows',
```

- [ ] **Step 4: Editar o path da rota**

Em `client/src/routes/Dashboard.tsx` (linha 93), trocar:

```tsx
      path: 'agent-studio',
```
por:
```tsx
      path: 'flows',
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd client && npx jest src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: PASS.

- [ ] **Step 6: Guard — nenhuma referência remanescente**

Run: `grep -rn "agent-studio" client/src --include="*.ts" --include="*.tsx"`
Expected: nenhuma saída (string totalmente removida do código-fonte).

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/Nav/useUnifiedSidebarLinks.ts client/src/routes/Dashboard.tsx client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx
git commit -m "refactor(nav): renomeia rota /d/agent-studio -> /d/flows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Item "Agentes" no menu + rota `/d/agentes` com o builder em tela própria

A chave `com_ui_ux_nav_agentes` ("Agentes") já existe em `translation.json`. Falta a descrição do rail e a tela.

**Files:**
- Modify: `client/src/locales/en/translation.json` (adicionar 1 chave)
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` (import lucide + nova entrada)
- Modify: `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx` (novo caso)
- Create: `client/src/components/Agentes/AgentesView.tsx`
- Create: `client/src/components/Agentes/index.ts`
- Modify: `client/src/routes/Dashboard.tsx` (import + rota)

- [ ] **Step 1: Escrever o teste que falha (nova entrada de nav)**

Em `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`, adicionar dentro do `describe`:

```tsx
  it('inclui o item Agentes apontando para /d/agentes, antes de Flows', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const links = result.current;
    const agentes = links.find((l) => l.id === 'nav-agentes');
    expect(agentes?.href).toBe('/d/agentes');
    expect(agentes?.title).toBe('com_ui_ux_nav_agentes');
    const idxAgentes = links.findIndex((l) => l.id === 'nav-agentes');
    const idxFlows = links.findIndex((l) => l.id === 'nav-flows');
    expect(idxAgentes).toBeGreaterThanOrEqual(0);
    expect(idxAgentes).toBeLessThan(idxFlows);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd client && npx jest src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: FAIL — `agentes` é `undefined`.

- [ ] **Step 3: Adicionar a chave de descrição do rail**

Em `client/src/locales/en/translation.json`, logo após a linha `"com_ui_ux_rail_admin_desc": "Gestão da plataforma",` adicionar:

```json
  "com_ui_ux_rail_agentes_desc": "Criar, testar e gerenciar seus agentes",
```

- [ ] **Step 4: Adicionar a entrada de nav**

Em `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`, trocar a linha de import:

```ts
import { Image, GitFork, CalendarClock, ShieldCheck, MessageSquare } from 'lucide-react';
```
por:
```ts
import { Image, Bot, GitFork, CalendarClock, ShieldCheck, MessageSquare } from 'lucide-react';
```

E inserir, **imediatamente antes** do objeto `nav-flows` (o que tem `title: 'com_ui_ux_nav_flows'`):

```ts
      {
        title: 'com_ui_ux_nav_agentes',
        description: 'com_ui_ux_rail_agentes_desc',
        icon: Bot,
        id: 'nav-agentes',
        href: '/d/agentes',
      },
```

- [ ] **Step 5: Criar a tela `AgentesView`**

Criar `client/src/components/Agentes/AgentesView.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess } from '~/hooks';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';

export default function AgentesView() {
  const navigate = useNavigate();
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });

  useEffect(() => {
    if (!hasAccess) {
      const id = setTimeout(() => navigate('/c/new'), 1000);
      return () => clearTimeout(id);
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-primary">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <AgentPanelSwitch />
      </div>
    </div>
  );
}
```

Criar `client/src/components/Agentes/index.ts`:

```ts
export { default as AgentesView } from './AgentesView';
```

- [ ] **Step 6: Registrar a rota**

Em `client/src/routes/Dashboard.tsx`, adicionar o import junto aos outros imports de telas (após a linha `import { AgentStudioView } from '~/components/AgentStudio';`):

```tsx
import { AgentesView } from '~/components/Agentes';
```

E adicionar a rota nas `children`, logo após o bloco `{ path: 'flows', element: <AgentStudioView /> }`:

```tsx
    {
      path: 'agentes',
      element: <AgentesView />,
    },
```

- [ ] **Step 7: Rodar o teste e ver passar**

Run: `cd client && npx jest src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: PASS (todos os casos).

- [ ] **Step 8: Lint dos arquivos tocados**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts client/src/hooks/Nav/useUnifiedSidebarLinks.ts`
Se houver erro auto-corrigível: `rtk proxy npx eslint --config client/eslint.config.mjs --fix <caminho único>` e re-rodar.
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add client/src/locales/en/translation.json client/src/hooks/Nav/useUnifiedSidebarLinks.ts client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts client/src/routes/Dashboard.tsx
git commit -m "feat(agentes): tela própria /d/agentes + item de menu Agentes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `/d/flows` vira só o canvas (remover a coluna do builder)

**Files:**
- Modify: `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`

- [ ] **Step 1: Remover import do builder**

Em `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`, remover a linha:

```tsx
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
```

- [ ] **Step 2: Remover a coluna de 360px do layout**

Substituir o corpo da função `StudioLayout` por:

```tsx
function StudioLayout() {
  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Palette />
        <main className="relative flex-1 overflow-hidden" aria-label="Canvas do flow de agentes">
          <Canvas />
        </main>
        <Inspector />
        <RunsDrawer />
      </div>
      <RunModal />
    </div>
  );
}
```

- [ ] **Step 3: Guard — builder não é mais importado aqui**

Run: `grep -n "AgentPanelSwitch" client/src/components/AgentStudio/layouts/AgentStudioView.tsx`
Expected: nenhuma saída.

- [ ] **Step 4: Lint**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/AgentStudio/layouts/AgentStudioView.tsx`
Expected: sem erros.

- [ ] **Step 5: Verificação visual (Playwright)**

O componente é provider-heavy (FlowProvider/ReactFlowProvider/xyflow) — não há teste Jest unitário viável; valida-se ao vivo, como o resto desta sessão. Com backend rodando e sessão autenticada, criar `/tmp/probe-flows.mjs`:

```js
import pw from '/Users/arturlemos/Documents/Projetos/iazzas/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch();
const ctx = await b.newContext();
// (reusar o seeding de sessão via API já usado nesta sessão antes de navegar)
const p = await ctx.newPage();
await p.goto('http://localhost:3080/d/flows');
await p.waitForTimeout(2500);
const hasForm = await p.locator('form[aria-label="Agent configuration form"]').count();
const hasCanvas = await p.locator('main[aria-label="Canvas do flow de agentes"]').count();
console.log('builder form em /d/flows =', hasForm, '(esperado 0)');
console.log('canvas em /d/flows =', hasCanvas, '(esperado 1)');
await p.screenshot({ path: '/tmp/uxui-shots/flows-canvas-only.png' });
await b.close();
```
Run: `node /tmp/probe-flows.mjs`
Expected: `builder form = 0`, `canvas = 1`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/AgentStudio/layouts/AgentStudioView.tsx
git commit -m "refactor(flows): /d/flows passa a renderizar só o canvas (builder saiu p/ /d/agentes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Componente `AdvancedSection` (disclosure colapsável) — TDD

**Files:**
- Test: `client/src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx` (criar)
- Create: `client/src/components/SidePanel/Agents/AdvancedSection.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedSection from '../AdvancedSection';

describe('AdvancedSection', () => {
  it('esconde os filhos até o toggle ser clicado', () => {
    render(
      <AdvancedSection label="Ajustes avançados">
        <p>conteudo tecnico</p>
      </AdvancedSection>,
    );
    const toggle = screen.getByRole('button', { name: /Ajustes avançados/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('conteudo tecnico')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('conteudo tecnico')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd client && npx jest src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx`
Expected: FAIL — módulo `../AdvancedSection` não existe.

- [ ] **Step 3: Implementar o componente**

Criar `client/src/components/SidePanel/Agents/AdvancedSection.tsx`:

```tsx
import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

function AdvancedSection({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-lg border border-border-light">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary"
      >
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
        {label}
      </button>
      {open && <div className="border-t border-border-light px-3 pt-3">{children}</div>}
    </div>
  );
}

export default memo(AdvancedSection);
```

Adicionar `import { cn } from '~/utils';` respeitando a ordem de imports do projeto (imports de pacote primeiro: `react`, `lucide-react`; depois `import type`; depois locais). Resultado dos imports:

```tsx
import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '~/utils';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd client && npx jest src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/SidePanel/Agents/AdvancedSection.tsx`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SidePanel/Agents/AdvancedSection.tsx client/src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx
git commit -m "feat(agentes): componente AdvancedSection (disclosure colapsável acessível)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Reorganizar `AgentConfig` — essencial visível, técnico em "Ajustes avançados"

Sem mudança de payload: os mesmos `Controller`/campos, só reordenados e com a parte técnica dentro de `<AdvancedSection>`. Primeira dobra: Avatar+Nome, "O que esse agente faz?" (Instructions), Categoria, "O que ele pode fazer" (capacidades). Dentro do avançado: Descrição, Agent ID, Modelo/Provider, MCP, Ferramentas & Ações, Contato de suporte.

**Files:**
- Modify: `client/src/locales/en/translation.json` (4 chaves novas)
- Modify: `client/src/components/SidePanel/Agents/Instructions.tsx` (relabel)
- Modify: `client/src/components/SidePanel/Agents/AgentConfig.tsx` (reorg)

- [ ] **Step 1: Adicionar as chaves de cópia**

Em `client/src/locales/en/translation.json`, logo após a linha `"com_ui_ux_rail_agentes_desc": ...` (criada na Task 2) adicionar:

```json
  "com_ui_ux_agent_o_que_faz": "O que esse agente faz?",
  "com_ui_ux_agent_o_que_faz_ph": "Descreva em linguagem natural: o que ele deve fazer, como responder e o que evitar.",
  "com_ui_ux_agent_capacidades": "O que ele pode fazer",
  "com_ui_ux_agent_avancado": "Ajustes avançados",
```

- [ ] **Step 2: Relabel das Instruções**

Em `client/src/components/SidePanel/Agents/Instructions.tsx`:

Trocar o label (linha ~51):
```tsx
          {localize('com_ui_instructions')}
```
por:
```tsx
          {localize('com_ui_ux_agent_o_que_faz')}
```

Trocar o placeholder (linha ~90):
```tsx
              placeholder={localize('com_agents_instructions_placeholder')}
```
por:
```tsx
              placeholder={localize('com_ui_ux_agent_o_que_faz_ph')}
```

- [ ] **Step 3: Importar `AdvancedSection` no `AgentConfig`**

Em `client/src/components/SidePanel/Agents/AgentConfig.tsx`, adicionar entre os imports locais (perto de `import Instructions from './Instructions';`):

```tsx
import AdvancedSection from './AdvancedSection';
```

- [ ] **Step 4: Reordenar o corpo do `return`**

Substituir TODO o bloco `<div className="h-auto pt-1"> ... </div>` (linhas ~183 a ~490, do comentário `{/* Avatar & Name */}` até o fechamento da Support Contact) por exatamente:

```tsx
      <div className="h-auto pt-1">
        {/* Avatar & Name */}
        <div className="mb-4">
          <AgentAvatar avatar={agent?.['avatar'] ?? null} />
          <label className={labelClass} htmlFor="name">
            {localize('com_ui_name')}
            <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            rules={{ required: localize('com_ui_agent_name_is_required') }}
            control={control}
            render={({ field }) => (
              <>
                <input
                  {...field}
                  value={field.value ?? ''}
                  maxLength={256}
                  className={inputClass}
                  id="name"
                  type="text"
                  placeholder={localize('com_agents_name_placeholder')}
                  aria-label="Agent name"
                />
                <div
                  className={cn(
                    'mt-1 w-56 text-sm text-red-500',
                    errors.name ? 'visible h-auto' : 'invisible h-0',
                  )}
                  role="alert"
                >
                  {errors.name ? errors.name.message : ' '}
                </div>
              </>
            )}
          />
        </div>
        {/* Instructions */}
        <Instructions />
        {/* Category */}
        <div className="mb-4">
          <label className={labelClass} htmlFor="category-selector">
            {localize('com_ui_category')} <span className="text-red-500">*</span>
          </label>
          <AgentCategorySelector className="w-full" />
        </div>
        {(codeEnabled ||
          fileSearchEnabled ||
          artifactsEnabled ||
          contextEnabled ||
          webSearchEnabled) && (
          <div className="mb-4 flex w-full flex-col items-start gap-3">
            <label className="text-token-text-primary block text-sm font-medium">
              {localize('com_ui_ux_agent_capacidades')}
            </label>
            {/* Code Execution */}
            {codeEnabled && <CodeForm agent_id={agent_id} files={code_files} />}
            {/* Web Search */}
            {webSearchEnabled && <SearchForm />}
            {/* File Context */}
            {contextEnabled && <FileContext agent_id={agent_id} files={context_files} />}
            {/* Artifacts */}
            {artifactsEnabled && <Artifacts />}
            {/* File Search */}
            {fileSearchEnabled && <FileSearch agent_id={agent_id} files={knowledge_files} />}
          </div>
        )}
        <AdvancedSection label={localize('com_ui_ux_agent_avancado')}>
          {/* Description */}
          <div className="mb-4">
            <label className={labelClass} htmlFor="description">
              {localize('com_ui_description')}
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  maxLength={512}
                  className={inputClass}
                  id="description"
                  type="text"
                  placeholder={localize('com_agents_description_placeholder')}
                  aria-label="Agent description"
                />
              )}
            />
          </div>
          {/* Agent ID */}
          <div className="mb-4">
            <Controller
              name="id"
              control={control}
              render={({ field }) => (
                <p className="h-3 text-xs italic text-text-secondary" aria-live="polite">
                  {field.value}
                </p>
              )}
            />
          </div>
          {/* Model and Provider */}
          <div className="mb-4">
            <label className={labelClass} htmlFor="provider">
              {localize('com_ui_model')} <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setActivePanel(Panel.model)}
              className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg font-medium"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <div className="flex w-full items-center gap-2">
                {Icon && (
                  <div className="shadow-stroke relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-black dark:bg-white">
                    <Icon
                      className="h-2/3 w-2/3"
                      endpoint={providerValue as string}
                      endpointType={endpointType}
                      iconURL={endpointIconURL}
                    />
                  </div>
                )}
                <span>{model != null && model ? model : localize('com_ui_select_model')}</span>
              </div>
            </button>
          </div>
          {/* MCP Section */}
          {availableMCPServers != null && availableMCPServers.length > 0 && (
            <MCPTools
              agentId={agent_id}
              mcpServerNames={mcpServerNames}
              setShowMCPToolDialog={setShowMCPToolDialog}
            />
          )}
          {/* Agent Tools & Actions */}
          <div className="mb-4">
            <label className={labelClass}>
              {(() => {
                if (toolsEnabled === true && actionsEnabled === true) {
                  return localize('com_ui_tools_and_actions');
                }
                if (toolsEnabled === true) {
                  return localize('com_ui_tools');
                }
                if (actionsEnabled === true) {
                  return localize('com_assistants_actions');
                }
                return '';
              })()}
            </label>
            <div>
              <div className="mb-1">
                {/* Render all visible IDs */}
                {toolIds.map((toolId, i) => {
                  const tool = regularTools?.find((t) => t.pluginKey === toolId);
                  if (!tool) return null;
                  return (
                    <AgentTool
                      key={`${toolId}-${i}-${agent_id}`}
                      tool={toolId}
                      regularTools={regularTools}
                      agent_id={agent_id}
                    />
                  );
                })}
              </div>
              <div className="flex flex-col gap-1">
                {(actions ?? [])
                  .filter((action) => action.agent_id === agent_id)
                  .map((action, i) => (
                    <Action
                      key={i}
                      action={action}
                      onClick={() => {
                        setAction(action);
                        setActivePanel(Panel.actions);
                      }}
                    />
                  ))}
              </div>
              <div className="mt-2 flex space-x-2">
                {(toolsEnabled ?? false) && (
                  <button
                    type="button"
                    onClick={() => setShowToolDialog(true)}
                    className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg font-medium"
                    aria-haspopup="dialog"
                  >
                    <div className="flex w-full items-center justify-center gap-2">
                      {localize('com_assistants_add_tools')}
                    </div>
                  </button>
                )}
                {(actionsEnabled ?? false) && (
                  <button
                    type="button"
                    disabled={isEphemeralAgent(agent_id)}
                    onClick={handleAddActions}
                    className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg font-medium"
                    aria-haspopup="dialog"
                  >
                    <div className="flex w-full items-center justify-center gap-2">
                      {localize('com_assistants_add_actions')}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Support Contact (Optional) */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span>
                <label className="text-token-text-primary block text-sm font-medium">
                  {localize('com_ui_support_contact')}
                </label>
              </span>
            </div>
            <div className="space-y-3">
              {/* Support Contact Name */}
              <div className="flex flex-col">
                <label
                  className="mb-1 flex items-center justify-between"
                  htmlFor="support-contact-name"
                >
                  <span className="text-sm">{localize('com_ui_support_contact_name')}</span>
                </label>
                <Controller
                  name="support_contact.name"
                  control={control}
                  rules={{
                    minLength: {
                      value: 3,
                      message: localize('com_ui_support_contact_name_min_length', { minLength: 3 }),
                    },
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        className={cn(inputClass, error ? 'border-2 border-red-500' : '')}
                        id="support-contact-name"
                        type="text"
                        placeholder={localize('com_ui_support_contact_name_placeholder')}
                        aria-label="Support contact name"
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? 'support-contact-name-error' : undefined}
                      />
                      {error && (
                        <span
                          id="support-contact-name-error"
                          className="text-sm text-red-500 transition duration-300 ease-in-out"
                          role="alert"
                          aria-live="polite"
                        >
                          {error.message}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
              {/* Support Contact Email */}
              <div className="flex flex-col">
                <label
                  className="mb-1 flex items-center justify-between"
                  htmlFor="support-contact-email"
                >
                  <span className="text-sm">{localize('com_ui_support_contact_email')}</span>
                </label>
                <Controller
                  name="support_contact.email"
                  control={control}
                  rules={{
                    validate: (value) =>
                      validateEmail(value ?? '', localize('com_ui_support_contact_email_invalid')),
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        className={cn(inputClass, error ? 'border-2 border-red-500' : '')}
                        id="support-contact-email"
                        type="email"
                        placeholder={localize('com_ui_support_contact_email_placeholder')}
                        aria-label="Support contact email"
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? 'support-contact-email-error' : undefined}
                      />
                      {error && (
                        <span
                          id="support-contact-email-error"
                          className="text-sm text-red-500 transition duration-300 ease-in-out"
                          role="alert"
                          aria-live="polite"
                        >
                          {error.message}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </AdvancedSection>
      </div>
```

(Os dois diálogos `<ToolSelectDialog>` e `<MCPToolSelectDialog>` que vêm logo após esse `</div>` permanecem inalterados.)

- [ ] **Step 5: Lint dos arquivos tocados**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/SidePanel/Agents/AgentConfig.tsx client/src/components/SidePanel/Agents/Instructions.tsx`
Se houver erro de prettier auto-corrigível: `rtk proxy npx eslint --config client/eslint.config.mjs --fix client/src/components/SidePanel/Agents/AgentConfig.tsx` (caminho único) e re-rodar.
Expected: sem erros.

- [ ] **Step 6: Build check (TypeScript)**

Run: `cd client && npx tsc --noEmit -p tsconfig.json`
Expected: sem novos erros em `AgentConfig.tsx`/`Instructions.tsx` (a base do projeto pode ter erros crônicos pré-existentes — comparar só os arquivos tocados).

- [ ] **Step 7: Verificação visual (Playwright)**

Criar `/tmp/probe-agentes.mjs` (reusar seeding de sessão via API desta sessão):

```js
import pw from '/Users/arturlemos/Documents/Projetos/iazzas/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch();
const ctx = await b.newContext();
// (seed de sessão via API antes de navegar)
const p = await ctx.newPage();
await p.goto('http://localhost:3080/d/agentes');
await p.waitForTimeout(2500);
const nameVisible = await p.locator('#name').isVisible();
const advToggle = p.getByRole('button', { name: /Ajustes avançados/ });
const advCount = await advToggle.count();
const providerBefore = await p.locator('#provider').count();
await advToggle.click();
await p.waitForTimeout(300);
const providerAfter = await p.locator('#provider').count();
console.log('campo Nome visível =', nameVisible, '(esperado true)');
console.log('toggle Ajustes avançados =', advCount, '(esperado 1)');
console.log('label provider antes de expandir =', providerBefore, '(esperado 0)');
console.log('label provider depois de expandir =', providerAfter, '(esperado 1)');
await p.screenshot({ path: '/tmp/uxui-shots/agentes-form.png', fullPage: true });
await b.close();
```
Run: `node /tmp/probe-agentes.mjs`
Expected: Nome visível `true`; toggle `1`; provider `0`→`1` ao expandir.

- [ ] **Step 8: Commit**

```bash
git add client/src/locales/en/translation.json client/src/components/SidePanel/Agents/Instructions.tsx client/src/components/SidePanel/Agents/AgentConfig.tsx
git commit -m "feat(agentes): form enxuto — essencial visível, técnico em Ajustes avançados

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Provider/model default — criar agente sem abrir "Avançado" — TDD

Sem isso, criar um agente só com Nome + Instruções dispara o toast `com_agents_missing_provider_model` (ver `AgentPanel.tsx:443`). Helper puro testável + efeito que aplica o default ao criar.

**Files:**
- Test: `client/src/utils/__tests__/resolveDefaultProviderModel.test.ts` (criar)
- Modify: `client/src/utils/forms.tsx` (helper)
- Modify: `client/src/components/SidePanel/Agents/AgentPanel.tsx` (efeito)

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/utils/__tests__/resolveDefaultProviderModel.test.ts`:

```ts
import { resolveDefaultProviderModel } from '../forms';

describe('resolveDefaultProviderModel', () => {
  it('retorna o primeiro provider que tem ao menos um modelo', () => {
    expect(
      resolveDefaultProviderModel([{ value: 'empty' }, { value: 'openai' }], {
        empty: [],
        openai: ['gpt-4o', 'gpt-4o-mini'],
      }),
    ).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('retorna null quando nenhum provider tem modelos', () => {
    expect(resolveDefaultProviderModel([{ value: 'a' }], { a: [] })).toBeNull();
  });

  it('retorna null quando não há providers', () => {
    expect(resolveDefaultProviderModel([], { a: ['x'] })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd client && npx jest src/utils/__tests__/resolveDefaultProviderModel.test.ts`
Expected: FAIL — `resolveDefaultProviderModel` não exportado.

- [ ] **Step 3: Implementar o helper**

Em `client/src/utils/forms.tsx`, adicionar após `createProviderOption` (linha ~45):

```ts
/**
 * Primeiro provider (na ordem dada) que tem ao menos um modelo disponível.
 * Usado para pré-selecionar um default válido na criação de agente.
 */
export const resolveDefaultProviderModel = (
  providers: Array<{ value: string }>,
  models: Record<string, string[]>,
): { provider: string; model: string } | null => {
  for (const { value } of providers) {
    const list = models[value];
    if (list && list.length > 0) {
      return { provider: value, model: list[0] };
    }
  }
  return null;
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd client && npx jest src/utils/__tests__/resolveDefaultProviderModel.test.ts`
Expected: PASS (3 casos).

- [ ] **Step 5: Wire no `AgentPanel`**

Em `client/src/components/SidePanel/Agents/AgentPanel.tsx`:

(a) Adicionar `useEffect` ao import do React (linha 1):
```tsx
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
```

(b) Incluir `resolveDefaultProviderModel` no import de `~/utils` (linha 25):
```tsx
import { createProviderOption, getDefaultAgentFormValues, resolveDefaultProviderModel } from '~/utils';
```

(c) Logo após o `useMemo` de `providers` (termina ~linha 317), adicionar:

```tsx
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current || agent_id) {
      return;
    }
    if ((getValues('model') ?? '') !== '') {
      return;
    }
    const resolved = resolveDefaultProviderModel(providers, models);
    if (!resolved) {
      return;
    }
    setValue('provider', createProviderOption(resolved.provider), { shouldDirty: false });
    setValue('model', resolved.model, { shouldDirty: false });
    defaultsAppliedRef.current = true;
  }, [agent_id, providers, models, getValues, setValue]);
```

- [ ] **Step 6: Lint + TS**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/utils/forms.tsx client/src/components/SidePanel/Agents/AgentPanel.tsx`
Run: `cd client && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros novos nos arquivos tocados.

- [ ] **Step 7: Verificação (Playwright) — criar agente só com Nome + Instruções**

Criar `/tmp/probe-create.mjs` (seed de sessão via API):

```js
import pw from '/Users/arturlemos/Documents/Projetos/iazzas/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch();
const ctx = await b.newContext();
// (seed de sessão via API)
const p = await ctx.newPage();
await p.goto('http://localhost:3080/d/agentes');
await p.waitForTimeout(2500);
await p.fill('#name', 'Agente Teste Default');
await p.fill('#instructions', 'Responde dúvidas de pedido em tom formal.');
// selecionar categoria se obrigatória pela UI; depois submeter
await p.getByRole('button', { name: /Criar|Create|Salvar|Save/ }).first().click();
await p.waitForTimeout(2000);
const missing = await p.getByText(/provider|model|modelo/i).count();
console.log('toast de provider/model faltando =', missing, '(esperado 0)');
await p.screenshot({ path: '/tmp/uxui-shots/agentes-create.png', fullPage: true });
await b.close();
```
Run: `node /tmp/probe-create.mjs`
Expected: criação sem o toast de provider/model faltando (default aplicado).

- [ ] **Step 8: Commit**

```bash
git add client/src/utils/forms.tsx client/src/utils/__tests__/resolveDefaultProviderModel.test.ts client/src/components/SidePanel/Agents/AgentPanel.tsx
git commit -m "feat(agentes): provider/model default — agente criável sem abrir Ajustes avançados

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Fase 1 do spec `2026-05-19-criacao-agentes-redesign-design.md`):**
- Rename `/d/agent-studio`→`/d/flows` → Task 1 ✓
- Builder sai do `AgentStudioView`; `/d/flows` só canvas → Task 3 ✓
- Nova rota `/d/agentes` + item de menu "Agentes" → Task 2 ✓
- Form progressive disclosure (essencial visível, técnico colapsado) → Tasks 4 + 5 ✓
- Relabel Instruções "O que esse agente faz?" + capacidades em linguagem simples → Task 5 ✓
- Modelo/provider default pré-selecionado → Task 6 ✓
- Sem mudança de payload/mutation → Tasks 5/6 só reordenam UI e setam default via `setValue`; `composeAgentUpdatePayload` intacto ✓
- Não-objetivos (split, Testar, Construir IA) → ausentes do plano ✓
- `client/vite.config.ts` fora de commit → `git add` com paths explícitos em toda task ✓

**Placeholder scan:** sem TBD/TODO; todo passo de código traz o código completo; verificações provider-heavy usam Playwright com script concreto (mesma técnica de validação usada na sessão) por inviabilidade de teste Jest unitário — declarado explicitamente, não é placeholder.

**Type/nome consistency:** `resolveDefaultProviderModel(providers: Array<{value:string}>, models: Record<string,string[]>)` — assinatura idêntica entre Task 6 helper, teste e uso no `AgentPanel` (`providers` é `createProviderOption[]` que tem `.value`; `models = modelsQuery.data ?? {}`). `AdvancedSection({label,children})` — props idênticas entre Task 4 (def+teste) e Task 5 (uso). Ids de nav (`nav-agentes`, `nav-flows`) consistentes entre Tasks 1 e 2. Chaves i18n novas (`com_ui_ux_rail_agentes_desc`, `com_ui_ux_agent_*`) criadas e consumidas dentro da Fase 1 (sem unused-string).
