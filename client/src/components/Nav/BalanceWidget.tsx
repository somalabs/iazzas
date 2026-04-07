import { memo } from 'react';
import { Coins } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';

function formatBalance(credits: number): string {
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(1)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat().format(Math.round(credits));
}

function BalanceWidget({ collapsed = false }: { collapsed?: boolean }) {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });

  if (!startupConfig?.balance?.enabled || balanceQuery.data == null) {
    return null;
  }

  const credits = balanceQuery.data.tokenCredits;
  const isLow = credits < 10_000;
  const formatted = formatBalance(credits);

  if (collapsed) {
    return (
      <TooltipAnchor
        side="right"
        description={`${localize('com_nav_balance')}: ${new Intl.NumberFormat().format(Math.round(credits))}`}
        render={
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${isLow ? 'text-red-500' : 'text-text-secondary'}`}
            role="status"
            aria-label={`${localize('com_nav_balance')}: ${formatted}`}
          >
            <Coins size={18} />
          </div>
        }
      />
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${isLow ? 'text-red-500' : 'text-text-secondary'}`}
      role="status"
      aria-label={`${localize('com_nav_balance')}: ${formatted}`}
    >
      <Coins size={14} />
      <span className="font-medium">{formatted}</span>
      <span className="opacity-60">{localize('com_nav_balance').toLowerCase()}</span>
    </div>
  );
}

export default memo(BalanceWidget);
