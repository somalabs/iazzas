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
            <th className="pb-2 font-medium">User</th>
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
