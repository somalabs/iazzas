import { memo } from 'react';
import { Coins } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { SettingsTabValues } from 'librechat-data-provider';
import { Skeleton, TooltipAnchor } from '@librechat/client';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { getCycleInfo } from '~/utils/credits';
import { openSettingsTabAtom } from '~/store/settingsTab';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ICON_COLOR = {
  safe: 'text-text-secondary',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
} as const;

const BAR_COLOR = {
  safe: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
} as const;

function BalanceWidget({ collapsed = false }: { collapsed?: boolean }) {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const openSettingsTab = useSetAtom(openSettingsTabAtom);
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });

  if (!startupConfig?.balance?.enabled) {
    return null;
  }

  if (balanceQuery.isLoading) {
    return collapsed ? (
      <div className="flex h-9 w-9 items-center justify-center">
        <Skeleton className="h-[18px] w-[18px] rounded-full" />
      </div>
    ) : (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-1 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  if (balanceQuery.data == null) {
    return null;
  }

  const balance = balanceQuery.data;
  const { pct, colorState, hoursUntilRenewal, hasCycle } = getCycleInfo(balance);
  const iconColor = ICON_COLOR[colorState];
  const barColor = BAR_COLOR[colorState];
  const renewalText =
    hoursUntilRenewal != null
      ? `${localize('com_ui_ux_balance_renova')} (${localize('com_ui_ux_balance_renova_em')} ${hoursUntilRenewal}h)`
      : null;
  // Claude-style: surface the cycle as a clean label + progress, never the raw
  // internal credit number (the user sees usage, not the $-proxy ledger).
  const usageLabel = localize('com_ui_ux_balance_cycle');

  const ariaLabel = hasCycle
    ? `${usageLabel} ${pct}%${renewalText ? ` · ${renewalText}` : ''}`
    : localize('com_nav_balance');

  if (collapsed) {
    const tooltip = hasCycle
      ? `${usageLabel} ${pct}%${renewalText ? ` · ${renewalText}` : ''}`
      : localize('com_nav_balance');

    return (
      <TooltipAnchor
        side="right"
        description={tooltip}
        render={
          <button
            type="button"
            onClick={() => openSettingsTab(SettingsTabValues.BALANCE)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary',
              iconColor,
            )}
            aria-label={ariaLabel}
          >
            {hasCycle ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                className={iconColor}
                aria-hidden="true"
              >
                <circle
                  cx="9"
                  cy="9"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity={0.2}
                />
                <circle
                  cx="9"
                  cy="9"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 9 9)"
                />
              </svg>
            ) : (
              <Coins size={18} aria-hidden="true" />
            )}
          </button>
        }
      />
    );
  }

  return (
    <button
      type="button"
      role="status"
      onClick={() => openSettingsTab(SettingsTabValues.BALANCE)}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
      aria-label={ariaLabel}
    >
      <Coins size={14} className={cn('flex-shrink-0', iconColor)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-text-primary">
          {hasCycle ? usageLabel : localize('com_nav_balance')}
        </span>
        {hasCycle && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-1 w-20 flex-shrink-0 overflow-hidden rounded-full bg-surface-tertiary"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn('h-full rounded-full transition-all duration-300', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            {renewalText && (
              <span
                className={cn(
                  'truncate text-text-tertiary',
                  colorState !== 'safe' && iconColor,
                )}
              >
                {renewalText}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export default memo(BalanceWidget);
