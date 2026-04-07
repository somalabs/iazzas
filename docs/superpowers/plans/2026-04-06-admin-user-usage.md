# Admin User Usage Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user usage visibility (balance, spend, transaction history) and credit management to the admin Users tab.

**Architecture:** Two new backend endpoints (`GET /:id/usage`, `POST /:id/balance`) in the existing admin users module, using MongoDB aggregation on `Transaction` + `Balance` collections. The frontend gains a detail side panel with balance card, model breakdown, transaction history, and credit adjustment dialog. The user list table is enriched with inline balance and 30d spend columns.

**Tech Stack:** MongoDB aggregation pipelines, Express handlers with dependency injection (existing pattern), React Query hooks, `@librechat/client` UI primitives (OGDialog, Spinner, Switch).

---

### Task 1: Add `note` field to Transaction schema

**Files:**
- Modify: `packages/data-schemas/src/schema/transaction.ts`

- [ ] **Step 1: Add `note` field to the Transaction interface**

```ts
// In ITransaction interface, add after messageId:
  note?: string;
```

- [ ] **Step 2: Add `note` field to the schema definition**

```ts
// In transactionSchema, add after messageId field:
    note: { type: String },
```

- [ ] **Step 3: Rebuild data-schemas**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`
Expected: Clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/data-schemas/src/schema/transaction.ts
git commit -m "feat(admin): add note field to Transaction schema for admin adjustments"
```

---

### Task 2: Add response types to data-provider

**Files:**
- Modify: `packages/data-provider/src/types/queries.ts`

- [ ] **Step 1: Add the new types**

Add after the existing admin types block:

```ts
export type AdminUserBalance = {
  tokenCredits: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  refillIntervalValue?: number;
  refillIntervalUnit?: string;
  lastRefill?: string;
};

export type AdminUserUsageSummary = {
  totalTokens: number;
  totalCreditsSpent: number;
  transactionCount: number;
};

export type AdminUserModelUsage = {
  model: string;
  tokens: number;
  credits: number;
};

export type AdminTransactionItem = {
  _id: string;
  createdAt: string;
  model?: string;
  tokenType: string;
  rawAmount?: number;
  tokenValue?: number;
  context?: string;
  note?: string;
};

export type AdminUserUsageResponse = {
  userId: string;
  balance: AdminUserBalance | null;
  summary: AdminUserUsageSummary;
  byModel: AdminUserModelUsage[];
  transactions: {
    items: AdminTransactionItem[];
    total: number;
    limit: number;
    offset: number;
  };
};

export type AdminAdjustBalanceResponse = {
  newBalance: number;
  transaction: AdminTransactionItem;
};
```

- [ ] **Step 2: Add balance and recentSpend to AdminUserListItem**

Modify the existing type:

```ts
export type AdminUserListItem = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  provider: string;
  createdAt?: string;
  updatedAt?: string;
  balance?: number;
  recentSpend?: number;
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/data-provider/src/types/queries.ts
git commit -m "feat(admin): add user usage and balance adjustment response types"
```

---

### Task 3: Add API endpoints and data-service functions

**Files:**
- Modify: `packages/data-provider/src/api-endpoints.ts`
- Modify: `packages/data-provider/src/data-service.ts`
- Modify: `packages/data-provider/src/keys.ts`

- [ ] **Step 1: Add URL builders**

In `api-endpoints.ts`, add after the existing admin endpoints:

```ts
export const adminUserUsage = (id: string) =>
  `${adminUsers()}/${encodeURIComponent(id)}/usage`;
export const adminUserBalance = (id: string) =>
  `${adminUsers()}/${encodeURIComponent(id)}/balance`;
```

- [ ] **Step 2: Add query and mutation keys**

In `keys.ts`, add to `QueryKeys`:

```ts
adminUserUsage: 'adminUserUsage',
```

Add to `MutationKeys`:

```ts
adjustAdminUserBalance: 'adjustAdminUserBalance',
```

- [ ] **Step 3: Add data-service functions**

