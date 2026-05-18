import React from 'react';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { formatDisplayCredits, getCycleInfo } from '~/utils/credits';
import { useAuthContext, useLocalize } from '~/hooks';
import TokenCreditsItem from './TokenCreditsItem';
import AutoRefillSettings from './AutoRefillSettings';
import { cn } from '~/utils';

function Balance() {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && !!startupConfig?.balance?.enabled,
  });
  const balanceData = balanceQuery.data;

  // Pull out all the fields we need, with safe defaults
  const {
    tokenCredits = 0,
    autoRefillEnabled = false,
    lastRefill,
    refillAmount,
    refillIntervalUnit,
    refillIntervalValue,
  } = balanceData ?? {};

  // Check that all auto-refill props are present
  const hasValidRefillSettings =
    lastRefill !== undefined &&
    refillAmount !== undefined &&
    refillIntervalUnit !== undefined &&
    refillIntervalValue !== undefined;

  const { pct, colorState, viraDDMM, displayCeiling, hasCycle } = getCycleInfo({
    tokenCredits,
    autoRefillEnabled,
    refillAmount,
    lastRefill,
    refillIntervalUnit,
    refillIntervalValue,
  });
  const formattedCredits = formatDisplayCredits(tokenCredits);
  const ceiling =
    displayCeiling != null ? new Intl.NumberFormat().format(displayCeiling) : null;
  const barColor =
    colorState === 'danger'
      ? 'bg-red-500'
      : colorState === 'warning'
        ? 'bg-yellow-500'
        : 'bg-green-500';
  const dateColor =
    colorState === 'danger'
      ? 'text-red-500'
      : colorState === 'warning'
        ? 'text-yellow-500'
        : 'text-text-tertiary';

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-text-primary">
      {autoRefillEnabled && hasValidRefillSettings && hasCycle && ceiling && (
        <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {localize('com_ui_ux_balance_cycle')}
            </span>
            {viraDDMM && (
              <span className={cn('text-xs', dateColor)}>
                {localize('com_ui_ux_balance_vira_em')} {viraDDMM}
              </span>
            )}
          </div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-text-primary">{formattedCredits}</span>
            <span className="text-sm text-text-secondary">
              / {ceiling} {localize('com_ui_ux_balance_creditos')}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-text-tertiary">{pct}%</p>
        </div>
      )}

      {/* Token credits display */}
      <TokenCreditsItem tokenCredits={tokenCredits} />

      {/* Auto-refill display */}
      {autoRefillEnabled ? (
        hasValidRefillSettings ? (
          <AutoRefillSettings
            lastRefill={lastRefill}
            refillAmount={refillAmount}
            refillIntervalUnit={refillIntervalUnit}
            refillIntervalValue={refillIntervalValue}
          />
        ) : (
          <div className="text-sm text-red-600">
            {localize('com_nav_balance_auto_refill_error')}
          </div>
        )
      ) : (
        <div className="text-sm text-gray-600">
          {localize('com_nav_balance_auto_refill_disabled')}
        </div>
      )}
    </div>
  );
}

export default React.memo(Balance);
