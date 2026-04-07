# Microsoft SSO + Auto-Assignment Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a YAML-based rules engine that auto-assigns new OIDC users to groups on first login based on token claims (email domain, department, AD groups, job title, etc.).

**Architecture:** A pure function `evaluateSSORules(claims, rules)` in `packages/api/src/sso/rules.ts` matches OIDC token claims against rules from `librechat.yaml`. It's called from `processOpenIDAuth()` in `api/strategies/openidStrategy.js` right after user creation. Matching groups are auto-created (source `'sso'`) and the user is added as a member. The YAML schema is validated via Zod in `packages/data-provider/src/config.ts`.

**Tech Stack:** TypeScript (rules engine), Zod (schema validation), MongoDB/Mongoose (group creation), Jest (tests).

---

### Task 1: Add `sso` to group source enum

**Files:**
- Modify: `packages/data-schemas/src/schema/group.ts`

- [ ] **Step 1: Add 'sso' to the source enum**

In `packages/data-schemas/src/schema/group.ts`, find:
```ts
    source: {
      type: String,
      enum: ['local', 'entra'],
```

Change to:
```ts
    source: {
      type: String,
      enum: ['local', 'entra', 'sso'],
```

- [ ] **Step 2: Commit**

```bash
git add packages/data-schemas/src/schema/group.ts
git commit -m "feat(sso): add 'sso' to group source enum"
```

---

### Task 2: Add ssoRules Zod schema to config

**Files:**
- Modify: `packages/data-provider/src/config.ts`

- [ ] **Step 1: Add the ssoRules schema**

In `packages/data-provider/src/config.ts`, add BEFORE the `configSchema` definition (before line 1052):

```ts
const ssoRuleMatchSchema = z.object({
  claim: z.string(),
  value: z.string().optional(),
  pattern: z.string().optional(),
  contains: z.string().optional(),
}).refine(
  (m) => [m.value, m.pattern, m.contains].filter(Boolean).length === 1,
  { message: 'Exactly one of value, pattern, or contains is required' },
);

const ssoRuleSchema = z.object({
  match: ssoRuleMatchSchema,
  addToGroups: z.array(z.string()).min(1),
});
```

- [ ] **Step 2: Add ssoRules to configSchema**

Inside the `configSchema = z.object({...})`, add after the `registration` field (after line 1083):

```ts
  ssoRules: z.array(ssoRuleSchema).optional(),
```

- [ ] **Step 3: Export the types**

After the existing `TCustomConfig` export (line 1136), add:

```ts
export type TSSORule = z.infer<typeof ssoRuleSchema>;
export type TSSOConfig = z.infer<typeof ssoRuleSchema>[];
```

- [ ] **Step 4: Rebuild and verify**

```bash
npm run build:data-provider
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/data-provider/src/config.ts
git commit -m "feat(sso): add ssoRules Zod schema to config"
```

---

### Task 3: Create evaluateSSORules pure function with tests

**Files:**
- Create: `packages/api/src/sso/rules.ts`
- Create: `packages/api/src/sso/index.ts`
- Create: `packages/api/src/sso/rules.spec.ts`

- [ ] **Step 1: Create the rules engine**

Create `packages/api/src/sso/rules.ts`:

```ts
import type { TSSORule } from 'librechat-data-provider';

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchesRule(claimValue: unknown, rule: TSSORule): boolean {
  const { match } = rule;

  if (match.value !== undefined) {
    return typeof claimValue === 'string' && claimValue.toLowerCase() === match.value.toLowerCase();
  }

  if (match.pattern !== undefined) {
    if (typeof claimValue !== 'string') return false;
    return globToRegex(match.pattern).test(claimValue);
  }

  if (match.contains !== undefined) {
    return Array.isArray(claimValue) && claimValue.includes(match.contains);
  }

  return false;
}

export function evaluateSSORules(
  claims: Record<string, unknown>,
  rules: TSSORule[],
): string[] {
  const groups = new Set<string>();

  for (const rule of rules) {
    const claimValue = claims[rule.match.claim];
    if (claimValue === undefined) continue;

    if (matchesRule(claimValue, rule)) {
      for (const group of rule.addToGroups) {
        groups.add(group);
      }
    }
  }

  return [...groups];
}
```

- [ ] **Step 2: Create barrel export**

Create `packages/api/src/sso/index.ts`:

```ts
export { evaluateSSORules } from './rules';
```

- [ ] **Step 3: Export from packages/api main barrel**

In `packages/api/src/index.ts` (or the main barrel file), add:

```ts
export { evaluateSSORules } from './sso';
```

Find the main barrel by checking what file exports other admin/app functions.

- [ ] **Step 4: Write tests**

Create `packages/api/src/sso/rules.spec.ts`:

