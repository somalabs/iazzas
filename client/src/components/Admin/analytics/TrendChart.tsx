import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useLocalize } from '~/hooks';
import { toDisplayCredits, formatDisplayCredits, formatUSD } from '~/utils/credits';
import type { AdminAnalyticsTimePoint } from 'librechat-data-provider';

function formatYAxis(value: number): string {
  const display = toDisplayCredits(value);
  if (display >= 1_000_000) {
    return `${(display / 1_000_000).toFixed(1)}M`;
  }
  if (display >= 1_000) {
    return `${(display / 1_000).toFixed(0)}K`;
  }
  return String(Math.round(display));
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
          <Tooltip formatter={(value, name) => {
            const raw = Number(value);
            if (String(name).toLowerCase().includes('credit')) {
              return `${formatDisplayCredits(raw)} (${formatUSD(raw)})`;
            }
            return raw.toLocaleString();
          }} />
          <Legend />
          <Line type="monotone" dataKey="tokens" stroke="#3b82f6" dot={false} strokeWidth={2} name={localize('com_admin_analytics_total_tokens')} />
          <Line type="monotone" dataKey="credits" stroke="#a855f7" dot={false} strokeWidth={2} name={localize('com_admin_analytics_credits_spent')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