In `data-service.ts`, add the imports for new types at the top with the other admin type imports, then add the service functions:

```ts
getAdminUserUsage: (
  id: string,
  params: { startDate: string; endDate: string; limit?: number; offset?: number },
): Promise<q.AdminUserUsageResponse> => {
  const queryStr = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.limit != null ? { limit: String(params.limit) } : {}),
    ...(params.offset != null ? { offset: String(params.offset) } : {}),
  }).toString();
  return request.get(`${endpoints.adminUserUsage(id)}?${queryStr}`);
},

adjustAdminUserBalance: (
  id: string,
  body: { amount: number; reason: string },
): Promise<q.AdminAdjustBalanceResponse> => {
  return request.post(endpoints.adminUserBalance(id), body);
},
```

- [ ] **Step 4: Rebuild data-provider**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`
Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add packages/data-provider/src/api-endpoints.ts packages/data-provider/src/data-service.ts packages/data-provider/src/keys.ts
git commit -m "feat(admin): add user usage and balance endpoints to data-provider"
```

---

### Task 4: Add React Query hooks

**Files:**
- Modify: `client/src/data-provider/Admin/queries.ts`
- Modify: `client/src/data-provider/Admin/mutations.ts`
- Modify: `client/src/data-provider/Admin/index.ts`

- [ ] **Step 1: Add usage query hook**

In `queries.ts`, add the import for `AdminUserUsageResponse` and add:

```ts
export const useGetAdminUserUsageQuery = (
  userId: string,
  params: { startDate: string; endDate: string; limit?: number; offset?: number },
  config?: UseQueryOptions<AdminUserUsageResponse>,
): QueryObserverResult<AdminUserUsageResponse> => {
  return useQuery<AdminUserUsageResponse>(
    [QueryKeys.adminUserUsage, userId, params.startDate, params.endDate, params.limit, params.offset],
    () => dataService.getAdminUserUsage(userId, params),
    { ...queryDefaults, enabled: !!userId, ...config },
  );
};
```

- [ ] **Step 2: Add balance adjustment mutation hook**

In `mutations.ts`, add the import for `AdminAdjustBalanceResponse` and `MutationKeys`, then add:

```ts
export const useAdjustAdminUserBalanceMutation = (
  options?: UseMutationOptions<
    AdminAdjustBalanceResponse,
    Error,
    { userId: string; amount: number; reason: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    [MutationKeys.adjustAdminUserBalance],
    ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      dataService.adjustAdminUserBalance(userId, { amount, reason }),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.adminUserUsage, variables.userId]);
        queryClient.invalidateQueries([QueryKeys.adminUsers]);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};
```

- [ ] **Step 3: Export new hooks from barrel**

In `index.ts`, verify both new hooks are re-exported (they should be via the `export *` pattern).

- [ ] **Step 4: Commit**

```bash
git add client/src/data-provider/Admin/
git commit -m "feat(admin): add user usage query and balance adjustment mutation hooks"
```

---

### Task 5: Backend — usage aggregation handler

**Files:**
- Create: `packages/api/src/admin/usage.ts`

- [ ] **Step 1: Create the usage service**

