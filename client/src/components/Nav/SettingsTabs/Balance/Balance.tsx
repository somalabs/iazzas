import React from 'react';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import {
  formatDisplayCredits,
  formatTokenEstimate,
  formatUSD,
  getCycleInfo,
} from '~/utils/credits';
import { cn } from '~/utils';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RING_COLOR = {
  safe: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
} as const;

const BAR_COLOR = {
  safe: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
} as const;

function Balance() {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && !!startupConfig?.balance?.enabled,
  });

  const { tokenCredits = 0, autoRefillEnabled = false, refillAmount } = balanceQuery.data ?? {};

  const { pct, colorState, hoursUntilRenewal, hasCycle } = getCycleInfo({
    tokenCredits,
    autoRefillEnabled,
    refillAmount,
    configStartBalance: startupConfig?.balance?.startBalance,
  });

  if (!hasCycle) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm text-text-primary">
        <p className="text-text-secondary">{localize('com_ui_ux_balance_sem_ciclo')}</p>
        <p className="text-text-tertiary">{localize('com_ui_ux_balance_autorecarga_inativa')}</p>
        <div className="mt-2 flex flex-col gap-1 border-t border-border-light pt-3">
          <div className="flex items-center justify-between text-text-secondary">
            <span>{localize('com_ui_ux_balance_saldo_disponivel')}</span>
            <span className="font-medium text-text-primary">
              {formatDisplayCredits(tokenCredits)}{' '}
              {localize('com_ui_ux_balance_creditos')}{' '}
              <span className="text-xs text-text-tertiary">({formatUSD(tokenCredits)})</span>
            </span>
          </div>
          <span className="text-text-tertiary">
            {localize('com_ui_ux_balance_tokens_estimativa', {
              tokens: formatTokenEstimate(tokenCredits),
            })}
          </span>
          <span className="text-xs text-text-tertiary">
            {localize('com_ui_ux_balance_tokens_nota')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 p-4 text-sm text-text-primary">
      <span className="self-start text-sm font-medium text-text-primary">
        {localize('com_ui_ux_balance_uso_titulo')}
      </span>

      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-surface-tertiary"
          />
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
            className={cn('transition-all duration-500', RING_COLOR[colorState])}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-semibold text-text-primary">{pct}%</span>
          <span className="text-xs text-text-tertiary">{localize('com_ui_ux_balance_usado')}</span>
        </div>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', BAR_COLOR[colorState])}
          style={{ width: `${pct}%` }}
        />
      </div>

      {hoursUntilRenewal != null && (
        <p className="self-start text-text-secondary">
          {localize('com_ui_ux_balance_renova_full', { hours: hoursUntilRenewal })}
        </p>
      )}
      <p className="self-start text-text-tertiary">
        {localize('com_ui_ux_balance_autorecarga_ativa')}
      </p>
      <div className="mt-2 flex w-full flex-col gap-1 border-t border-border-light pt-3">
        <div className="flex items-center justify-between text-text-secondary">
          <span>{localize('com_ui_ux_balance_saldo_disponivel')}</span>
          <span className="font-medium text-text-primary">
            {formatDisplayCredits(tokenCredits)}{' '}
            {localize('com_ui_ux_balance_creditos')}{' '}
            <span className="text-xs text-text-tertiary">({formatUSD(tokenCredits)})</span>
          </span>
        </div>
        <span className="text-text-tertiary">
          {localize('com_ui_ux_balance_tokens_estimativa', {
            tokens: formatTokenEstimate(tokenCredits),
          })}
        </span>
        <span className="text-xs text-text-tertiary">
          {localize('com_ui_ux_balance_tokens_nota')}
        </span>
      </div>
    </div>
  );
}

export default React.memo(Balance);