```ts
import { evaluateSSORules } from './rules';
import type { TSSORule } from 'librechat-data-provider';

describe('evaluateSSORules', () => {
  it('returns empty array when no rules match', () => {
    const claims = { email: 'user@example.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', value: 'other@example.com' }, addToGroups: ['group-a'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('matches exact value (case-insensitive)', () => {
    const claims = { department: 'Engineering' };
    const rules: TSSORule[] = [
      { match: { claim: 'department', value: 'engineering' }, addToGroups: ['eng-team'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['eng-team']);
  });

  it('matches glob pattern', () => {
    const claims = { email: 'maria@marketing.azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['marketing'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['marketing']);
  });

  it('does not match glob pattern when different domain', () => {
    const claims = { email: 'maria@engineering.azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['marketing'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('matches array contains', () => {
    const claims = { groups: ['group-id-1', 'group-id-2', 'group-id-3'] };
    const rules: TSSORule[] = [
      { match: { claim: 'groups', contains: 'group-id-2' }, addToGroups: ['power-users'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['power-users']);
  });

  it('does not match contains when claim is not an array', () => {
    const claims = { groups: 'group-id-2' };
    const rules: TSSORule[] = [
      { match: { claim: 'groups', contains: 'group-id-2' }, addToGroups: ['power-users'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('accumulates groups from multiple matching rules', () => {
    const claims = { email: 'ana@marketing.azzas.com', department: 'Marketing' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['mkt-email'] },
      { match: { claim: 'department', value: 'Marketing' }, addToGroups: ['mkt-dept'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['mkt-email', 'mkt-dept']);
  });

  it('deduplicates groups when multiple rules assign the same group', () => {
    const claims = { email: 'ana@azzas.com', department: 'Marketing' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@azzas.com' }, addToGroups: ['all-users'] },
      { match: { claim: 'department', value: 'Marketing' }, addToGroups: ['all-users', 'mkt'] },
    ];
    const result = evaluateSSORules(claims, rules);
    expect(result).toEqual(['all-users', 'mkt']);
  });

  it('skips rules when claim is missing from token', () => {
    const claims = { email: 'user@azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'department', value: 'Engineering' }, addToGroups: ['eng'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('returns empty array when rules array is empty', () => {
    const claims = { email: 'user@azzas.com' };
    expect(evaluateSSORules(claims, [])).toEqual([]);
  });

  it('handles glob pattern with special regex characters in email', () => {
    const claims = { email: 'user+test@azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@azzas.com' }, addToGroups: ['all'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['all']);
  });

  it('assigns multiple groups from a single rule', () => {
    const claims = { department: 'Engineering' };
    const rules: TSSORule[] = [
      { match: { claim: 'department', value: 'Engineering' }, addToGroups: ['eng', 'dev-tools', 'ci-access'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['eng', 'dev-tools', 'ci-access']);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd packages/api && npx jest src/sso/rules.spec.ts --verbose
```
Expected: all 11 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/sso/
git commit -m "feat(sso): add evaluateSSORules pure function with tests"
```

---

### Task 4: Integrate rules into openidStrategy

**Files:**
- Modify: `api/strategies/openidStrategy.js`

- [ ] **Step 1: Add imports**

At the top of `api/strategies/openidStrategy.js`, add after the existing `require` block (after line 23):

```js
const { evaluateSSORules } = require('@librechat/api');
```

Also add group methods to the existing models import. Change:
```js
const { findUser, createUser, updateUser } = require('~/models');
```
to:
```js
const { findUser, createUser, updateUser, createGroup, addUserToGroup } = require('~/models');
```

- [ ] **Step 2: Add group assignment after user creation**

In `processOpenIDAuth()`, find the user creation block (around line 594):

```js
    const balanceConfig = getBalanceConfig(appConfig);
    user = await createUser(user, balanceConfig, true, true);
```

Add the following AFTER user creation (after `user = await createUser(...)`:

```js
    const ssoRules = appConfig?.ssoRules;
    if (ssoRules && ssoRules.length > 0 && user?._id) {
      const tokenClaims = { ...userinfo };
      const groupNames = evaluateSSORules(tokenClaims, ssoRules);
      if (groupNames.length > 0) {
        logger.info(`[openidStrategy] SSO rules matched ${groupNames.length} groups for user ${email}`, {
          groups: groupNames,
        });
        for (const groupName of groupNames) {
          try {
            const Group = require('mongoose').models.Group;
            let group = await Group.findOne({ name: groupName });
            if (!group) {
              group = await createGroup({
                name: groupName,
                source: 'sso',
                description: 'Auto-created by SSO rule',
              });
              logger.info(`[openidStrategy] Created SSO group: ${groupName}`);
            }
            await addUserToGroup(user._id, group._id);
          } catch (groupErr) {
            logger.error(`[openidStrategy] Failed to assign group "${groupName}" to user ${email}`, groupErr);
          }
        }
      }
    }
