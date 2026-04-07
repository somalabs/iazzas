import { useLocalize } from '~/hooks';
import { useGetAdminAnalyticsModelsQuery, useSearchAdminUsersQuery } from '~/data-provider';
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
