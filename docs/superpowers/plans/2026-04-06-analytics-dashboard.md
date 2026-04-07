# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only analytics dashboard at `/d/admin/analytics` showing KPI cards, time-series trend, model breakdown, and top users, all powered by a single MongoDB `$facet` aggregation over the `Transaction` collection.

**Architecture:** A new `analytics.ts` handler in `packages/api/src/admin/` exposes two handler factories (dashboard aggregation and distinct models list) that are wired via a new `api/server/routes/admin/analytics.js` route file and mounted in both `api/server/index.js` and `api/server/routes/index.js`. The shared data layer (types, endpoints, data-service, query keys) lives in `packages/data-provider`, consumed by React Query hooks in `client/src/data-provider/Admin/` and rendered by six new components under `client/src/components/Admin/analytics/`.

**Tech Stack:** TypeScript (backend handlers), MongoDB `$facet` aggregation, Express.js (route wiring), React + `recharts` (frontend charts), React Query with 5-minute stale time (caching), `useLocalize` for all user-facing text.

---

### Task 1: Backend analytics aggregation handler

**Files:**
- Create: `packages/api/src/admin/analytics.ts`

- [ ] **Step 1: Create the analytics handler file**

```typescript
import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

export interface AdminAnalyticsDeps {
  TransactionModel: Model<mongoose.Document>;
  UserModel: Model<mongoose.Document>;
}

type GroupBy = 'day' | 'week' | 'month';

const DATE_TRUNC_EXPR: Record<GroupBy, object> = {
  day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  week: {
    $dateToString: {
      format: '%Y-%m-%d',
      date: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'monday' } },
    },
  },
  month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
};

function parseGroupBy(raw: unknown): GroupBy {
  if (raw === 'week' || raw === 'month') return raw;
  return 'day';
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function createAdminAnalyticsHandlers(deps: AdminAnalyticsDeps) {
  const { TransactionModel, UserModel } = deps;

  async function getDashboardHandler(req: ServerRequest, res: Response) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const startDate = parseDate(q.startDate);
      const endDate = parseDate(q.endDate);

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required ISO strings' });
      }

      const groupBy = parseGroupBy(q.groupBy);

      const matchStage: Record<string, unknown> = { createdAt: { $gte: startDate, $lte: endDate } };
      if (typeof q.userId === 'string' && q.userId) {
        matchStage['user'] = new mongoose.Types.ObjectId(q.userId);
      }
      if (typeof q.model === 'string' && q.model) {
        matchStage['model'] = q.model;
      }

      const dateTruncExpr = DATE_TRUNC_EXPR[groupBy];

      const [facetResult] = await TransactionModel.aggregate([
        { $match: matchStage },
        {
          $facet: {
            kpisRaw: [
              {
                $group: {
                  _id: null,
                  totalTokens: { $sum: { $abs: '$rawAmount' } },
                  totalCreditsSpent: { $sum: { $abs: '$tokenValue' } },
                  userSet: { $addToSet: '$user' },
                },
              },
            ],
            timeSeries: [
              {
                $group: {
                  _id: dateTruncExpr,
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                  userSet: { $addToSet: '$user' },
                },
              },
              {
                $project: {
                  _id: 0,
                  date: '$_id',
                  tokens: 1,
                  credits: 1,
                  activeUsers: { $size: '$userSet' },
                },
              },
              { $sort: { date: 1 } },
            ],
            byModelRaw: [
              {
                $group: {
                  _id: '$model',
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                },
              },
              { $sort: { credits: -1 } },
            ],
            topUsersRaw: [
              {
                $group: {
                  _id: '$user',
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                },
              },
              { $sort: { credits: -1 } },
              { $limit: 10 },
              {
                $lookup: {
                  from: 'users',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'userDoc',
                  pipeline: [{ $project: { name: 1, email: 1 } }],
                },
              },
            ],
          },
        },
      ]);

      const kpiRaw = facetResult?.kpisRaw?.[0] ?? {
        totalTokens: 0,
        totalCreditsSpent: 0,
        userSet: [],
      };
      const activeUsers: number = (kpiRaw.userSet as unknown[]).length;
      const kpis = {
        totalTokens: kpiRaw.totalTokens ?? 0,
        totalCreditsSpent: kpiRaw.totalCreditsSpent ?? 0,
        activeUsers,
        avgCreditsPerUser: activeUsers > 0 ? Math.round((kpiRaw.totalCreditsSpent ?? 0) / activeUsers) : 0,
      };

      const totalCredits = kpis.totalCreditsSpent;
      const byModel = ((facetResult?.byModelRaw ?? []) as Array<{
        _id: string | null;
        tokens: number;
        credits: number;
      }>).map((row) => ({
        model: row._id ?? 'unknown',
        tokens: row.tokens,
        credits: row.credits,
        percentage: totalCredits > 0 ? Math.round((row.credits / totalCredits) * 1000) / 10 : 0,
      }));

      const topUsers = ((facetResult?.topUsersRaw ?? []) as Array<{
        _id: mongoose.Types.ObjectId;
        tokens: number;
        credits: number;
        userDoc: Array<{ name?: string; email?: string }>;
      }>).map((row) => {
        const doc = row.userDoc[0] ?? {};
        return {
          userId: row._id.toString(),
          name: doc.name ?? '',
          email: doc.email ?? '',
          tokens: row.tokens,
          credits: row.credits,
        };
      });

      return res.status(200).json({
        kpis,
        timeSeries: facetResult?.timeSeries ?? [],
        byModel,
        topUsers,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy,
        },
      });
    } catch (error) {
      logger.error('[adminAnalytics] getDashboard error:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  async function getModelsHandler(_req: ServerRequest, res: Response) {
    try {
      const models = await TransactionModel.distinct('model', { model: { $ne: null } });
      return res.status(200).json({ models: (models as string[]).filter(Boolean).sort() });
    } catch (error) {
      logger.error('[adminAnalytics] getModels error:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
  }

  return {
    getDashboard: getDashboardHandler,
    getModels: getModelsHandler,
  };
}
```

