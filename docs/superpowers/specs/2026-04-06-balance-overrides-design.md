# Balance Overrides per Role/Group

## Summary

Allow admins to configure per-role and per-group balance settings (startBalance, refillAmount, refill interval, auto-refill toggle) using the existing AdminConfig override system. The `checkBalance` middleware resolves the effective balance config by walking the priority chain: user config > group config > role config > global config. A dedicated form builder in the Configs UI replaces raw JSON editing for balance overrides.

## Audience

Admin users only (role `ADMIN`).

## Design Principles

- Reuse the existing `AdminConfig` collection and override resolution — no new collections or models
- The `overrides` JSON field already supports arbitrary keys; we define `balance` as a well-known key with typed schema
- Priority resolution follows the same order the config system already uses (`priority` field, with principal specificity as tiebreaker: user > group > role)

## Backend

### Effective Balance Resolution

New service function:

```
getEffectiveBalanceConfig(userId: string): Promise<TBalanceConfig>
```

**Resolution chain:**
1. Load all `AdminConfig` records where the user is a member (by userId, by groupIds, by roleName)
2. Sort by priority (ascending = higher priority) and principal specificity
3. Deep-merge the `balance` key from each override, most specific wins per field
4. Fall back to global `librechat.yaml` balance config for any unset fields

**Where it's called:**
- `checkBalance` middleware — instead of reading `balanceConfig` from the global app config, call `getEffectiveBalanceConfig(userId)` to get the resolved config
- Lazy balance initialization — when creating a new Balance record, use the effective config's `startBalance` instead of the global one
- Auto-refill — use effective `refillAmount`, `refillIntervalValue`, `refillIntervalUnit`

### New Endpoint

#### `GET /api/admin/config/effective/:userId/balance`

Returns the resolved effective balance config for a specific user, showing which principal each field came from (for debugging/transparency).

**Response:**
```json
{
  "effective": {
    "enabled": true,
    "startBalance": 50000,
    "autoRefillEnabled": true,
    "refillAmount": 25000,
    "refillIntervalValue": 7,
    "refillIntervalUnit": "days"
  },
  "sources": {
    "startBalance": { "principalType": "role", "principalId": "power-user", "priority": 5 },
    "refillAmount": { "principalType": "group", "principalId": "marketing-team", "priority": 3 },
    "refillIntervalValue": { "principalType": "role", "principalId": "power-user", "priority": 5 },
    "refillIntervalUnit": { "principalType": "role", "principalId": "power-user", "priority": 5 },
    "autoRefillEnabled": { "principalType": "role", "principalId": "power-user", "priority": 5 },
    "enabled": { "source": "global" }
  }
}
```

### Caching

`getEffectiveBalanceConfig` is called on every LLM request (via `checkBalance`). To avoid N database queries per message:
- Cache resolved config in-memory with TTL of 60 seconds, keyed by userId
- Invalidate on AdminConfig upsert/delete mutations (emit event via the existing config mutation hooks)
- Use a simple `Map<string, { config: TBalanceConfig, expiresAt: number }>` — no external cache dependency

### Data Layer Changes

No schema changes needed. The `AdminConfig.overrides` field already stores arbitrary JSON. We define the convention:

```json
{
  "balance": {
    "startBalance": 50000,
    "autoRefillEnabled": true,
    "refillAmount": 25000,
    "refillIntervalValue": 7,
    "refillIntervalUnit": "days"
  }
}
```

Validation: when upserting a config that contains a `balance` key, validate against the existing `balanceSchema` from `packages/data-provider/src/config.ts`. Return 400 if invalid.

### Files

```
packages/api/src/admin/
  config.ts  — EDIT: add balance validation on upsert
  balance.ts — EDIT: add getEffectiveBalanceConfig()

packages/api/src/middleware/
  checkBalance.ts — EDIT: use getEffectiveBalanceConfig() instead of global config
```

## Frontend

### Balance Form Builder

When creating/editing a config override in the Configs Dialog, detect if the `overrides` JSON contains a `balance` key (or offer a "Add balance override" button). When active, show a typed form instead of raw JSON for the balance portion:

**Fields:**
- Start Balance (number input)
- Auto-Refill (toggle)
- Refill Amount (number input, shown when auto-refill on)
- Refill Interval (number input + unit select: seconds/minutes/hours/days/weeks/months, shown when auto-refill on)

The form builder generates the JSON, which is merged into the overrides object. Other keys in overrides remain editable as raw JSON.

### Effective Config Preview

In the User Detail panel (from Spec 1), show the effective balance config with source attribution:
- "Start Balance: 50,000 (from role: power-user)"
- "Refill: 25,000 every 7 days (from group: marketing-team)"

This helps admins understand why a user has certain limits.

### Files

```
client/src/components/Admin/configs/
  Dialog.tsx          — EDIT: integrate BalanceForm
  BalanceForm.tsx     — NEW: typed form for balance overrides

client/src/components/Admin/users/
  BalanceCard.tsx     — EDIT: show effective config sources

client/src/data-provider/Admin/
  queries.ts  — ADD: useGetEffectiveBalanceConfigQuery
```

```
packages/data-provider/src/
  api-endpoints.ts  — ADD: adminEffectiveBalanceConfig(userId)
  data-service.ts   — ADD: getEffectiveBalanceConfig()
  keys.ts           — ADD: QueryKeys.adminEffectiveBalance
```

## Localization Keys

```
com_admin_configs_balance
com_admin_configs_balance_start
com_admin_configs_balance_refill
com_admin_configs_balance_refill_amount
com_admin_configs_balance_refill_interval
com_admin_configs_balance_refill_unit
com_admin_configs_balance_auto_refill
com_admin_configs_balance_add
com_admin_configs_balance_source
```