```ts
import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { Model, Types } from 'mongoose';
import type { IBalance } from '@librechat/data-schemas';
import type { ITransaction } from '@librechat/data-schemas/schema/transaction';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

export interface AdminUsageDeps {
  TransactionModel: Model<ITransaction>;
  BalanceModel: Model<IBalance>;
}

export function createAdminUsageHandlers(deps: AdminUsageDeps) {
  const { TransactionModel, BalanceModel } = deps;

  async function getUserUsageHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const { startDate, endDate, limit: rawLimit, offset: rawOffset } = req.query as Record<string, string>;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const limit = Math.min(Math.max(1, parseInt(rawLimit, 10) || 20), 100);
      const offset = Math.max(0, parseInt(rawOffset, 10) || 0);

      const mongoose = await import('mongoose');
      const userId = new mongoose.Types.ObjectId(id);

      const matchStage = {
        user: userId,
        createdAt: { $gte: start, $lte: end },
      };

      const [aggregation, balance, txTotal] = await Promise.all([
        TransactionModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$model',
              tokens: { $sum: { $abs: '$rawAmount' } },
              credits: { $sum: { $abs: '$tokenValue' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { credits: -1 } },
        ]),
        BalanceModel.findOne({ user: userId }).lean(),
        TransactionModel.countDocuments(matchStage),
      ]);

      const transactions = await TransactionModel.find(matchStage)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select('_id createdAt model tokenType rawAmount tokenValue context note')
        .lean();

      let totalTokens = 0;
      let totalCreditsSpent = 0;
      const byModel = aggregation.map((row) => {
        totalTokens += row.tokens;
        totalCreditsSpent += row.credits;
        return { model: row._id ?? 'unknown', tokens: row.tokens, credits: row.credits };
      });

      const balanceData = balance
        ? {
            tokenCredits: balance.tokenCredits,
            autoRefillEnabled: balance.autoRefillEnabled,
            refillAmount: balance.refillAmount,
            refillIntervalValue: balance.refillIntervalValue,
            refillIntervalUnit: balance.refillIntervalUnit,
            lastRefill: balance.lastRefill?.toISOString(),
          }
        : null;

      const txItems = transactions.map((tx) => ({
        _id: (tx._id as Types.ObjectId).toString(),
        createdAt: tx.createdAt?.toISOString() ?? '',
        model: tx.model,
        tokenType: tx.tokenType,
        rawAmount: tx.rawAmount,
        tokenValue: tx.tokenValue,
        context: tx.context,
        note: (tx as ITransaction & { note?: string }).note,
      }));

      return res.status(200).json({
        userId: id,
        balance: balanceData,
        summary: { totalTokens, totalCreditsSpent, transactionCount: txTotal },
        byModel,
        transactions: { items: txItems, total: txTotal, limit, offset },
      });
    } catch (error) {
      logger.error('[adminUsage] getUserUsage error:', error);
      return res.status(500).json({ error: 'Failed to get user usage' });
    }
  }

  async function adjustBalanceHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const { amount, reason } = req.body as { amount: number; reason: string };
      if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        return res.status(400).json({ error: 'amount must be a non-zero number' });
      }
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const txDoc = new TransactionModel({
        user: id,
        tokenType: 'credits',
        context: 'admin_adjustment',
        rawAmount: amount,
        tokenValue: amount,
        note: reason.trim(),
      });
      await txDoc.save();

      const updatedBalance = await BalanceModel.findOneAndUpdate(
        { user: id },
        { $inc: { tokenCredits: amount } },
        { upsert: true, new: true },
      ).lean();

      return res.status(200).json({
        newBalance: updatedBalance?.tokenCredits ?? 0,
        transaction: {
          _id: (txDoc._id as Types.ObjectId).toString(),
          createdAt: txDoc.createdAt?.toISOString() ?? new Date().toISOString(),
          model: undefined,
          tokenType: txDoc.tokenType,
          rawAmount: txDoc.rawAmount,
          tokenValue: txDoc.tokenValue,
          context: txDoc.context,
          note: (txDoc as ITransaction & { note?: string }).note,
        },
      });
    } catch (error) {
      logger.error('[adminUsage] adjustBalance error:', error);
      return res.status(500).json({ error: 'Failed to adjust balance' });
    }
  }

  return {
    getUserUsage: getUserUsageHandler,
    adjustBalance: adjustBalanceHandler,
  };
}
```

- [ ] **Step 2: Export from packages/api barrel**

Check if `packages/api/src/admin/index.ts` exists and add the export. If not, find where admin modules are exported and add:

```ts
export { createAdminUsageHandlers } from './usage';
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/admin/usage.ts packages/api/src/admin/index.ts
git commit -m "feat(admin): add user usage aggregation and balance adjustment handlers"
```

---

### Task 6: Backend — wire up routes

**Files:**
- Modify: `api/server/routes/admin/users.js`