- [ ] **Step 2: Export from packages/api/src/admin/index.ts**

Add to `packages/api/src/admin/index.ts`:

```typescript
export { createAdminAnalyticsHandlers } from './analytics';
export type { AdminAnalyticsDeps } from './analytics';
```

- [ ] **Step 3: Add compound index to Transaction schema**

In `packages/data-schemas/src/schema/transaction.ts`, add after the existing schema definition and before `export default transactionSchema;`:

```typescript
transactionSchema.index({ createdAt: 1, model: 1 });
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /path/to/project && npx tsc --noEmit -p packages/api/tsconfig.json
# Expected: no errors
```

---

### Task 2: Route wiring

**Files:**
- Create: `api/server/routes/admin/analytics.js`
- Modify: `api/server/routes/index.js`
- Modify: `api/server/index.js`

- [ ] **Step 1: Create the analytics route file**

```javascript
const express = require('express');
const { createAdminAnalyticsHandlers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const mongoose = require('mongoose');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const handlers = createAdminAnalyticsHandlers({
  TransactionModel: mongoose.models.Transaction || mongoose.model('Transaction'),
  UserModel: mongoose.models.User || mongoose.model('User'),
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', handlers.getDashboard);
router.get('/models', handlers.getModels);

module.exports = router;
```

- [ ] **Step 2: Register in api/server/routes/index.js**

Add after line 9 (`const adminUsers = require('./admin/users');`):

```javascript
const adminAnalytics = require('./admin/analytics');
```

Add `adminAnalytics` to the `module.exports` object alongside the other admin routes.

- [ ] **Step 3: Mount in api/server/index.js**

Add after line 161 (`app.use('/api/admin/users', routes.adminUsers);`):

```javascript
app.use('/api/admin/analytics', routes.adminAnalytics);
```

- [ ] **Step 4: Smoke test the endpoints**

