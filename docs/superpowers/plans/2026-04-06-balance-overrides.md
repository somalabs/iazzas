# Balance Overrides per Role/Group — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to configure per-role and per-group balance settings via the existing AdminConfig override system, with the checkBalance middleware resolving effective config per user.

**Architecture:** Build `getEffectiveBalanceConfig(userId)` on top of the existing `getUserPrincipals()` + `getApplicableConfigs()` pipeline. Cache results in-memory with 60s TTL. Add a balance validation step on config upsert. Frontend gets a typed balance form builder in the Configs Dialog and effective config preview in the User Detail panel.

**Tech Stack:** MongoDB (existing AdminConfig collection), Express middleware (checkBalance), React (form builder), in-memory TTL cache.

---

### Task 1: Backend — getEffectiveBalanceConfig service

**Files:**
- Create: `packages/api/src/admin/effectiveBalance.ts`

- [ ] **Step 1: Create the effective balance resolution service**

This file exports a factory that creates the resolver with its TTL cache.

```ts
import type { TBalanceConfig } from 'librechat-data-provider';
import type { IConfig } from '@librechat/data-schemas';
import type { Types, ClientSession } from 'mongoose';

type Principal = { principalType: string; principalId?: string | Types.ObjectId };

const BALANCE_FIELDS: (keyof TBalanceConfig)[] = [
  'enabled',
  'startBalance',
  'autoRefillEnabled',
  'refillAmount',
  'refillIntervalValue',
  'refillIntervalUnit',
];

interface EffectiveBalanceDeps {
  getUserPrincipals: (
    params: { userId: string | Types.ObjectId; role?: string | null },
    session?: ClientSession,
  ) => Promise<Principal[]>;
  getApplicableConfigs: (
    principals?: Principal[],
    session?: ClientSession,
  ) => Promise<IConfig[]>;
  getGlobalBalanceConfig: () => TBalanceConfig;
}

interface CacheEntry {
  config: TBalanceConfig;
  sources: Record<string, { principalType: string; principalId: string; priority: number } | { source: string }>;
  expiresAt: number;
}

export type EffectiveBalanceResult = {
  effective: TBalanceConfig;
  sources: CacheEntry['sources'];
};

export function createEffectiveBalanceService(deps: EffectiveBalanceDeps) {
  const cache = new Map<string, CacheEntry>();
  const TTL_MS = 60_000;

  function invalidateCache(userId?: string) {
    if (userId) {
      cache.delete(userId);
    } else {
      cache.clear();
    }
  }

  async function getEffectiveBalanceConfig(userId: string): Promise<EffectiveBalanceResult> {
    const now = Date.now();
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return { effective: cached.config, sources: cached.sources };
    }

    const principals = await deps.getUserPrincipals({ userId });
    const configs = await deps.getApplicableConfigs(principals);
    const globalConfig = deps.getGlobalBalanceConfig();

    const effective: Record<string, unknown> = {};
    const sources: CacheEntry['sources'] = {};

    // Configs come sorted by priority. Walk in reverse (lowest priority first)
    // so higher-priority configs overwrite lower ones.
    const activeConfigs = configs.filter((c) => c.isActive);
    const sorted = [...activeConfigs].sort((a, b) => {
      const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (pDiff !== 0) return pDiff;
      // Specificity tiebreaker: user > group > role
      const order: Record<string, number> = { role: 0, group: 1, user: 2 };
      return (order[a.principalType] ?? 0) - (order[b.principalType] ?? 0);
    });

    for (const config of sorted) {
      const balanceOverride = (config.overrides as Record<string, unknown>)?.balance;
      if (!balanceOverride || typeof balanceOverride !== 'object') continue;

      for (const field of BALANCE_FIELDS) {
        const value = (balanceOverride as Record<string, unknown>)[field];
        if (value !== undefined) {
          effective[field] = value;
          sources[field] = {
            principalType: config.principalType,
            principalId: config.principalId?.toString() ?? '',
            priority: config.priority ?? 0,
          };
        }
      }
    }

    // Fill remaining fields from global config
    const result: TBalanceConfig = { ...globalConfig };
    for (const field of BALANCE_FIELDS) {
      if (effective[field] !== undefined) {
        (result as Record<string, unknown>)[field] = effective[field];
      } else {
        sources[field] = { source: 'global' };
      }
    }

    cache.set(userId, { config: result, sources, expiresAt: now + TTL_MS });
    return { effective: result, sources };
  }

  return { getEffectiveBalanceConfig, invalidateCache };
}
```

