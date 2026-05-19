# Fase 1 — Tela própria de agentes + `/d/flows` + form enxuto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar `/d/flows` mantendo `/d/agent-studio` como redirect, dar à criação de agentes uma tela própria em `/d/agentes`, e enxugar o formulário com progressive disclosure — sem mudar o payload de criação.

**Architecture:** Mudanças só de roteamento, navegação e UI no `/client`. O builder existente (`AgentPanelSwitch`) sai da coluna de 360px dentro do `AgentStudioView` e renderiza numa rota própria. `AgentPanelContext` obtém endpoints via `useGetAgentsConfig()` (verificado: `client/src/Providers/AgentPanelContext.tsx:53`) — **não** depende de `FlowProvider`/`ReactFlowProvider`, então o builder roda standalone. O `AgentConfig` é reescrito (Write do arquivo inteiro) reorganizando: essencial na primeira dobra, técnico dentro de um `AdvancedSection` colapsável.

**Tech Stack:** React 18, react-router v6, react-hook-form, Recoil, React Query, Jest + @testing-library/react (jest-dom já configurado em `client/test/setupTests.js`), playwright-core, lucide-react, Tailwind tokens.

**Restrições do projeto (valem para todas as tasks):**
- `client/vite.config.ts` **NUNCA** entra em commit (tweak local do dev). Sempre `git add <paths explícitos>`, nunca `git add -A`.
- i18n: só editar chaves EN em `client/src/locales/en/translation.json` (o fork guarda o texto PT-BR como valor da chave EN). CI **"Detect Unused i18next Strings"** falha com chave presente no JSON mas **sem referência no código** → toda chave nova é consumida na mesma task, e toda chave cujo último uso for removido deve ser **deletada do JSON** no mesmo commit.
- ESLint/Prettier limpos. Footgun do hook RTK: nunca `eslint --fix` sem caminho explícito; usar `rtk proxy npx eslint --config client/eslint.config.mjs --fix <caminho único>`. Para git/eslint cru use `rtk proxy`.
- Jest roda da raiz com config explícita: `npx jest --config client/jest.config.cjs <path>` (não usar `cd client && ...` — `cd` em comando composto dispara prompt de permissão).
- CI base é cronicamente vermelho (main falha TS/i18n/tests; o time mergeia por cima). Julgar regressão **vs. baseline do main**, não vs. verde absoluto.

---

### Task 0: Helper de auth-seed para Playwright (pré-requisito das verificações visuais)

Vários componentes desta fase são provider-heavy (xyflow, árvore de contexto do form) — não há teste Jest unitário viável; valida-se ao vivo via Playwright, como foi a validação desta sessão inteira. Todo script precisa de sessão autenticada. Este helper concreto remove o placeholder "(reusar o seeding)".

**Files:**
- Create: `e2e/_seed.mjs`

- [ ] **Step 1: Criar o helper**

Criar `e2e/_seed.mjs`:

```js
import pw from '/Users/arturlemos/Documents/Projetos/iazzas/node_modules/playwright-core/index.js';

const { chromium } = pw;
const BASE = process.env.E2E_BASE ?? 'http://localhost:3080';
const EMAIL = process.env.E2E_EMAIL ?? 'uxnight@example.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Test1234!seed';
const NAME = 'UX Night';

/**
 * Sobe um browser + context já autenticado.
 * Tenta registrar (idempotente: ignora "já existe") e faz login via API;
 * o request context compartilha o cookie jar com o browser context.
 * @returns {Promise<{browser, context, base: string}>}
 */
export async function seededContext() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE });
  const api = context.request;

  await api
    .post(`${BASE}/api/auth/register`, {
      data: { name: NAME, username: NAME, email: EMAIL, password: PASSWORD, confirm_password: PASSWORD },
    })
    .catch(() => {});

  const login = await api.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!login.ok()) {
    throw new Error(`seed login falhou: ${login.status()} ${await login.text()}`);
  }
  return { browser, context, base: BASE };
}
```

- [ ] **Step 2: Smoke do próprio helper**

Criar `/tmp/probe-seed.mjs`:

