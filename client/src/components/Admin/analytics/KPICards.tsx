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
      <KPICard label={localize('com_admin_analytics_total_tokens')} value={formatNumber(kpis.totalTokens)} />
      <KPICard label={localize('com_admin_analytics_credits_spent')} value={formatNumber(kpis.totalCreditsSpent)} />
      <KPICard label={localize('com_admin_analytics_active_users')} value={kpis.activeUsers.toLocaleString()} />
      <KPICard label={localize('com_admin_analytics_avg_per_user')} value={formatNumber(kpis.avgCreditsPerUser)} />
    </div>
  );
}
