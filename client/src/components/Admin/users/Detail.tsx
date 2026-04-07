import { useState } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetAdminUserUsageQuery } from '~/data-provider';
import BalanceCard from './BalanceCard';
import UsageByModel from './UsageByModel';
import Transactions from './Transactions';
import type { AdminUserListItem } from 'librechat-data-provider';

interface DetailProps {
  user: AdminUserListItem;
  onClose: () => void;
}

const TX_LIMIT = 10;

export default function Detail({ user, onClose }: DetailProps) {
  const localize = useLocalize();
  const [txOffset, setTxOffset] = useState(0);

  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    .toISOString()
    .split('T')[0];

  const usageQuery = useGetAdminUserUsageQuery(user.id, {
    startDate,
    endDate,
    limit: TX_LIMIT,
    offset: txOffset,
  });

  const usage = usageQuery.data;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border-medium bg-surface-primary">
      <div className="flex items-start justify-between border-b border-border-medium px-4 py-3">
        <div>
          <p className="font-semibold text-text-primary">{user.name}</p>
          <p className="text-xs text-text-secondary">{user.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
            {user.role}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar painel"
          className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          ×
        </button>
      </div>

      {usageQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <BalanceCard userId={user.id} balance={usage?.balance ?? null} />

          {usage && (
            <>
              <UsageByModel data={usage.byModel} />

              <Transactions
                items={usage.transactions.items}
                total={usage.transactions.total}
                limit={usage.transactions.limit}
                offset={txOffset}
                onOffsetChange={setTxOffset}
              />

              <a
                href={`/d/admin/analytics?userId=${encodeURIComponent(user.id)}`}
                className="block text-center text-xs text-surface-submit hover:underline"
              >
                {localize('com_admin_users_view_analytics')}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
