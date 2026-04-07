import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="model" width={140} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()}`, name]} />
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