- [ ] **Step 2: Export from admin barrel**

Add to `packages/api/src/admin/index.ts`:
```ts
export { createEffectiveBalanceService } from './effectiveBalance';
export type { EffectiveBalanceResult } from './effectiveBalance';
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`

---

### Task 2: Backend — effective balance endpoint + route

**Files:**
- Create: `packages/api/src/admin/effectiveBalanceHandler.ts`
- Modify: `api/server/routes/admin/config.js`

- [ ] **Step 1: Create the handler**

```ts
import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';
import type { EffectiveBalanceResult } from './effectiveBalance';

export interface EffectiveBalanceHandlerDeps {
  getEffectiveBalanceConfig: (userId: string) => Promise<EffectiveBalanceResult>;
}

export function createEffectiveBalanceHandler(deps: EffectiveBalanceHandlerDeps) {
  return async function getEffectiveBalance(req: ServerRequest, res: Response) {
    try {
      const { userId } = req.params as { userId: string };
      if (!isValidObjectIdString(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      const result = await deps.getEffectiveBalanceConfig(userId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('[adminConfig] getEffectiveBalance error:', error);
      return res.status(500).json({ error: 'Failed to get effective balance config' });
    }
  };
}
```

- [ ] **Step 2: Export from admin barrel**

Add to `packages/api/src/admin/index.ts`:
```ts
export { createEffectiveBalanceHandler } from './effectiveBalanceHandler';
```

- [ ] **Step 3: Wire up route**

In `api/server/routes/admin/config.js`, add imports and route:

```js
const { createEffectiveBalanceService, createEffectiveBalanceHandler } = require('@librechat/api');
```

Create the service instance (after the existing handlers):
```js
const effectiveBalanceService = createEffectiveBalanceService({
  getUserPrincipals: db.getUserPrincipals,
  getApplicableConfigs: db.getApplicableConfigs,
  getGlobalBalanceConfig: () => {
    const { getBalanceConfig } = require('~/server/services/Config');
    return getBalanceConfig() ?? {};
  },
});

const effectiveBalanceHandler = createEffectiveBalanceHandler({
  getEffectiveBalanceConfig: effectiveBalanceService.getEffectiveBalanceConfig,
});
```

Add the route (before the `:principalType/:principalId` routes to avoid param collision):
```js
router.get('/effective/:userId/balance', handlers.listConfigs /* reuse read check */, effectiveBalanceHandler);
```

- [ ] **Step 4: Verify compilation**

Run: `npm run build:data-provider`

---

### Task 3: Backend — balance validation on config upsert + cache invalidation

**Files:**
- Modify: `packages/api/src/admin/config.ts`
- Modify: `api/server/routes/admin/config.js`

- [ ] **Step 1: Add balance validation to upsertConfigOverrides handler**

In `packages/api/src/admin/config.ts`, add to the `AdminConfigDeps` interface:
```ts
  validateBalanceOverride?: (overrides: Record<string, unknown>) => string | null;
```

In `upsertConfigOverrides`, before calling `upsertConfig`, add validation:
```ts
if (deps.validateBalanceOverride) {
  const validationError = deps.validateBalanceOverride(overrides as Record<string, unknown>);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
}
```

- [ ] **Step 2: Wire up validation in the route file**

In `api/server/routes/admin/config.js`, add the validation function to the deps:

```js
const { balanceSchema } = require('librechat-data-provider');

// Add to createAdminConfigHandlers deps:
validateBalanceOverride: (overrides) => {
  if (!overrides.balance) return null;
  const result = balanceSchema.safeParse(overrides.balance);
  if (!result.success) {
    return `Invalid balance override: ${result.error.issues.map(i => i.message).join(', ')}`;
  }
  return null;
},
```

- [ ] **Step 3: Add cache invalidation**