```bash
# Start backend
npm run backend

# In another terminal — replace TOKEN with a valid admin JWT
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3080/api/admin/analytics?startDate=2026-03-01T00:00:00Z&endDate=2026-03-31T23:59:59Z"
# Expected: JSON with kpis, timeSeries, byModel, topUsers, period keys

curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3080/api/admin/analytics/models"
# Expected: { "models": [...] }
```

---

### Task 3: Data layer — types, endpoints, keys, data-service

**Files:**
- Modify: `packages/data-provider/src/types/queries.ts`
- Modify: `packages/data-provider/src/api-endpoints.ts`
- Modify: `packages/data-provider/src/keys.ts`
- Modify: `packages/data-provider/src/data-service.ts`

- [ ] **Step 1: Add response types to packages/data-provider/src/types/queries.ts**

Add before the `MCPServerStatus` interface (after `AdminAdjustBalanceResponse`):

```typescript
export type AdminAnalyticsKPIs = {
  totalTokens: number;
  totalCreditsSpent: number;
  activeUsers: number;
  avgCreditsPerUser: number;
};

export type AdminAnalyticsTimePoint = {
  date: string;
  tokens: number;
  credits: number;
  activeUsers: number;
};

export type AdminAnalyticsModelRow = {
  model: string;
  tokens: number;
  credits: number;
  percentage: number;
};

export type AdminAnalyticsTopUser = {
  userId: string;
  name: string;
  email: string;
  tokens: number;
  credits: number;
};

export type AdminAnalyticsResponse = {
  kpis: AdminAnalyticsKPIs;
  timeSeries: AdminAnalyticsTimePoint[];
  byModel: AdminAnalyticsModelRow[];
  topUsers: AdminAnalyticsTopUser[];
  period: {
    startDate: string;
    endDate: string;
    groupBy: 'day' | 'week' | 'month';
  };
};

export type AdminAnalyticsModelsResponse = {
  models: string[];
};

export type AdminAnalyticsParams = {
  startDate: string;
  endDate: string;
  userId?: string;
  model?: string;
  groupBy?: 'day' | 'week' | 'month';
};
```

- [ ] **Step 2: Add URL builders to packages/data-provider/src/api-endpoints.ts**

Add after `adminEffectiveBalanceConfig`:

```typescript
export const adminAnalytics = () => `${BASE_URL}/api/admin/analytics`;
export const adminAnalyticsModels = () => `${BASE_URL}/api/admin/analytics/models`;
```

- [ ] **Step 3: Add query keys to packages/data-provider/src/keys.ts**

Add to the `QueryKeys` enum, after `adminEffectiveBalance`:

```typescript
  adminAnalytics = 'adminAnalytics',
  adminAnalyticsModels = 'adminAnalyticsModels',
```

- [ ] **Step 4: Add service functions to packages/data-provider/src/data-service.ts**

Add after `getAdminEffectiveBalance`:

```typescript
export function getAdminAnalytics(
  params: q.AdminAnalyticsParams,
): Promise<q.AdminAnalyticsResponse> {
  const queryStr = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null) as [string, string][],
  ).toString();
  return request.get(`${endpoints.adminAnalytics()}?${queryStr}`);
}

export function getAdminAnalyticsModels(): Promise<q.AdminAnalyticsModelsResponse> {
  return request.get(endpoints.adminAnalyticsModels());
}
```

- [ ] **Step 5: Build data-provider**

```bash
npm run build:data-provider
# Expected: build completes with no TypeScript errors
```

---

### Task 4: React Query hooks

**Files:**
- Modify: `client/src/data-provider/Admin/queries.ts`

- [ ] **Step 1: Add the two new hooks**

Add at the end of `client/src/data-provider/Admin/queries.ts`:

```typescript
export const useGetAdminAnalyticsQuery = (
  params: AdminAnalyticsParams,
  config?: UseQueryOptions<AdminAnalyticsResponse>,
): QueryObserverResult<AdminAnalyticsResponse> => {
  return useQuery<AdminAnalyticsResponse>(
    [QueryKeys.adminAnalytics, params.startDate, params.endDate, params.userId, params.model, params.groupBy],
    () => dataService.getAdminAnalytics(params),
    {
      ...queryDefaults,
      staleTime: 5 * 60 * 1000,
      enabled: !!params.startDate && !!params.endDate,
      ...config,
    },
  );
};

export const useGetAdminAnalyticsModelsQuery = (
  config?: UseQueryOptions<AdminAnalyticsModelsResponse>,
): QueryObserverResult<AdminAnalyticsModelsResponse> => {
  return useQuery<AdminAnalyticsModelsResponse>(
    [QueryKeys.adminAnalyticsModels],
    () => dataService.getAdminAnalyticsModels(),
    { ...queryDefaults, staleTime: 5 * 60 * 1000, ...config },
  );
};
```

- [ ] **Step 2: Add the new type imports to the import block**

The import block at the top of `queries.ts` already pulls from `librechat-data-provider`. Extend it to include:

```typescript
import type {
  // ... existing imports ...
  AdminAnalyticsResponse,
  AdminAnalyticsModelsResponse,
  AdminAnalyticsParams,
} from 'librechat-data-provider';
```

---

### Task 5: Install recharts

**Files:**
- Modify: `client/package.json` (via npm install)

- [ ] **Step 1: Install recharts in the client workspace**

```bash
cd /path/to/project && npm install recharts --workspace=client
# Expected: recharts added to client/package.json dependencies
```

- [ ] **Step 2: Verify recharts resolves**

```bash
node -e "require('./client/node_modules/recharts')" && echo "OK"
# Expected: OK
```

---

### Task 6: Frontend components

**Files:**
- Create: `client/src/components/Admin/analytics/KPICards.tsx`
- Create: `client/src/components/Admin/analytics/Filters.tsx`
- Create: `client/src/components/Admin/analytics/TrendChart.tsx`
- Create: `client/src/components/Admin/analytics/ModelChart.tsx`
- Create: `client/src/components/Admin/analytics/TopUsers.tsx`
- Create: `client/src/components/Admin/analytics/View.tsx`

- [ ] **Step 1: Create KPICards.tsx**

```tsx
import { useLocalize } from '~/hooks';
import type { AdminAnalyticsKPIs } from 'librechat-data-provider';

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

interface CardProps {
  label: string;
  value: string;
}

function KPICard({ label, value }: CardProps) {
  return (
    <div className="rounded-xl border border-border-medium bg-surface-secondary p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

interface Props {
  kpis: AdminAnalyticsKPIs;
}

export default function KPICards({ kpis }: Props) {
  const localize = useLocalize();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        label={localize('com_admin_analytics_total_tokens')}
        value={formatNumber(kpis.totalTokens)}
      />
      <KPICard
        label={localize('com_admin_analytics_credits_spent')}
        value={formatNumber(kpis.totalCreditsSpent)}
      />
      <KPICard
        label={localize('com_admin_analytics_active_users')}
        value={kpis.activeUsers.toLocaleString()}
      />
      <KPICard
        label={localize('com_admin_analytics_avg_per_user')}
        value={formatNumber(kpis.avgCreditsPerUser)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create Filters.tsx**

```tsx
import { useLocalize } from '~/hooks';
import { useSearchAdminUsersQuery } from '~/data-provider';
import { useGetAdminAnalyticsModelsQuery } from '~/data-provider';
import type { AdminAnalyticsParams } from 'librechat-data-provider';

type GroupBy = 'day' | 'week' | 'month';

interface Props {
  params: AdminAnalyticsParams;
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  onChange: (next: Partial<AdminAnalyticsParams>) => void;
}