```js
import { seededContext } from '/Users/arturlemos/Documents/Projetos/iazzas/e2e/_seed.mjs';
const { browser, context, base } = await seededContext();
const p = await context.newPage();
await p.goto(`${base}/c/new`);
await p.waitForTimeout(2000);
console.log('autenticado em /c/new =', !p.url().includes('/login'), '(esperado true)');
await browser.close();
```
Run: `node /tmp/probe-seed.mjs`
Expected: `autenticado em /c/new = true`. (Pré-condição: backend + Mongo + Meilisearch no ar — `docker compose up -d mongodb meilisearch` e `npm run backend`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/_seed.mjs
git commit -m "test(e2e): helper de auth-seed reutilizável p/ verificações Playwright

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1: `/d/flows` ativo + `/d/agent-studio` vira redirect (não deletar o path)

Decisão de robustez: `/d/agent-studio` está hardcoded em 9+ scripts `e2e/qa-evidence/*.mjs` (incl. `automacoes.spec:32` "Regressão inegociável: /d/agent-studio intactos") e potencialmente em deep links de usuários. **Mantemos o path como redirect 1:1 para `/d/flows`** — preserva regressões e bookmarks; o builder some de lá igual (Task 3).

**Files:**
- Test: `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx` (criar)
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts:32`
- Modify: `client/src/routes/Dashboard.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import useUnifiedSidebarLinks from '../useUnifiedSidebarLinks';

// Nota: este hook é um useMemo([],[]) — o teste é um snapshot barato de baixo
// valor. O guard real do rename é o grep do Step 6 + o redirect + Playwright.
describe('useUnifiedSidebarLinks', () => {
  it('aponta o item Flows para /d/flows', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const flows = result.current.find((l) => l.id === 'nav-flows');
    expect(flows?.href).toBe('/d/flows');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx jest --config client/jest.config.cjs src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: FAIL — `flows?.href` é `'/d/agent-studio'`.

- [ ] **Step 3: Editar o href do menu**

Em `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`, na entrada `nav-flows` (linha 32), trocar `href: '/d/agent-studio',` por `href: '/d/flows',`.

- [ ] **Step 4: Rota `flows` real + `agent-studio` como redirect**

Em `client/src/routes/Dashboard.tsx`, substituir o bloco:

```tsx
    {
      path: 'agent-studio',
      element: <AgentStudioView />,
    },
```
por:
```tsx
    {
      path: 'flows',
      element: <AgentStudioView />,
    },
    {
      path: 'agent-studio',
      element: <Navigate to="/d/flows" replace={true} />,
    },
```

(`Navigate` já está importado em `Dashboard.tsx:1`.)

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx jest --config client/jest.config.cjs src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: PASS.

- [ ] **Step 6: Guard — única ocorrência de `agent-studio` é o redirect intencional**

Run: `grep -rn "agent-studio" client/src --include="*.ts" --include="*.tsx"`
Expected: **exatamente uma** linha — o `path: 'agent-studio'` do `<Navigate>` em `Dashboard.tsx`. Nenhuma outra (href do menu já migrado).

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/Nav/useUnifiedSidebarLinks.ts client/src/routes/Dashboard.tsx client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx
git commit -m "refactor(nav): rota /d/flows + /d/agent-studio mantido como redirect

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Hook de acesso compartilhado (DRY) + tela `/d/agentes` + item de menu + smoke render

A chave `com_ui_ux_nav_agentes` ("Agentes") já existe no `translation.json`. O gate de permissão do `AgentStudioView` é extraído para um hook reutilizado por ele e pela nova tela (CLAUDE.md exige DRY). **O smoke render fecha esta task antes da Task 3 remover o builder de `/d/flows` — garante que nunca há janela sem acesso à criação de agentes.**

**Files:**
- Create: `client/src/hooks/Agents/useAgentsAccessRedirect.ts`
- Modify: `client/src/hooks/Agents/index.ts` (se existir barrel; senão importar direto)
- Modify: `client/src/components/AgentStudio/layouts/AgentStudioView.tsx` (usar o hook)
- Modify: `client/src/locales/en/translation.json` (1 chave)
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` (import lucide + entrada)
- Modify: `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx` (novo caso)
- Create: `client/src/components/Agentes/AgentesView.tsx`
- Create: `client/src/components/Agentes/index.ts`
- Modify: `client/src/routes/Dashboard.tsx` (import + rota)

- [ ] **Step 1: Confirmar/checar barrel de hooks/Agents**

Run: `ls client/src/hooks/Agents/ && cat client/src/hooks/Agents/index.ts 2>/dev/null || echo "SEM index.ts"`
Anote se há `index.ts` (define se exportar pelo barrel ou import direto no Step 4/6).

- [ ] **Step 2: Escrever o teste que falha (nova entrada de nav)**

Em `client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`, adicionar dentro do `describe`:

```tsx
  it('inclui Agentes apontando /d/agentes, antes de Flows', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const links = result.current;
    const agentes = links.find((l) => l.id === 'nav-agentes');
    expect(agentes?.href).toBe('/d/agentes');
    expect(agentes?.title).toBe('com_ui_ux_nav_agentes');
    const i = links.findIndex((l) => l.id === 'nav-agentes');
    const j = links.findIndex((l) => l.id === 'nav-flows');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(j);
  });
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest --config client/jest.config.cjs src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: FAIL — `agentes` é `undefined`.

- [ ] **Step 4: Criar o hook de acesso (DRY)**

Criar `client/src/hooks/Agents/useAgentsAccessRedirect.ts`:

```ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess } from '~/hooks';

/**
 * Gate de permissão para telas de agentes. Redireciona p/ /c/new após 1s
 * quando o usuário não tem AGENTS.USE. Retorna se tem acesso.
 */
export default function useAgentsAccessRedirect(): boolean {
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

  return hasAccess;
}
```

Se houver `client/src/hooks/Agents/index.ts`, adicionar:
```ts
export { default as useAgentsAccessRedirect } from './useAgentsAccessRedirect';
```

- [ ] **Step 5: `AgentStudioView` passa a usar o hook (DRY)**

Em `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`, no componente `AgentStudioView` substituir:

```tsx
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

  if (!hasAccess) return null;
```
por:
```tsx
  const hasAccess = useAgentsAccessRedirect();

  if (!hasAccess) {
    return null;
  }
```

E ajustar imports: remover `useNavigate` (se não usado em outro ponto do arquivo — confirmar com `grep -n "useNavigate\|navigate(" client/src/components/AgentStudio/layouts/AgentStudioView.tsx`), remover `PermissionTypes, Permissions` e `useHasAccess` do import se ficarem sem uso, e adicionar `import useAgentsAccessRedirect from '~/hooks/Agents/useAgentsAccessRedirect';` (ou via barrel). `useEffect` ainda é usado pelo `FlowLoader` — manter o import do React.

- [ ] **Step 6: Chave de descrição do rail**

Em `client/src/locales/en/translation.json`, logo após `"com_ui_ux_rail_admin_desc": "Gestão da plataforma",` adicionar:

```json
  "com_ui_ux_rail_agentes_desc": "Criar, testar e gerenciar seus agentes",
```

- [ ] **Step 7: Entrada de nav**

Em `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`, trocar o import:
```ts
import { Image, GitFork, CalendarClock, ShieldCheck, MessageSquare } from 'lucide-react';
```
por:
```ts
import { Image, Bot, GitFork, CalendarClock, ShieldCheck, MessageSquare } from 'lucide-react';
```
e inserir, **imediatamente antes** do objeto com `title: 'com_ui_ux_nav_flows'`:
```ts
      {
        title: 'com_ui_ux_nav_agentes',
        description: 'com_ui_ux_rail_agentes_desc',
        icon: Bot,
        id: 'nav-agentes',
        href: '/d/agentes',
      },
```

- [ ] **Step 8: Criar a tela**

Criar `client/src/components/Agentes/AgentesView.tsx`:

```tsx
import useAgentsAccessRedirect from '~/hooks/Agents/useAgentsAccessRedirect';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';

export default function AgentesView() {
  const hasAccess = useAgentsAccessRedirect();

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

- [ ] **Step 9: Registrar a rota**

Em `client/src/routes/Dashboard.tsx`, adicionar import após `import { AgentStudioView } from '~/components/AgentStudio';`:
```tsx
import { AgentesView } from '~/components/Agentes';
```
e a rota, logo após o bloco `{ path: 'flows', element: <AgentStudioView /> }`:
```tsx
    {
      path: 'agentes',
      element: <AgentesView />,
    },
```

- [ ] **Step 10: Rodar o teste e ver passar**

Run: `npx jest --config client/jest.config.cjs src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx`
Expected: PASS (2 casos).

- [ ] **Step 11: Lint dos arquivos tocados**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/hooks/Agents/useAgentsAccessRedirect.ts client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts client/src/hooks/Nav/useUnifiedSidebarLinks.ts client/src/components/AgentStudio/layouts/AgentStudioView.tsx`
Erro auto-corrigível: `rtk proxy npx eslint --config client/eslint.config.mjs --fix <caminho único>` e re-rodar.
Expected: sem erros.

- [ ] **Step 12: SMOKE RENDER `/d/agentes` (gate antes da Task 3)**

Criar `/tmp/probe-agentes-smoke.mjs`:

```js
import { seededContext } from '/Users/arturlemos/Documents/Projetos/iazzas/e2e/_seed.mjs';
const { browser, context, base } = await seededContext();
const p = await context.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${base}/d/agentes`);
await p.waitForTimeout(3000);
const form = await p.locator('form[aria-label="Agent configuration form"]').count();
console.log('form do builder em /d/agentes =', form, '(esperado >=1)');
console.log('pageerrors =', errors.length, '(esperado 0)', errors.slice(0, 3));
await p.screenshot({ path: '/tmp/uxui-shots/agentes-smoke.png', fullPage: true });
await browser.close();
```
Run: `node /tmp/probe-agentes-smoke.mjs`
Expected: `form >= 1` e `pageerrors = 0`. **Se falhar, NÃO prosseguir para a Task 3** — investigar dependência de provider antes (root cause, não patch).

- [ ] **Step 13: Commit**

```bash
git add client/src/hooks/Agents/useAgentsAccessRedirect.ts client/src/hooks/Agents/index.ts client/src/components/AgentStudio/layouts/AgentStudioView.tsx client/src/locales/en/translation.json client/src/hooks/Nav/useUnifiedSidebarLinks.ts client/src/hooks/Nav/__tests__/useUnifiedSidebarLinks.test.tsx client/src/components/Agentes/AgentesView.tsx client/src/components/Agentes/index.ts client/src/routes/Dashboard.tsx
git commit -m "feat(agentes): tela /d/agentes + item de menu + hook de acesso DRY

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
(Omitir `client/src/hooks/Agents/index.ts` do `git add` se o Step 1 indicou que não existe.)

---

### Task 3: `/d/flows` vira só o canvas (remover a coluna do builder)

Só prosseguir se o Step 12 da Task 2 passou (form renderiza em `/d/agentes`).

**Files:**
- Modify: `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`

- [ ] **Step 1: Remover import do builder**

Em `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`, remover:
```tsx
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
```

- [ ] **Step 2: Remover a coluna de 360px**

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

- [ ] **Step 3: Guard**

Run: `grep -n "AgentPanelSwitch" client/src/components/AgentStudio/layouts/AgentStudioView.tsx`
Expected: nenhuma saída.

- [ ] **Step 4: Lint**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/AgentStudio/layouts/AgentStudioView.tsx`
Expected: sem erros.

- [ ] **Step 5: Verificação visual (Playwright)**

Criar `/tmp/probe-flows.mjs`:

```js
import { seededContext } from '/Users/arturlemos/Documents/Projetos/iazzas/e2e/_seed.mjs';
const { browser, context, base } = await seededContext();
const p = await context.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${base}/d/flows`);
await p.waitForTimeout(3000);
const hasForm = await p.locator('form[aria-label="Agent configuration form"]').count();
const hasCanvas = await p.locator('main[aria-label="Canvas do flow de agentes"]').count();
console.log('builder form em /d/flows =', hasForm, '(esperado 0)');
console.log('canvas em /d/flows =', hasCanvas, '(esperado 1)');
console.log('pageerrors =', errors.length, '(esperado 0)');
// regressão do redirect:
await p.goto(`${base}/d/agent-studio`);
await p.waitForTimeout(1500);
console.log('redirect /d/agent-studio -> url =', p.url(), '(deve conter /d/flows)');
await p.screenshot({ path: '/tmp/uxui-shots/flows-canvas-only.png' });
await browser.close();
```
Run: `node /tmp/probe-flows.mjs`
Expected: `form = 0`, `canvas = 1`, `pageerrors = 0`, e `/d/agent-studio` redireciona para `/d/flows`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/AgentStudio/layouts/AgentStudioView.tsx
git commit -m "refactor(flows): /d/flows renderiza só o canvas (builder migrou p/ /d/agentes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Componente `AdvancedSection` (disclosure colapsável) — TDD

jest-dom confirmado em `client/test/setupTests.js` → matchers `toHaveAttribute`/`toBeInTheDocument` disponíveis.

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

Run: `npx jest --config client/jest.config.cjs src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx`
Expected: FAIL — módulo `../AdvancedSection` não existe.

- [ ] **Step 3: Implementar o componente**

Criar `client/src/components/SidePanel/Agents/AdvancedSection.tsx`:

```tsx
import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '~/utils';

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

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --config client/jest.config.cjs src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/SidePanel/Agents/AdvancedSection.tsx`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SidePanel/Agents/AdvancedSection.tsx client/src/components/SidePanel/Agents/__tests__/AdvancedSection.test.tsx
git commit -m "feat(agentes): AdvancedSection (disclosure colapsável acessível)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Reorganizar `AgentConfig` (Write do arquivo inteiro) + remover i18n órfã

Sem mudança de payload: mesmos `Controller`/campos, só reordenados e parte técnica dentro de `<AdvancedSection>`. **Reescrever o arquivo inteiro com `Write`** (após `Read`) — um `Edit` de ~300 linhas é mecanicamente frágil (match não-único). Primeira dobra: Avatar+Nome, "O que esse agente faz?", Categoria, capacidades. Avançado: Descrição, Agent ID, Modelo/Provider, MCP, Ferramentas & Ações, Contato.

**i18n órfã (confirmado por grep):** `com_agents_instructions_placeholder` tem **1 único uso** no código (Instructions.tsx). A Task troca esse uso → a chave fica órfã → CI "Detect Unused" quebra. Logo: **deletar `com_agents_instructions_placeholder` do translation.json** nesta task. (`com_assistants_capabilities` e `com_ui_instructions` têm 2 usos cada — sobra 1, não orfanizam; não mexer.)

**Files:**
- Modify: `client/src/locales/en/translation.json` (+4 chaves novas, −1 órfã)
- Modify: `client/src/components/SidePanel/Agents/Instructions.tsx` (relabel)
- Rewrite: `client/src/components/SidePanel/Agents/AgentConfig.tsx` (Write completo)

- [ ] **Step 1: Adicionar chaves novas e remover a órfã**

Em `client/src/locales/en/translation.json`:

(a) após `"com_ui_ux_rail_agentes_desc": ...` (criada na Task 2) adicionar:
```json
  "com_ui_ux_agent_o_que_faz": "O que esse agente faz?",
  "com_ui_ux_agent_o_que_faz_ph": "Descreva em linguagem natural: o que ele deve fazer, como responder e o que evitar.",
  "com_ui_ux_agent_capacidades": "O que ele pode fazer",
  "com_ui_ux_agent_avancado": "Ajustes avançados",
```

(b) **remover** a linha inteira da chave órfã:
```json
"com_agents_instructions_placeholder": "...",
```
(na ~linha 135; cuidar da vírgula da linha anterior/seguinte pra manter JSON válido).

- [ ] **Step 2: Validar JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('client/src/locales/en/translation.json','utf8'));console.log('JSON ok')"`
Expected: `JSON ok`.

- [ ] **Step 3: Relabel das Instruções**

Em `client/src/components/SidePanel/Agents/Instructions.tsx`:
- linha ~51: `{localize('com_ui_instructions')}` → `{localize('com_ui_ux_agent_o_que_faz')}`
- linha ~90: `placeholder={localize('com_agents_instructions_placeholder')}` → `placeholder={localize('com_ui_ux_agent_o_que_faz_ph')}`

- [ ] **Step 4: Reescrever `AgentConfig.tsx` com `Write`**

Primeiro `Read` o arquivo atual (estado pode ter mudado por lint de tasks anteriores). Depois `Write` o arquivo inteiro, idêntico ao atual EXCETO:
- adicionar aos imports locais: `import AdvancedSection from './AdvancedSection';`
- substituir o conteúdo do `<div className="h-auto pt-1"> ... </div>` (do `{/* Avatar & Name */}` até o fim do bloco Support Contact, imediatamente antes de `<ToolSelectDialog`) por exatamente este corpo:

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
            {codeEnabled && <CodeForm agent_id={agent_id} files={code_files} />}
            {webSearchEnabled && <SearchForm />}
            {contextEnabled && <FileContext agent_id={agent_id} files={context_files} />}
            {artifactsEnabled && <Artifacts />}
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

(Os `<ToolSelectDialog>` e `<MCPToolSelectDialog>` após esse `</div>` permanecem inalterados, e o `</>` de fechamento + chave da função idem.)

- [ ] **Step 5: Lint dos arquivos tocados**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/components/SidePanel/Agents/AgentConfig.tsx client/src/components/SidePanel/Agents/Instructions.tsx`
Erro de prettier auto-corrigível: `rtk proxy npx eslint --config client/eslint.config.mjs --fix client/src/components/SidePanel/Agents/AgentConfig.tsx` (caminho único) e re-rodar.
Expected: sem erros.

- [ ] **Step 6: Guard i18n — sem chave órfã introduzida**

Run: `grep -rn "com_agents_instructions_placeholder" client/src --include="*.ts" --include="*.tsx" --include="*.json"`
Expected: nenhuma saída (chave removida do JSON e sem uso no código).
Run: `grep -rn "com_ui_ux_agent_o_que_faz\|com_ui_ux_agent_o_que_faz_ph\|com_ui_ux_agent_capacidades\|com_ui_ux_agent_avancado" client/src --include="*.tsx" | grep -v locales`
Expected: cada chave nova aparece referenciada ao menos 1×.

- [ ] **Step 7: Verificação visual (Playwright)**

Criar `/tmp/probe-agentes-form.mjs`:

```js
import { seededContext } from '/Users/arturlemos/Documents/Projetos/iazzas/e2e/_seed.mjs';
const { browser, context, base } = await seededContext();
const p = await context.newPage();
await p.goto(`${base}/d/agentes`);
await p.waitForTimeout(3000);
const nameVisible = await p.locator('#name').isVisible();
const adv = p.getByRole('button', { name: /Ajustes avançados/ });
const advCount = await adv.count();
const providerBefore = await p.locator('#provider, button[aria-haspopup="true"]').count();
const descBefore = await p.locator('#description').count();
await adv.click();
await p.waitForTimeout(300);
const descAfter = await p.locator('#description').count();
console.log('campo Nome visível =', nameVisible, '(esperado true)');
console.log('toggle Ajustes avançados =', advCount, '(esperado 1)');
console.log('#description antes de expandir =', descBefore, '(esperado 0)');
console.log('#description depois de expandir =', descAfter, '(esperado 1)');
await p.screenshot({ path: '/tmp/uxui-shots/agentes-form.png', fullPage: true });
await browser.close();
```
Run: `node /tmp/probe-agentes-form.mjs`
Expected: Nome `true`; toggle `1`; `#description` `0`→`1` ao expandir.

- [ ] **Step 8: Commit**

```bash
git add client/src/locales/en/translation.json client/src/components/SidePanel/Agents/Instructions.tsx client/src/components/SidePanel/Agents/AgentConfig.tsx
git commit -m "feat(agentes): form enxuto — essencial visível, técnico em Ajustes avançados

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Provider/model default — agente criável sem abrir "Avançado" — TDD

Sem isso, criar agente só com Nome + Instruções dispara o toast `com_agents_missing_provider_model` (`AgentPanel.tsx:443`). Helper puro testável + efeito que aplica o default ao criar. **Depende de endpoints estarem disponíveis em `/d/agentes`** — coberto: `AgentPanelContext` busca via `useGetAgentsConfig()` e o smoke da Task 2 já validou render; o Step 7 aqui confirma o caminho de criação fim-a-fim.

**Files:**
- Test: `client/src/utils/__tests__/resolveDefaultProviderModel.test.ts` (criar)
- Modify: `client/src/utils/forms.tsx`
- Modify: `client/src/components/SidePanel/Agents/AgentPanel.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `client/src/utils/__tests__/resolveDefaultProviderModel.test.ts`:

```ts
import { resolveDefaultProviderModel } from '../forms';

describe('resolveDefaultProviderModel', () => {
  it('retorna o primeiro provider com ao menos um modelo', () => {
    expect(
      resolveDefaultProviderModel([{ value: 'empty' }, { value: 'openai' }], {
        empty: [],
        openai: ['gpt-4o', 'gpt-4o-mini'],
      }),
    ).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('ignora chaves não-array do models config (ex.: initial)', () => {
    expect(
      resolveDefaultProviderModel([{ value: 'openai' }], {
        initial: true,
        openai: ['gpt-4o'],
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

Run: `npx jest --config client/jest.config.cjs src/utils/__tests__/resolveDefaultProviderModel.test.ts`
Expected: FAIL — `resolveDefaultProviderModel` não exportado.

- [ ] **Step 3: Implementar o helper**

Em `client/src/utils/forms.tsx`, após `createProviderOption` (linha ~45):

```ts
/**
 * Primeiro provider (na ordem dada) com ao menos um modelo disponível.
 * `models` pode conter chaves não-array (ex.: `initial`) — ignoradas via
 * Array.isArray. Usado para pré-selecionar um default válido na criação.
 */
export const resolveDefaultProviderModel = (
  providers: Array<{ value: string }>,
  models: Record<string, unknown>,
): { provider: string; model: string } | null => {
  for (const { value } of providers) {
    const list = models[value];
    if (Array.isArray(list) && list.length > 0) {
      return { provider: value, model: list[0] as string };
    }
  }
  return null;
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --config client/jest.config.cjs src/utils/__tests__/resolveDefaultProviderModel.test.ts`
Expected: PASS (4 casos).

- [ ] **Step 5: Wire no `AgentPanel`**

Em `client/src/components/SidePanel/Agents/AgentPanel.tsx`:

(a) import do React (linha 1) — adicionar `useEffect`:
```tsx
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
```
(b) import de `~/utils` (linha 25) — adicionar `resolveDefaultProviderModel`:
```tsx
import { createProviderOption, getDefaultAgentFormValues, resolveDefaultProviderModel } from '~/utils';
```
(c) logo após o `useMemo` de `providers` (~linha 317), adicionar:
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

- [ ] **Step 6: Lint + TS (escopo nos arquivos tocados)**

Run: `rtk proxy npx eslint --config client/eslint.config.mjs client/src/utils/forms.tsx client/src/components/SidePanel/Agents/AgentPanel.tsx`
Run: `npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -E "forms\.tsx|AgentPanel\.tsx" || echo "sem erro TS novo nos arquivos tocados"`
Expected: lint sem erros; nenhum erro TS apontando para `forms.tsx`/`AgentPanel.tsx` (a base do projeto tem erros TS crônicos pré-existentes — comparar só os tocados).

- [ ] **Step 7: Verificação (Playwright) — criar agente só com Nome + Instruções**

Criar `/tmp/probe-create.mjs`:

```js
import { seededContext } from '/Users/arturlemos/Documents/Projetos/iazzas/e2e/_seed.mjs';
const { browser, context, base } = await seededContext();
const p = await context.newPage();
await p.goto(`${base}/d/agentes`);
await p.waitForTimeout(3000);
await p.fill('#name', `Agente Default ${Date.now()}`);
await p.fill('#instructions', 'Responde dúvidas de pedido em tom formal.');
// categoria, se obrigatória na UI (selecionar primeira opção do seletor):
const cat = p.locator('#category-selector');
if (await cat.count()) { await cat.click().catch(() => {}); }
// submeter via botão submit do form do builder:
await p.locator('form[aria-label="Agent configuration form"] button[type="submit"]').first().click();
await p.waitForTimeout(2500);
const missingToast = await p.getByText(/provider.*model|modelo.*obrigat|missing.*model/i).count();
console.log('toast de provider/model faltando =', missingToast, '(esperado 0)');
await p.screenshot({ path: '/tmp/uxui-shots/agentes-create.png', fullPage: true });
await browser.close();
```
Run: `node /tmp/probe-create.mjs`
Expected: criação sem o toast de provider/model faltando (default aplicado). Inspecionar `/tmp/uxui-shots/agentes-create.png` para confirmar toast de sucesso.

- [ ] **Step 8: Commit**

```bash
git add client/src/utils/forms.tsx client/src/utils/__tests__/resolveDefaultProviderModel.test.ts client/src/components/SidePanel/Agents/AgentPanel.tsx
git commit -m "feat(agentes): provider/model default — agente criável sem abrir Ajustes avançados

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Fase 1 do spec `2026-05-19-criacao-agentes-redesign-design.md`):**
- `/d/agent-studio`→`/d/flows` (como **redirect**, não delete — preserva e2e `qa-evidence` + deep links) → Task 1 ✓
- Builder sai do `AgentStudioView`; `/d/flows` só canvas → Task 3 ✓ (gated pelo smoke da Task 2)
- Nova rota `/d/agentes` + item de menu "Agentes" + gate DRY → Task 2 ✓
- Form progressive disclosure → Tasks 4 + 5 ✓
- Relabel Instruções + capacidades em linguagem simples → Task 5 ✓
- Modelo/provider default pré-selecionado → Task 6 ✓
- Sem mudança de payload/mutation → `composeAgentUpdatePayload` intacto; só reorder UI + `setValue` default ✓
- Não-objetivos (split, Testar, Construir IA) → ausentes ✓
- `client/vite.config.ts` fora de commit → `git add` paths explícitos ✓

**Correções de robustez aplicadas (1–9 da crítica):**
1. Rename → redirect (Task 1) ✓
2. Chave i18n órfã `com_agents_instructions_placeholder` removida do JSON (Task 5 Step 1/6) ✓
3. `AgentConfig` reescrito via `Write`, não `Edit` gigante (Task 5 Step 4) ✓
4. Smoke render de `/d/agentes` movido para fim da Task 2, antes da Task 3 ✓
5. Helper `e2e/_seed.mjs` concreto (Task 0); todos os scripts importam dele ✓
6. Risco provider standalone verificado (`AgentPanelContext:53` usa `useGetAgentsConfig`) + smoke ✓
7. Teste da Task 1 declarado como snapshot barato; guard real = grep + redirect + Playwright ✓
8. `useAgentsAccessRedirect` extraído e reusado por `AgentStudioView` + `AgentesView` (Task 2) ✓
9. Todos os `jest` rodam da raiz com `--config client/jest.config.cjs` (sem `cd` composto) ✓

**Placeholder scan:** sem TBD/TODO; todo passo de código traz o código completo; auth-seed agora é arquivo concreto (Task 0). Verificações provider-heavy via Playwright com script concreto — declarado, não placeholder.

**Type/nome consistency:** `resolveDefaultProviderModel(providers: Array<{value:string}>, models: Record<string,unknown>)` idêntico entre helper/teste/uso; `Array.isArray` cobre `models` com chave `initial`. `AdvancedSection({label,children})` idêntico entre def/teste/uso. `useAgentsAccessRedirect(): boolean` idêntico entre def e os 2 consumidores. Ids `nav-agentes`/`nav-flows` consistentes. Chaves i18n novas criadas e consumidas dentro da fase; órfã removida no mesmo commit.
