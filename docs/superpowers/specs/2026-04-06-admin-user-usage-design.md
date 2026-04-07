# Admin User Usage Detail

## Summary

Enrich the admin Users tab with per-user usage data (balance, spend, transaction history) and allow admins to manage individual user credits. Clicking a user opens a detail panel with full usage visibility and credit adjustment actions. The user table itself gains inline columns for balance and recent spend.

## Audience

Admin users only (role `ADMIN`). No group-manager or self-service access.

## Backend

### New Endpoints

#### `GET /api/admin/users/:id/usage`

Returns usage summary for a single user.

**Query params:**
- `startDate` (ISO string, required) — period start
- `endDate` (ISO string, required) — period end
- `limit` (number, default 20) — transactions per page
- `offset` (number, default 0) — transactions pagination offset

**Response:**
```json
{
  "userId": "abc123",
  "balance": {
    "tokenCredits": 15200,
    "autoRefillEnabled": true,
    "refillAmount": 10000,
    "refillIntervalValue": 30,
    "refillIntervalUnit": "days",
    "lastRefill": "2026-03-15T00:00:00Z"
  },
  "summary": {
    "totalTokens": 482000,
    "totalCreditsSpent": 9600,
    "transactionCount": 147
  },
  "byModel": [
    { "model": "claude-sonnet-4-6", "tokens": 320000, "credits": 6400 },
    { "model": "gpt-4o", "tokens": 162000, "credits": 3200 }
  ],
  "transactions": {
    "items": [
      {
        "_id": "tx_123",
        "createdAt": "2026-03-20T14:30:00Z",
        "model": "claude-sonnet-4-6",
        "tokenType": "completion",
        "rawAmount": -1200,
        "tokenValue": -2400,
        "context": "message",
        "note": null
      }
    ],
    "total": 147,
    "limit": 20,
    "offset": 0
  }
}
```

**Implementation:** Single aggregation pipeline on `Transaction` collection grouped by model, plus `Balance.findOne({ user })`. Transactions returned with offset/limit pagination sorted by `createdAt` desc.

#### `POST /api/admin/users/:id/balance`

Adjust a user's credit balance.

**Body:**
```json
{
  "amount": 50000,
  "reason": "Bonus credits for Q2"
}
```

- `amount` can be positive (add) or negative (subtract)
- Creates a `Transaction` record with `tokenType: 'credits'`, `context: 'admin_adjustment'`, and the reason stored in a new optional `note` field
- Updates the user's `Balance.tokenCredits` via `updateBalance`

**Response:**
```json
{
  "newBalance": 65200,
  "transaction": { ... }
}
```

### Data Layer Changes

- Add optional `note` field to Transaction schema (string, for admin-created adjustments)
- New service functions in `packages/api/src/admin/`:
  - `getUserUsage(userId, startDate, endDate, limit, offset)`
  - `adjustUserBalance(userId, amount, reason, adminId)`

### Query Keys & Mutation Keys

- `QueryKeys.adminUserUsage` — `['adminUserUsage', userId, startDate, endDate]`
- `MutationKeys.adjustAdminUserBalance`

## Frontend

### Users Table Enhancement

Add 2 columns to the existing Users table:
- **Balance** — `tokenCredits` formatted as number, color-coded (green > 50% of startBalance, yellow 10-50%, red < 10%)
- **Spend (30d)** — total credits spent in last 30 days

These require a modified `GET /api/admin/users` response that includes `balance` and `recentSpend` per user. Add these as a joined aggregation in the existing user list endpoint.

### User Detail Panel

Triggered by clicking a row in the Users table. Slides in from the right (reuse the two-panel pattern from Roles).

**Sections:**

1. **Header** — avatar, name, email, role badge
2. **Balance card** — current credits, auto-refill status, "Adjust Credits" button
3. **Adjust Credits dialog** — OGDialog with amount input (number, can be negative), reason textarea, confirm button
4. **Spend by model** — small table: model name, tokens, credits
5. **Transaction history** — paginated table: date, model, tokenType, rawAmount, tokenValue, context. Pagination controls (prev/next).
6. **Link to dashboard** — "View in Analytics" button that navigates to `/d/admin/analytics?userId={id}`

### Files

```
client/src/components/Admin/users/
  View.tsx          — EDIT: add balance/spend columns, row click handler
  Detail.tsx        — NEW: user detail side panel
  BalanceCard.tsx   — NEW: balance display + adjust button
  AdjustDialog.tsx  — NEW: credit adjustment dialog
  UsageByModel.tsx  — NEW: model breakdown table
  Transactions.tsx  — NEW: paginated transaction history
```

```
client/src/data-provider/Admin/
  queries.ts    — ADD: useGetAdminUserUsageQuery
  mutations.ts  — ADD: useAdjustAdminUserBalanceMutation
```

```
packages/data-provider/src/
  api-endpoints.ts  — ADD: adminUserUsage(id), adminUserBalance(id)
  data-service.ts   — ADD: getAdminUserUsage(), adjustAdminUserBalance()
  keys.ts           — ADD: QueryKeys.adminUserUsage, MutationKeys.adjustAdminUserBalance
```

```
packages/api/src/admin/
  users.ts    — EDIT: add balance/spend to list response
  usage.ts    — NEW: getUserUsage aggregation
  balance.ts  — NEW: adjustUserBalance service
```

```
packages/data-schemas/src/schema/
  transaction.ts  — EDIT: add optional `note` field
```

## Localization Keys

```
com_admin_users_balance
com_admin_users_spend_30d
com_admin_users_detail
com_admin_users_adjust_credits
com_admin_users_adjust_amount
com_admin_users_adjust_reason
com_admin_users_view_analytics
com_admin_users_transaction_history
com_admin_users_spend_by_model
```