export default function AnalyticsFilters({ params, userSearch, onUserSearchChange, onChange }: Props) {
  const localize = useLocalize();
  const modelsQuery = useGetAdminAnalyticsModelsQuery();
  const usersQuery = useSearchAdminUsersQuery(userSearch, 20, { enabled: userSearch.length >= 2 });

  const models = modelsQuery.data?.models ?? [];
  const userResults = usersQuery.data?.users ?? [];

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary" htmlFor="analytics-start">
          {localize('com_admin_analytics_period')}
        </label>
        <input
          id="analytics-start"
          type="date"
          value={params.startDate.slice(0, 10)}
          onChange={(e) => onChange({ startDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : params.startDate })}
          className="rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
        />
        <span className="text-sm text-text-secondary">—</span>
        <input
          id="analytics-end"
          type="date"
          value={params.endDate.slice(0, 10)}
          onChange={(e) => onChange({ endDate: e.target.value ? `${e.target.value}T23:59:59.999Z` : params.endDate })}
          className="rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
        />
      </div>

      <select
        aria-label={localize('com_admin_analytics_by_model')}
        value={params.model ?? ''}
        onChange={(e) => onChange({ model: e.target.value || undefined })}
        className="rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
      >
        <option value="">{localize('com_admin_analytics_all_models')}</option>
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <div className="relative">
        <input
          type="text"
          placeholder={localize('com_admin_analytics_all_users')}
          value={userSearch}
          onChange={(e) => onUserSearchChange(e.target.value)}
          className="rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
        />
        {userResults.length > 0 && userSearch.length >= 2 && (
          <ul className="absolute top-full z-10 mt-1 w-60 rounded border border-border-medium bg-surface-primary shadow-md">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                onClick={() => { onChange({ userId: undefined }); onUserSearchChange(''); }}
              >
                {localize('com_admin_analytics_all_users')}
              </button>
            </li>
            {userResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                  onClick={() => { onChange({ userId: u.id }); onUserSearchChange(u.name); }}
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-text-secondary">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <select
        aria-label={localize('com_admin_analytics_group_by')}
        value={params.groupBy ?? 'day'}
        onChange={(e) => onChange({ groupBy: e.target.value as GroupBy })}
        className="rounded border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
      >
        <option value="day">{localize('com_admin_analytics_group_day')}</option>
        <option value="week">{localize('com_admin_analytics_group_week')}</option>
        <option value="month">{localize('com_admin_analytics_group_month')}</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create TrendChart.tsx**

```tsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useLocalize } from '~/hooks';
import type { AdminAnalyticsTimePoint } from 'librechat-data-provider';

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

interface Props {
  data: AdminAnalyticsTimePoint[];
}

export default function TrendChart({ data }: Props) {
  const localize = useLocalize();

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border-medium bg-surface-secondary text-sm text-text-secondary">
        {localize('com_admin_analytics_no_data')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-medium bg-surface-secondary p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">
        {localize('com_admin_analytics_trend')}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
          <Line
            type="monotone"
            dataKey="tokens"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
            name={localize('com_admin_analytics_total_tokens')}
          />
          <Line
            type="monotone"
            dataKey="credits"
            stroke="#a855f7"
            dot={false}
            strokeWidth={2}
            name={localize('com_admin_analytics_credits_spent')}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create ModelChart.tsx**

```tsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useLocalize } from '~/hooks';
import type { AdminAnalyticsModelRow } from 'librechat-data-provider';

const BAR_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

interface Props {
  data: AdminAnalyticsModelRow[];
}

export default function ModelChart({ data }: Props) {
  const localize = useLocalize();

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border-medium bg-surface-secondary text-sm text-text-secondary">
        {localize('com_admin_analytics_no_data')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-medium bg-surface-secondary p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">
        {localize('com_admin_analytics_by_model')}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
        >
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="model"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              [`${value.toLocaleString()}`, name]
            }
          />
          <Bar dataKey="credits" name={localize('com_admin_analytics_credits_spent')} radius={[0, 4, 4, 0]}>
            {data.map((_entry, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Create TopUsers.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import type { AdminAnalyticsTopUser } from 'librechat-data-provider';

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

interface Props {
  users: AdminAnalyticsTopUser[];
}

export default function TopUsers({ users }: Props) {
  const localize = useLocalize();
  const navigate = useNavigate();

  if (users.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border-medium bg-surface-secondary text-sm text-text-secondary">
        {localize('com_admin_analytics_no_data')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-medium bg-surface-secondary p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">
        {localize('com_admin_analytics_top_users')}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-secondary">
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">{localize('com_admin_users_title')}</th>
            <th className="pb-2 text-right font-medium">{localize('com_admin_analytics_total_tokens')}</th>
            <th className="pb-2 text-right font-medium">{localize('com_admin_analytics_credits_spent')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr
              key={user.userId}
              className="cursor-pointer border-t border-border-light hover:bg-surface-hover"
              onClick={() => navigate(`/d/admin/users?userId=${encodeURIComponent(user.userId)}`)}
              role="button"
              aria-label={`View details for ${user.name}`}
            >
              <td className="py-2 pr-3 text-text-secondary">{index + 1}</td>
              <td className="py-2 pr-3">
                <p className="font-medium text-text-primary">{user.name}</p>
                <p className="text-xs text-text-secondary">{user.email}</p>
              </td>
              <td className="py-2 text-right text-text-primary">{formatNumber(user.tokens)}</td>
              <td className="py-2 text-right text-text-primary">{formatNumber(user.credits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Create View.tsx**

```tsx
import { useState, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetAdminAnalyticsQuery } from '~/data-provider';
import type { AdminAnalyticsParams } from 'librechat-data-provider';
import KPICards from './KPICards';
import Filters from './Filters';
import TrendChart from './TrendChart';
import ModelChart from './ModelChart';
import TopUsers from './TopUsers';

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function defaultEndDate(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function AnalyticsView() {
  const localize = useLocalize();

  const [params, setParams] = useState<AdminAnalyticsParams>({
    startDate: defaultStartDate(),
    endDate: defaultEndDate(),
    groupBy: 'day',
  });
  const [userSearch, setUserSearch] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = useGetAdminAnalyticsQuery(params);

  const handleParamsChange = useCallback((next: Partial<AdminAnalyticsParams>) => {
    setParams((prev) => ({ ...prev, ...next }));
  }, []);

  const handleUserSearchChange = useCallback(
    (value: string) => {
      setUserSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!value) {
        handleParamsChange({ userId: undefined });
        return;
      }
      const timer = setTimeout(() => {}, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer, handleParamsChange],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {localize('com_admin_analytics_title')}
        </h1>
      </div>

      <Filters
        params={params}
        userSearch={userSearch}
        onUserSearchChange={handleUserSearchChange}
        onChange={handleParamsChange}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-red-500">{localize('com_admin_analytics_no_data')}</p>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          <KPICards kpis={data.kpis} />
          <TrendChart data={data.timeSeries} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ModelChart data={data.byModel} />
            <TopUsers users={data.topUsers} />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Task 7: Admin sidebar and routing

**Files:**
- Modify: `client/src/components/Admin/layout/Sidebar.tsx`
- Modify: `client/src/components/Admin/index.ts`
- Modify: `client/src/routes/Dashboard.tsx`

- [ ] **Step 1: Add Analytics to the sidebar**

In `client/src/components/Admin/layout/Sidebar.tsx`, add `BarChart3` to the lucide-react import and add the analytics nav item:

```tsx
import { Users, Shield, UsersRound, KeyRound, Settings, BarChart3 } from 'lucide-react';
```

Add to the `navItems` array after the configs entry:

```tsx
{ path: '/d/admin/analytics', icon: BarChart3, labelKey: 'com_admin_nav_analytics' as const },
```

- [ ] **Step 2: Export AnalyticsView from the Admin index**

In `client/src/components/Admin/index.ts`, add:

```typescript
export { default as AnalyticsView } from './analytics/View';
```

- [ ] **Step 3: Add the analytics route to Dashboard.tsx**

In `client/src/routes/Dashboard.tsx`, add `AnalyticsView` to the import from `~/components/Admin`:

```tsx
import {
  AdminLayout,
  UsersView,
  RolesView,
  GroupsView,
  GrantsView,
  ConfigsView,
  AnalyticsView,
} from '~/components/Admin';
```

Add inside the `admin` children array, after the `configs` route:

```tsx
{ path: 'analytics', element: <AnalyticsView /> },
```

---

### Task 8: Localization keys

**Files:**
- Modify: `client/src/locales/en/translation.json`

- [ ] **Step 1: Add all analytics keys**

Add the following entries to `client/src/locales/en/translation.json` (keep alphabetical order within the `com_admin_` block):

```json
"com_admin_analytics_active_users": "Active Users",
"com_admin_analytics_all_models": "All Models",
"com_admin_analytics_all_users": "All Users",
"com_admin_analytics_avg_per_user": "Avg Credits / User",
"com_admin_analytics_by_model": "Usage by Model",
"com_admin_analytics_credits_spent": "Credits Spent",
"com_admin_analytics_group_by": "Group By",
"com_admin_analytics_group_day": "Day",
"com_admin_analytics_group_month": "Month",
"com_admin_analytics_group_week": "Week",
"com_admin_analytics_no_data": "No data for the selected period.",
"com_admin_analytics_period": "Period",
"com_admin_analytics_title": "Analytics",
"com_admin_analytics_top_users": "Top Users",
"com_admin_analytics_total_tokens": "Total Tokens",
"com_admin_analytics_trend": "Usage Trend",
"com_admin_nav_analytics": "Analytics",
```

---

### Task 9: Final verification

- [ ] **Step 1: TypeScript compilation check**

```bash
cd /path/to/project
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/data-provider/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
# Expected: no errors in any workspace
```

- [ ] **Step 2: ESLint check**

```bash
cd /path/to/project
npx eslint packages/api/src/admin/analytics.ts --max-warnings 0
npx eslint client/src/components/Admin/analytics/ --max-warnings 0
npx eslint client/src/data-provider/Admin/queries.ts --max-warnings 0
# Expected: no warnings or errors
```

- [ ] **Step 3: Backend smoke test**

Start the backend and verify both endpoints respond correctly with a valid admin token:

```bash
# Dashboard endpoint
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3080/api/admin/analytics?startDate=2026-03-01T00:00:00Z&endDate=2026-03-31T23:59:59Z&groupBy=day" \
  | jq '.kpis'
# Expected: object with totalTokens, totalCreditsSpent, activeUsers, avgCreditsPerUser

# Models endpoint
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3080/api/admin/analytics/models" \
  | jq '.models'
# Expected: sorted string array
```

- [ ] **Step 4: Frontend dev build check**

```bash
npm run frontend
# Expected: Vite build completes with no errors
```

- [ ] **Step 5: Manual browser verification**

Navigate to `http://localhost:3090/d/admin/analytics` while logged in as an admin. Verify:
- Analytics nav item appears in the sidebar with the `BarChart3` icon
- Filters bar renders (date inputs, model select, user search, group-by select)
- KPI cards appear with correct labels from localization keys
- Trend chart renders with blue/purple lines
- Model chart renders horizontal bars
- Top users table renders with clickable rows that navigate to `/d/admin/users`

- [ ] **Step 6: Commit**

```bash
git add \
  packages/api/src/admin/analytics.ts \
  packages/api/src/admin/index.ts \
  packages/data-schemas/src/schema/transaction.ts \
  packages/data-provider/src/types/queries.ts \
  packages/data-provider/src/api-endpoints.ts \
  packages/data-provider/src/keys.ts \
  packages/data-provider/src/data-service.ts \
  api/server/routes/admin/analytics.js \
  api/server/routes/index.js \
  api/server/index.js \
  client/src/data-provider/Admin/queries.ts \
  client/src/components/Admin/analytics/KPICards.tsx \
  client/src/components/Admin/analytics/Filters.tsx \
  client/src/components/Admin/analytics/TrendChart.tsx \
  client/src/components/Admin/analytics/ModelChart.tsx \
  client/src/components/Admin/analytics/TopUsers.tsx \
  client/src/components/Admin/analytics/View.tsx \
  client/src/components/Admin/index.ts \
  client/src/components/Admin/layout/Sidebar.tsx \
  client/src/routes/Dashboard.tsx \
  client/src/locales/en/translation.json \
  client/package.json

git commit -m "feat: add admin analytics dashboard with KPI cards, trend chart, model breakdown, and top users"
```