In `api/server/routes/admin/config.js`, after the existing `invalidateConfigCaches` calls in the handlers, also call:
```js
effectiveBalanceService.invalidateCache();
```

The cleanest way: add `invalidateEffectiveBalanceCache` to the `AdminConfigDeps` interface as optional, and call it after `invalidateConfigCaches` in the upsert/patch/delete handlers. Then wire it up in the route file.

Alternatively, since the route file already has access to `effectiveBalanceService`, wrap the existing `invalidateConfigCaches` dep:

```js
// In the deps, wrap the existing invalidateConfigCaches:
invalidateConfigCaches: (tenantId) => {
  invalidateConfigCaches(tenantId);
  effectiveBalanceService.invalidateCache();
},
```

- [ ] **Step 4: Verify compilation**

Run: `npm run build:data-provider`

---

### Task 4: Data layer — types, endpoints, hooks for effective balance

**Files:**
- Modify: `packages/data-provider/src/types/queries.ts`
- Modify: `packages/data-provider/src/api-endpoints.ts`
- Modify: `packages/data-provider/src/data-service.ts`
- Modify: `packages/data-provider/src/keys.ts`
- Modify: `client/src/data-provider/Admin/queries.ts`

- [ ] **Step 1: Add response type**

In `packages/data-provider/src/types/queries.ts`:
```ts
export type AdminEffectiveBalanceSource = {
  principalType: string;
  principalId: string;
  priority: number;
} | {
  source: string;
};

export type AdminEffectiveBalanceResponse = {
  effective: {
    enabled?: boolean;
    startBalance?: number;
    autoRefillEnabled?: boolean;
    refillAmount?: number;
    refillIntervalValue?: number;
    refillIntervalUnit?: string;
  };
  sources: Record<string, AdminEffectiveBalanceSource>;
};
```

- [ ] **Step 2: Add endpoint builder**

In `api-endpoints.ts`:
```ts
export const adminEffectiveBalanceConfig = (userId: string) =>
  `${adminConfigs()}/effective/${encodeURIComponent(userId)}/balance`;
```

- [ ] **Step 3: Add query key**

In `keys.ts`, add to QueryKeys:
```ts
adminEffectiveBalance: 'adminEffectiveBalance',
```

- [ ] **Step 4: Add data-service function**

In `data-service.ts`:
```ts
getAdminEffectiveBalance: (userId: string): Promise<q.AdminEffectiveBalanceResponse> => {
  return request.get(endpoints.adminEffectiveBalanceConfig(userId));
},
```

- [ ] **Step 5: Add React Query hook**

In `client/src/data-provider/Admin/queries.ts`:
```ts
export const useGetEffectiveBalanceConfigQuery = (
  userId: string,
  config?: UseQueryOptions<AdminEffectiveBalanceResponse>,
): QueryObserverResult<AdminEffectiveBalanceResponse> => {
  return useQuery<AdminEffectiveBalanceResponse>(
    [QueryKeys.adminEffectiveBalance, userId],
    () => dataService.getAdminEffectiveBalance(userId),
    { ...queryDefaults, enabled: !!userId, ...config },
  );
};
```

- [ ] **Step 6: Rebuild and verify**

Run: `npm run build:data-provider && npx tsc --noEmit`

---

### Task 5: Frontend — BalanceForm component for Configs Dialog

**Files:**
- Create: `client/src/components/Admin/configs/BalanceForm.tsx`
- Modify: `client/src/components/Admin/configs/Dialog.tsx`

- [ ] **Step 1: Create BalanceForm.tsx**

A typed form that renders balance fields and outputs JSON to merge into overrides.