```

Key points:
- `userinfo` contains all the merged OIDC claims (from `tokenset.claims()` + provider userinfo endpoint) — this is already available in scope at the user creation point
- Each group assignment is wrapped in try/catch so a single group failure doesn't block the others
- Groups are found by name; created with `source: 'sso'` if they don't exist

- [ ] **Step 3: Verify the integration**

Verify the file compiles (it's JS so no TS check needed, but ensure no syntax errors):

```bash
node -c api/strategies/openidStrategy.js
```
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add api/strategies/openidStrategy.js
git commit -m "feat(sso): integrate SSO rules into OpenID login flow"
```

---

### Task 5: Also integrate rules into socialLogin for non-OpenID providers

**Files:**
- Modify: `api/strategies/socialLogin.js`
- Modify: `api/strategies/process.js`

The `socialLogin.js` handler is used by Google, GitHub, Discord, Facebook, Apple. While the primary target is Microsoft/OpenID, we should wire the rules engine here too so it works for any SSO provider.

- [ ] **Step 1: Add claims parameter to createSocialUser**

In `api/strategies/process.js`, modify the `createSocialUser` function to accept and pass through an optional `claims` parameter and `ssoRules`:

Find:
```js
const createSocialUser = async ({
  email,
  avatarUrl,
  provider,
  providerKey,
  providerId,
  username,
  name,
  appConfig,
  emailVerified,
}) => {
```

Change to:
```js
const createSocialUser = async ({
  email,
  avatarUrl,
  provider,
  providerKey,
  providerId,
  username,
  name,
  appConfig,
  emailVerified,
  claims,
}) => {
```

After the existing `return await getUserById(newUserId);` line (line 119), but BEFORE that return, add the SSO rules evaluation:

```js
  const ssoRules = appConfig?.ssoRules;
  if (ssoRules && ssoRules.length > 0 && claims) {
    const { evaluateSSORules } = require('@librechat/api');
    const { logger } = require('@librechat/data-schemas');
    const mongoose = require('mongoose');
    const groupNames = evaluateSSORules(claims, ssoRules);
    if (groupNames.length > 0) {
      logger.info(`[${provider}] SSO rules matched ${groupNames.length} groups for user ${email}`, {
        groups: groupNames,
      });
      const { createGroup, addUserToGroup } = require('~/models');
      for (const groupName of groupNames) {
        try {
          const Group = mongoose.models.Group;
          let group = await Group.findOne({ name: groupName });
          if (!group) {
            group = await createGroup({
              name: groupName,
              source: 'sso',
              description: 'Auto-created by SSO rule',
            });
          }
          await addUserToGroup(newUserId, group._id);
        } catch (groupErr) {
          logger.error(`[${provider}] Failed to assign group "${groupName}"`, groupErr);
        }
      }
    }
  }

  return await getUserById(newUserId);
```

Remove the old `return await getUserById(newUserId);` that was there before.

- [ ] **Step 2: Pass claims from socialLogin.js**

In `api/strategies/socialLogin.js`, modify the `createSocialUser` call (around line 89) to pass profile data as claims:

Find:
```js
      const newUser = await createSocialUser({
        email,
        avatarUrl,
        provider,
        providerKey: `${provider}Id`,
        providerId: id,
        username,
        name,
        emailVerified,
        appConfig,
      });
```

Change to:
```js
      const newUser = await createSocialUser({
        email,
        avatarUrl,
        provider,
        providerKey: `${provider}Id`,
        providerId: id,
        username,
        name,
        emailVerified,
        appConfig,
        claims: { email, name, username },
      });
```

Note: For non-OIDC providers, claims are limited to basic profile data. The `email` claim is the most useful for domain-based rules.

- [ ] **Step 3: Verify syntax**

```bash
node -c api/strategies/process.js && node -c api/strategies/socialLogin.js
```
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add api/strategies/process.js api/strategies/socialLogin.js
git commit -m "feat(sso): wire SSO rules into socialLogin for all providers"
```

---

### Task 6: Final verification

- [ ] **Step 1: Rebuild data-provider**

```bash
npm run build:data-provider
```
Expected: no errors.

- [ ] **Step 2: TypeScript check**

```bash
cd packages/api && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Run tests**

```bash
cd packages/api && npx jest src/sso/rules.spec.ts --verbose
```
Expected: all tests pass.

- [ ] **Step 4: Verify openidStrategy syntax**

```bash
node -c api/strategies/openidStrategy.js && node -c api/strategies/process.js && node -c api/strategies/socialLogin.js
```
Expected: no output (success).