- [ ] **Step 1: Import and create usage handlers**

Add to the top of the file:

```js
const { createAdminUsageHandlers } = require('@librechat/api');
const mongoose = require('mongoose');
```

After the existing `handlers` creation, add:

```js
const usageHandlers = createAdminUsageHandlers({
  TransactionModel: mongoose.models.Transaction,
  BalanceModel: mongoose.models.Balance,
});
```

- [ ] **Step 2: Add routes**

After the existing routes, add:

```js
router.get('/:id/usage', requireReadUsers, usageHandlers.getUserUsage);
router.post('/:id/balance', requireReadUsers, usageHandlers.adjustBalance);
```

- [ ] **Step 3: Rebuild packages**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add api/server/routes/admin/users.js
git commit -m "feat(admin): wire up user usage and balance routes"
```

---

### Task 7: Backend — enrich user list with balance and recent spend

**Files:**
- Modify: `packages/api/src/admin/users.ts`

- [ ] **Step 1: Add balance/spend dependencies**

Add to the `AdminUsersDeps` interface:

```ts
  findBalances: (userIds: string[]) => Promise<Array<{ user: string; tokenCredits: number }>>;
  getRecentSpend: (userIds: string[], since: Date) => Promise<Array<{ user: string; spend: number }>>;
```

- [ ] **Step 2: Enrich the listUsersHandler**

In `listUsersHandler`, after fetching `users` and `total`, add:

```ts
      const userIds = users.map((u) => u._id?.toString() ?? '');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [balances, spends] = await Promise.all([
        findBalances(userIds),
        getRecentSpend(userIds, thirtyDaysAgo),
      ]);

      const balanceMap = new Map(balances.map((b) => [b.user, b.tokenCredits]));
      const spendMap = new Map(spends.map((s) => [s.user, s.spend]));
```

Then in the `mapped` array, add the two new fields:

```ts
        balance: balanceMap.get(u._id?.toString() ?? '') ?? undefined,
        recentSpend: spendMap.get(u._id?.toString() ?? '') ?? undefined,
```

- [ ] **Step 3: Implement the dependencies in the route file**

In `api/server/routes/admin/users.js`, add the new deps to the `createAdminUsersHandlers` call:

```js
const handlers = createAdminUsersHandlers({
  findUsers: db.findUsers,
  countUsers: db.countUsers,
  deleteUserById: db.deleteUserById,
  deleteConfig: db.deleteConfig,
  deleteAclEntries: db.deleteAclEntries,
  findBalances: async (userIds) => {
    const balances = await mongoose.models.Balance.find(
      { user: { $in: userIds } },
      'user tokenCredits',
    ).lean();
    return balances.map((b) => ({ user: b.user.toString(), tokenCredits: b.tokenCredits }));
  },
  getRecentSpend: async (userIds, since) => {
    const results = await mongoose.models.Transaction.aggregate([
      { $match: { user: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) }, createdAt: { $gte: since } } },
      { $group: { _id: '$user', spend: { $sum: { $abs: '$tokenValue' } } } },
    ]);
    return results.map((r) => ({ user: r._id.toString(), spend: r.spend }));
  },
});
```

- [ ] **Step 4: Rebuild and verify**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`
Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/admin/users.ts api/server/routes/admin/users.js
git commit -m "feat(admin): enrich user list with balance and recent spend"
```

---

### Task 8: Frontend — User Detail panel

**Files:**
- Create: `client/src/components/Admin/users/Detail.tsx`

- [ ] **Step 1: Create the detail panel component**

```tsx
import { useState } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetAdminUserUsageQuery } from '~/data-provider';
import type { AdminUserListItem } from 'librechat-data-provider';
import BalanceCard from './BalanceCard';
import UsageByModel from './UsageByModel';
import Transactions from './Transactions';

interface DetailProps {
  user: AdminUserListItem;
  onClose: () => void;
}