```tsx
import { Switch } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface BalanceOverride {
  startBalance?: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  refillIntervalValue?: number;
  refillIntervalUnit?: string;
}

interface BalanceFormProps {
  value: BalanceOverride;
  onChange: (value: BalanceOverride) => void;
  disabled?: boolean;
}

const INTERVAL_UNITS = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'];

export default function BalanceForm({ value, onChange, disabled }: BalanceFormProps) {
  const localize = useLocalize();

  const update = (field: keyof BalanceOverride, v: unknown) => {
    onChange({ ...value, [field]: v });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-medium p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {localize('com_admin_configs_balance')}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            {localize('com_admin_configs_balance_start')}
          </label>
          <input
            type="number"
            min={0}
            value={value.startBalance ?? ''}
            onChange={(e) => update('startBalance', e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            {localize('com_admin_configs_balance_refill_amount')}
          </label>
          <input
            type="number"
            min={0}
            value={value.refillAmount ?? ''}
            onChange={(e) => update('refillAmount', e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled || !value.autoRefillEnabled}
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary">
          {localize('com_admin_configs_balance_auto_refill')}
        </label>
        <Switch
          checked={value.autoRefillEnabled ?? false}
          onCheckedChange={(checked) => update('autoRefillEnabled', checked)}
          aria-label={localize('com_admin_configs_balance_auto_refill')}
          disabled={disabled}
        />
      </div>
      {value.autoRefillEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {localize('com_admin_configs_balance_refill_interval')}
            </label>
            <input
              type="number"
              min={1}
              value={value.refillIntervalValue ?? ''}
              onChange={(e) => update('refillIntervalValue', e.target.value ? Number(e.target.value) : undefined)}
              disabled={disabled}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {localize('com_admin_configs_balance_refill_unit')}
            </label>
            <select
              value={value.refillIntervalUnit ?? 'days'}
              onChange={(e) => update('refillIntervalUnit', e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            >
              {INTERVAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into Configs Dialog**

Modify `client/src/components/Admin/configs/Dialog.tsx`:

Import BalanceForm. Parse the balance key from overridesJson state. Add a toggle/button "Balance Override" that shows/hides the BalanceForm. When the form changes, update the JSON textarea accordingly. When submitting, merge the balance form state into the overrides JSON.

The integration approach:
1. Parse overridesJson into an object
2. Extract `balance` key if present → feed to BalanceForm
3. When BalanceForm changes, update the `balance` key in the parsed object, re-serialize to JSON, update textarea
4. Add a "Add Balance Override" button that adds an empty balance key

---

### Task 6: Frontend — Effective config preview in BalanceCard

**Files:**
- Modify: `client/src/components/Admin/users/BalanceCard.tsx`

- [ ] **Step 1: Add effective config source display**

Import `useGetEffectiveBalanceConfigQuery` from `~/data-provider`.

Below the existing balance display, add a section that shows where each field comes from:

```tsx
const effectiveQuery = useGetEffectiveBalanceConfigQuery(userId);
const sources = effectiveQuery.data?.sources;
```

Show source attribution for key fields:
- "Start Balance: X (from role: Y)" or "(global)"
- "Refill: X every N units (from group: Z)" or "(global)"

Use small text-xs text-text-tertiary for the source labels.

---

### Task 7: Localization keys

**Files:**
- Modify: `client/src/locales/en/translation.json`
- Modify: `client/src/locales/pt-BR/translation.json`

- [ ] **Step 1: Add English keys**

```json
"com_admin_configs_balance": "Balance Override",
"com_admin_configs_balance_start": "Start Balance",
"com_admin_configs_balance_refill": "Refill",
"com_admin_configs_balance_refill_amount": "Refill Amount",
"com_admin_configs_balance_refill_interval": "Refill Interval",
"com_admin_configs_balance_refill_unit": "Refill Unit",
"com_admin_configs_balance_auto_refill": "Auto-Refill",
"com_admin_configs_balance_add": "Add Balance Override",
"com_admin_configs_balance_source": "Source"
```

- [ ] **Step 2: Add Portuguese keys**

```json
"com_admin_configs_balance": "Override de Saldo",
"com_admin_configs_balance_start": "Saldo Inicial",
"com_admin_configs_balance_refill": "Recarga",
"com_admin_configs_balance_refill_amount": "Valor da Recarga",
"com_admin_configs_balance_refill_interval": "Intervalo de Recarga",
"com_admin_configs_balance_refill_unit": "Unidade do Intervalo",
"com_admin_configs_balance_auto_refill": "Recarga Automática",
"com_admin_configs_balance_add": "Adicionar Override de Saldo",
"com_admin_configs_balance_source": "Origem"
```

---

### Task 8: Final verification

- [ ] **Step 1: Rebuild all packages**

Run: `npm run build:data-provider`

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.
