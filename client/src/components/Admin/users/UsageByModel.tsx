import { useLocalize } from '~/hooks';
import { formatDisplayCredits, formatUSD } from '~/utils/credits';
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
      <h3 className="mb-2 text-sm font-medium text-text-secondary">
        {localize('com_admin_users_spend_by_model')}
      </h3>
      <div className="overflow-hidden rounded-lg border border-border-medium">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border-medium bg-surface-secondary">
            <tr>
              <th className="px-3 py-2 font-medium text-text-secondary">Modelo</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Tokens</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Credits</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Custo Est.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.model}
                className="border-b border-border-light last:border-0"
              >
                <td className="px-3 py-2 text-text-primary">{row.model}</td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {row.tokens.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {formatDisplayCredits(row.credits)}
                </td>
                <td className="px-3 py-2 text-right text-text-tertiary">
                  {formatUSD(row.credits)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