export default function UserDetail({ user, onClose }: DetailProps) {
  const localize = useLocalize();
  const [txOffset, setTxOffset] = useState(0);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const usageQuery = useGetAdminUserUsageQuery(user.id, {
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
    limit: 20,
    offset: txOffset,
  });

  const usage = usageQuery.data;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mb-4 flex items-center justify-between border-b border-border-medium pb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{user.name}</h2>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
            {user.role}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-text-tertiary hover:text-text-primary"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {usageQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-6">
          <BalanceCard userId={user.id} balance={usage?.balance ?? null} />
          <UsageByModel data={usage?.byModel ?? []} />
          <Transactions
            items={usage?.transactions.items ?? []}
            total={usage?.transactions.total ?? 0}
            limit={20}
            offset={txOffset}
            onOffsetChange={setTxOffset}
          />
          <a
            href={`/d/admin/analytics?userId=${user.id}`}
            className="inline-block text-sm text-surface-submit hover:underline"
          >
            {localize('com_admin_users_view_analytics')} &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Admin/users/Detail.tsx
git commit -m "feat(admin): add user detail panel component"
```

---

### Task 9: Frontend — BalanceCard and AdjustDialog

**Files:**
- Create: `client/src/components/Admin/users/BalanceCard.tsx`
- Create: `client/src/components/Admin/users/AdjustDialog.tsx`

- [ ] **Step 1: Create BalanceCard**

```tsx
import { useState } from 'react';
import { useLocalize } from '~/hooks';
import type { AdminUserBalance } from 'librechat-data-provider';
import AdjustDialog from './AdjustDialog';

interface BalanceCardProps {
  userId: string;
  balance: AdminUserBalance | null;
}

export default function BalanceCard({ userId, balance }: BalanceCardProps) {
  const localize = useLocalize();
  const [dialogOpen, setDialogOpen] = useState(false);

  const credits = balance?.tokenCredits ?? 0;
  const refillLabel = balance?.autoRefillEnabled
    ? `${balance.refillAmount?.toLocaleString()} / ${balance.refillIntervalValue} ${balance.refillIntervalUnit}`
    : 'Desativado';

  return (
    <div className="rounded-lg border border-border-medium p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          {localize('com_admin_users_balance')}
        </h3>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-surface-submit px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_users_adjust_credits')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-tertiary">Credits</p>
          <p className="text-xl font-bold text-text-primary">{credits.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Auto-refill</p>
          <p className="text-sm text-text-secondary">{refillLabel}</p>
        </div>
      </div>
      <AdjustDialog userId={userId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Create AdjustDialog**

```tsx
import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useAdjustAdminUserBalanceMutation } from '~/data-provider';

interface AdjustDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdjustDialog({ userId, open, onOpenChange }: AdjustDialogProps) {
  const localize = useLocalize();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useAdjustAdminUserBalanceMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao ajustar saldo'),
  });

  useEffect(() => {
    if (open) {
      setAmount(0);
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === 0) {
      setError(localize('com_admin_users_adjust_amount') + ' must be non-zero');
      return;
    }
    if (!reason.trim()) {
      setError(localize('com_admin_users_adjust_reason') + ' is required');
      return;
    }
    mutation.mutate({ userId, amount, reason: reason.trim() });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-full max-w-md">
        <OGDialogTitle>{localize('com_admin_users_adjust_credits')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {localize('com_admin_users_adjust_amount')}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={mutation.isLoading}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              placeholder="Ex: 10000 (positivo) ou -5000 (negativo)"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Positivo = adicionar, Negativo = subtrair
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {localize('com_admin_users_adjust_reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={mutation.isLoading}
              rows={3}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              placeholder="Motivo do ajuste"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isLoading}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isLoading ? '...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Admin/users/BalanceCard.tsx client/src/components/Admin/users/AdjustDialog.tsx
git commit -m "feat(admin): add balance card and credit adjustment dialog"
```

---

### Task 10: Frontend — UsageByModel and Transactions

**Files:**
- Create: `client/src/components/Admin/users/UsageByModel.tsx`
- Create: `client/src/components/Admin/users/Transactions.tsx`

- [ ] **Step 1: Create UsageByModel**

```tsx
import { useLocalize } from '~/hooks';
import type { AdminUserModelUsage } from 'librechat-data-provider';

interface UsageByModelProps {
  data: AdminUserModelUsage[];
}

export default function UsageByModel({ data }: UsageByModelProps) {
  const localize = useLocalize();

  if (data.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">
        {localize('com_admin_users_spend_by_model')}
      </h3>
      <div className="overflow-hidden rounded-lg border border-border-medium">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-medium bg-surface-secondary">
            <tr>
              <th className="px-3 py-2 font-medium text-text-secondary">Modelo</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Tokens</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Credits</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.model} className="border-b border-border-light last:border-0">
                <td className="px-3 py-2 font-medium text-text-primary">{row.model}</td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {row.tokens.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {row.credits.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Transactions**

```tsx
import { useLocalize } from '~/hooks';
import type { AdminTransactionItem } from 'librechat-data-provider';

interface TransactionsProps {
  items: AdminTransactionItem[];
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}

export default function Transactions({ items, total, limit, offset, onOffsetChange }: TransactionsProps) {
  const localize = useLocalize();
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">
        {localize('com_admin_users_transaction_history')} ({total})
      </h3>
      <div className="overflow-hidden rounded-lg border border-border-medium">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border-medium bg-surface-secondary">
            <tr>
              <th className="px-3 py-2 font-medium text-text-secondary">Data</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Modelo</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Tipo</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Tokens</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Valor</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Contexto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx._id} className="border-b border-border-light last:border-0">
                <td className="px-3 py-2 text-text-secondary">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-text-primary">{tx.model ?? '—'}</td>
                <td className="px-3 py-2 text-text-secondary">{tx.tokenType}</td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {tx.rawAmount?.toLocaleString() ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {tx.tokenValue?.toLocaleString() ?? '—'}
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  {tx.note ?? tx.context ?? '—'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-tertiary">
                  Nenhuma transacao encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded border border-border-medium px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onOffsetChange(offset + limit)}
            disabled={currentPage >= totalPages}
            className="rounded border border-border-medium px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Admin/users/UsageByModel.tsx client/src/components/Admin/users/Transactions.tsx
git commit -m "feat(admin): add usage by model and transactions components"
```

---

### Task 11: Frontend — Update Users View with detail panel and enriched columns

**Files:**
- Modify: `client/src/components/Admin/users/View.tsx`

- [ ] **Step 1: Rewrite View.tsx with two-panel layout and enriched columns**

Replace the entire content of `View.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useListAdminUsersQuery, useSearchAdminUsersQuery } from '~/data-provider';
import type { AdminUserListItem } from 'librechat-data-provider';
import { cn } from '~/utils';
import UserDetail from './Detail';

const PAGE_SIZE = 20;

export default function UsersView() {
  const localize = useLocalize();
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  const isSearching = debouncedSearch.length >= 2;

  const listQuery = useListAdminUsersQuery(
    { limit: PAGE_SIZE, offset },
    { enabled: !isSearching },
  );
  const searchQueryResult = useSearchAdminUsersQuery(debouncedSearch, PAGE_SIZE, {
    enabled: isSearching,
  });

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => setDebouncedSearch(value.trim()), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const users = isSearching
    ? searchQueryResult.data?.users ?? []
    : listQuery.data?.users ?? [];
  const total = isSearching
    ? searchQueryResult.data?.total ?? 0
    : listQuery.data?.total ?? 0;
  const isLoading = isSearching ? searchQueryResult.isLoading : listQuery.isLoading;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const formatCredits = (n?: number): string => {
    if (n == null) {
      return '—';
    }
    return n.toLocaleString();
  };

  return (
    <div className="mx-auto flex max-w-7xl gap-6">
      <div className={cn('min-w-0 flex-1', selectedUser && 'max-w-[60%]')}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">
            {localize('com_admin_users_title')}
          </h1>
          <span className="text-sm text-text-secondary">
            {total} {total === 1 ? 'user' : 'users'}
          </span>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={localize('com_admin_users_search_placeholder')}
            className="w-full max-w-sm rounded-lg border border-border-medium bg-surface-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border-medium">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-medium bg-surface-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-secondary">Nome</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Email</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Role</th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary">
                      {localize('com_admin_users_balance')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-secondary">
                      {localize('com_admin_users_spend_30d')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const id = 'id' in user ? user.id : '';
                    const name = user.name;
                    const email = user.email;
                    const role = 'role' in user ? user.role : '—';
                    const balance = 'balance' in user ? (user as AdminUserListItem).balance : undefined;
                    const recentSpend = 'recentSpend' in user ? (user as AdminUserListItem).recentSpend : undefined;
                    const isSelected = selectedUser && 'id' in selectedUser && selectedUser.id === id;

                    return (
                      <tr
                        key={id}
                        onClick={() => 'role' in user && setSelectedUser(user as AdminUserListItem)}
                        className={cn(
                          'cursor-pointer border-b border-border-light last:border-0 hover:bg-surface-hover',
                          isSelected && 'bg-surface-hover',
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-text-primary">{name}</td>
                        <td className="px-4 py-3 text-text-secondary">{email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              role === 'ADMIN'
                                ? 'bg-surface-submit text-white'
                                : 'bg-surface-tertiary text-text-secondary',
                            )}
                          >
                            {role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-secondary">
                          {formatCredits(balance)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-secondary">
                          {formatCredits(recentSpend)}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                        {isSearching
                          ? localize('com_ui_nothing_found')
                          : 'Nenhum usuario encontrado'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isSearching && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-text-secondary">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <div className="w-[40%] min-w-[320px] rounded-lg border border-border-medium bg-surface-primary p-4">
          <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Admin/users/View.tsx
git commit -m "feat(admin): add two-panel user view with balance columns and detail panel"
```

---

### Task 12: Add localization keys

**Files:**
- Modify: `client/src/locales/en/translation.json`
- Modify: `client/src/locales/pt-BR/translation.json`

- [ ] **Step 1: Add English keys**

```json
"com_admin_users_balance": "Balance",
"com_admin_users_spend_30d": "Spend (30d)",
"com_admin_users_detail": "User Detail",
"com_admin_users_adjust_credits": "Adjust Credits",
"com_admin_users_adjust_amount": "Amount",
"com_admin_users_adjust_reason": "Reason",
"com_admin_users_view_analytics": "View in Analytics",
"com_admin_users_transaction_history": "Transaction History",
"com_admin_users_spend_by_model": "Spend by Model"
```

- [ ] **Step 2: Add Portuguese keys**

```json
"com_admin_users_balance": "Saldo",
"com_admin_users_spend_30d": "Gasto (30d)",
"com_admin_users_detail": "Detalhe do Usuário",
"com_admin_users_adjust_credits": "Ajustar Créditos",
"com_admin_users_adjust_amount": "Valor",
"com_admin_users_adjust_reason": "Motivo",
"com_admin_users_view_analytics": "Ver no Analytics",
"com_admin_users_transaction_history": "Histórico de Transações",
"com_admin_users_spend_by_model": "Gasto por Modelo"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/locales/en/translation.json client/src/locales/pt-BR/translation.json
git commit -m "feat(admin): add user usage localization keys (EN + PT-BR)"
```

---

### Task 13: Final verification

- [ ] **Step 1: Rebuild all packages**

Run: `cd /Users/arturlemos/Documents/Projetos/iazzas && npm run build:data-provider`

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Start dev servers and verify**

Run backend: `npm run backend:dev`
Run frontend: `npm run frontend:dev`

Verify:
1. `/d/admin/users` loads with Balance and Spend (30d) columns
2. Clicking a user opens the detail panel on the right
3. Detail panel shows balance card, model breakdown, transaction history
4. "Adjust Credits" button opens the dialog, submitting updates the balance
5. Pagination on transaction history works
6. "View in Analytics" link navigates correctly
