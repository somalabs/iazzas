import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useGetEffectiveBalanceConfigQuery } from '~/data-provider';
import { formatDisplayCredits, formatUSD } from '~/utils/credits';
import AdjustDialog from './AdjustDialog';
import type { AdminUserBalance, AdminEffectiveBalanceSource } from 'librechat-data-provider';

interface BalanceCardProps {
  userId: string;
  balance: AdminUserBalance | null;
}

function formatSource(source: AdminEffectiveBalanceSource): string {
  if ('source' in source) return `(${source.source})`;
  return `(${source.principalType}: ${source.principalId})`;
}

export default function BalanceCard({ userId, balance }: BalanceCardProps) {
  const localize = useLocalize();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const effectiveQuery = useGetEffectiveBalanceConfigQuery(userId);

  const raw = balance?.tokenCredits ?? 0;
  const credits = balance?.tokenCredits != null ? formatDisplayCredits(raw) : '—';

  const refillInfo = balance?.autoRefillEnabled
    ? `${balance.refillAmount != null ? formatDisplayCredits(balance.refillAmount) : '—'} / ${balance.refillIntervalValue ?? '—'} ${balance.refillIntervalUnit ?? ''}`
    : 'Desativado';

  return (
    <div className="rounded-lg border border-border-medium p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">
          {localize('com_admin_users_balance')}
        </span>
        <button
          onClick={() => setAdjustOpen(true)}
          className="rounded-md border border-border-medium px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover"
        >
          {localize('com_admin_users_adjust_credits')}
        </button>
      </div>
      <p className="text-2xl font-bold text-text-primary">{credits}</p>
      <p className="mt-0.5 text-sm text-text-secondary">{formatUSD(raw)}</p>
      <p className="mt-1 text-xs text-text-tertiary">Auto-refill: {refillInfo}</p>
      {effectiveQuery.data?.sources && (
        <div className="mt-3 space-y-1 border-t border-border-light pt-2">
          <p className="text-xs font-medium text-text-tertiary">
            {localize('com_admin_configs_balance_source')}
          </p>
          {effectiveQuery.data.effective.startBalance != null && (
            <p className="text-xs text-text-tertiary">
              {localize('com_admin_configs_balance_start')}:{' '}
              {formatDisplayCredits(effectiveQuery.data.effective.startBalance)}{' '}
              ({formatUSD(effectiveQuery.data.effective.startBalance)}){' '}
              {formatSource(effectiveQuery.data.sources.startBalance)}
            </p>
          )}
          {effectiveQuery.data.effective.autoRefillEnabled &&
            effectiveQuery.data.effective.refillAmount != null && (
              <p className="text-xs text-text-tertiary">
                {localize('com_admin_configs_balance_refill')}:{' '}
                {formatDisplayCredits(effectiveQuery.data.effective.refillAmount)} /{' '}
                {effectiveQuery.data.effective.refillIntervalValue}{' '}
                {effectiveQuery.data.effective.refillIntervalUnit}{' '}
                {formatSource(effectiveQuery.data.sources.refillAmount)}
              </p>
            )}
        </div>
      )}
      <AdjustDialog userId={userId} open={adjustOpen} onOpenChange={setAdjustOpen} />
    </div>
  );
}
