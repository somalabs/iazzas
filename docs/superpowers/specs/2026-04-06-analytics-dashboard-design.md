# Admin Analytics Dashboard

## Summary

A dedicated analytics section in the admin panel (`/d/admin/analytics`) providing aggregated usage visibility across the organization. Includes KPI cards, temporal trend chart, model breakdown chart, top users ranking, and flexible filtering by date range, model, and user.

## Audience

Admin users only (role `ADMIN`).

## Backend

### Endpoints

#### `GET /api/admin/analytics`

Single aggregated endpoint returning all dashboard data in one response.

**Query params:**
- `startDate` (ISO string, required) — period start
- `endDate` (ISO string, required) — period end
- `userId` (string, optional) — filter to single user
- `model` (string, optional) — filter to single model
- `groupBy` (`day` | `week` | `month`, default `day`) — temporal aggregation granularity

**Response:**
```json
{
  "kpis": {
    "totalTokens": 12500000,
    "totalCreditsSpent": 250000,
    "activeUsers": 42,
    "avgCreditsPerUser": 5952
  },
  "timeSeries": [
    { "date": "2026-03-01", "tokens": 450000, "credits": 9000, "activeUsers": 28 },
    { "date": "2026-03-02", "tokens": 380000, "credits": 7600, "activeUsers": 25 }
  ],
  "byModel": [
    { "model": "claude-sonnet-4-6", "tokens": 8200000, "credits": 164000, "percentage": 65.6 },
    { "model": "gpt-4o", "tokens": 3100000, "credits": 62000, "percentage": 24.8 },
    { "model": "claude-haiku-4-5", "tokens": 1200000, "credits": 24000, "percentage": 9.6 }
  ],
  "topUsers": [
    { "userId": "abc", "name": "Maria Silva", "email": "maria@azzas.com", "tokens": 1200000, "credits": 24000 },
    { "userId": "def", "name": "João Santos", "email": "joao@azzas.com", "tokens": 980000, "credits": 19600 }
  ],
  "period": {
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-03-31T23:59:59Z",
    "groupBy": "day"
  }
}
```

**Implementation:**
Single MongoDB aggregation pipeline on `Transaction` collection using `$facet` to compute all sections in parallel:
- `kpis` facet: `$group` by null, sum tokens/credits, `$addToSet` for unique users
- `timeSeries` facet: `$group` by date truncated to groupBy interval, sum tokens/credits, count distinct users
- `byModel` facet: `$group` by model, sum tokens/credits, then `$sort` desc
- `topUsers` facet: `$group` by user, sum tokens/credits, `$sort` desc, `$limit` 10, then `$lookup` on Users for name/email

Date filtering uses index on `createdAt`. Model and user filters applied in the `$match` stage.

#### `GET /api/admin/analytics/models`

Returns distinct model names used in transactions, for populating the model filter dropdown.

**Response:**
```json
{
  "models": ["claude-sonnet-4-6", "gpt-4o", "claude-haiku-4-5"]
}
```

### Performance

- `Transaction` collection already has indexes on `user`, `model`, and `createdAt` (via timestamps)
- Add compound index `{ createdAt: 1, model: 1 }` for the analytics queries
- `$facet` runs all sub-pipelines in a single pass over the matched documents
- For large datasets (>1M transactions), consider adding a `$match` early in the pipeline to limit by date range before `$facet`
- React Query caching with `staleTime: 5 * 60 * 1000` (5 min) to avoid re-fetching on tab switches

### Files

```
packages/api/src/admin/
  analytics.ts  — NEW: aggregation pipeline + endpoint handlers

packages/api/src/routes/admin/
  index.ts      — EDIT: mount analytics routes

packages/data-provider/src/
  api-endpoints.ts  — ADD: adminAnalytics(), adminAnalyticsModels()
  data-service.ts   — ADD: getAdminAnalytics(), getAdminAnalyticsModels()
  keys.ts           — ADD: QueryKeys.adminAnalytics, QueryKeys.adminAnalyticsModels

packages/data-schemas/src/schema/
  transaction.ts  — EDIT: add compound index { createdAt: 1, model: 1 }
```

## Frontend

### New Dependency

`recharts` — React-native charting library. Declarative API, works well with Tailwind, SSR-safe, ~45KB gzipped.

### Route

Add to admin routes in `Dashboard.tsx`:
```tsx
{ path: 'analytics', element: <AnalyticsView /> }
```

Add "Analytics" item to admin Sidebar with `BarChart3` icon from lucide-react.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Filters: [Date Range Picker] [Model ▼] [User ▼]   │
├────────┬────────┬──────────┬────────────────────────┤
│ Tokens │Credits │ Active   │ Avg Credits            │
│ Total  │ Spent  │ Users    │ per User               │
├────────┴────────┴──────────┴────────────────────────┤
│                                                     │
│  Trend Chart (LineChart)                            │
│  Lines: tokens, credits                             │
│  X: date | Y: value                                 │
│                                                     │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  Model Breakdown     │  Top Users                   │
│  (BarChart horiz.)   │  (Table: rank, name, spend)  │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### Components

**Filters bar:**
- Date range picker: two date inputs (start/end), default last 30 days
- Model select: populated from `/api/admin/analytics/models`, with "All" option
- User autocomplete: reuses `searchAdminUsers` with debounced input, with "All" option
- GroupBy select: Day / Week / Month

**KPI Cards (4):**
- Total Tokens (formatted with K/M suffix)
- Credits Spent (formatted as number)
- Active Users (count)
- Avg Credits/User (formatted as number)

**Trend Chart:**
- `recharts` `LineChart` with `ResponsiveContainer`
- Two lines: tokens (blue) and credits (purple)
- X-axis: date labels, Y-axis: values with K/M formatting
- Tooltip on hover

**Model Breakdown:**
- `recharts` `BarChart` horizontal
- Bars colored by model, sorted descending
- Labels: model name + percentage

**Top Users:**
- Simple table: rank, name, email, tokens, credits
- Clicking a user navigates to `/d/admin/users` with that user selected (or opens User Detail)

### Files

```
client/src/components/Admin/analytics/
  View.tsx          — main layout + filter state + data fetching
  Filters.tsx       — date range, model select, user autocomplete, groupBy
  KPICards.tsx      — 4 KPI cards
  TrendChart.tsx    — recharts LineChart
  ModelChart.tsx    — recharts BarChart horizontal
  TopUsers.tsx      — ranked table

client/src/components/Admin/
  index.ts          — EDIT: export AnalyticsView

client/src/components/Admin/layout/
  Sidebar.tsx       — EDIT: add Analytics nav item

client/src/routes/
  Dashboard.tsx     — EDIT: add analytics route

client/src/data-provider/Admin/
  queries.ts    — ADD: useGetAdminAnalyticsQuery, useGetAdminAnalyticsModelsQuery
  index.ts      — EDIT: export new hooks
```

## Localization Keys

```
com_admin_analytics_title
com_admin_analytics_total_tokens
com_admin_analytics_credits_spent
com_admin_analytics_active_users
com_admin_analytics_avg_per_user
com_admin_analytics_trend
com_admin_analytics_by_model
com_admin_analytics_top_users
com_admin_analytics_period
com_admin_analytics_group_by
com_admin_analytics_group_day
com_admin_analytics_group_week
com_admin_analytics_group_month
com_admin_analytics_all_models
com_admin_analytics_all_users
com_admin_analytics_no_data
```
