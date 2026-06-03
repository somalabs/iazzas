/* eslint-disable i18next/no-literal-string -- intentional hardcoded pt-BR/brand/demo copy in IAzzas fork */
import { useState, memo, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import * as Menu from '@ariakit/react/menu';
import { LogOut } from 'lucide-react';
import { SettingsTabValues } from 'librechat-data-provider';
import { GearIcon, DropdownMenuSeparator, Avatar } from '@librechat/client';
import type { TBalanceResponse } from 'librechat-data-provider';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { openSettingsTabAtom } from '~/store/settingsTab';
import { useAuthContext } from '~/hooks/AuthContext';
import { formatDisplayCredits, getCycleInfo } from '~/utils/credits';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import Settings from './Settings';

const BAR_COLOR = {
  safe: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
} as const;

const TEXT_COLOR = {
  safe: 'text-text-tertiary',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
} as const;

function BalanceMenuRow({
  balance,
  configStartBalance,
  onClick,
}: {
  balance: TBalanceResponse;
  configStartBalance?: number;
  onClick: () => void;
}) {
  const localize = useLocalize();
  const { pct, colorState, hoursUntilRenewal, hasCycle } = getCycleInfo({
    ...balance,
    configStartBalance,
  });

  if (!hasCycle) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ml-3 mr-2 flex w-[calc(100%-1.25rem)] items-center justify-between rounded-md px-1 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
      >
        <span>{localize('com_nav_balance')}</span>
        <span className="text-text-primary">{formatDisplayCredits(balance.tokenCredits)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-3 mr-2 flex w-[calc(100%-1.25rem)] flex-col gap-1.5 rounded-md px-1 py-2 text-left text-sm hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
    >
      <div className="flex items-center justify-between">
        <span className="text-text-secondary">{localize('com_ui_ux_balance_cycle')}</span>
        <span className="font-medium text-text-primary">{pct}%</span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface-tertiary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', BAR_COLOR[colorState])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hoursUntilRenewal != null && (
        <span className={cn('text-xs', TEXT_COLOR[colorState])}>
          {localize('com_ui_ux_balance_renova')} ({localize('com_ui_ux_balance_renova_em')}{' '}
          {hoursUntilRenewal}h)
        </span>
      )}
    </button>
  );
}

function AccountSettings({ collapsed = false }: { collapsed?: boolean }) {
  const localize = useLocalize();
  const { user, isAuthenticated, logout } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabValues | undefined>(undefined);
  const [requestedTab, setRequestedTab] = useAtom(openSettingsTabAtom);
  const accountSettingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (requestedTab != null) {
      setSettingsTab(requestedTab);
      setShowSettings(true);
      setRequestedTab(null);
    }
  }, [requestedTab, setRequestedTab]);

  return (
    <Menu.MenuProvider placement="top-end">
      <Menu.MenuButton
        ref={accountSettingsButtonRef}
        aria-label={localize('com_nav_account_settings')}
        data-testid="nav-user"
        className={
          collapsed
            ? 'flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt'
            : 'mt-text-sm flex h-auto w-full items-center gap-2 rounded-xl p-2 text-sm transition-all duration-200 ease-in-out hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt'
        }
      >
        <div
          className={collapsed ? 'size-7 flex-shrink-0' : '-ml-0.9 -mt-0.8 h-8 w-8 flex-shrink-0'}
        >
          <div className="relative flex">
            <Avatar user={user} size={collapsed ? 28 : 32} />
          </div>
        </div>
        {!collapsed && (
          <div
            className="mt-2 grow overflow-hidden text-ellipsis whitespace-nowrap text-left text-text-primary"
            style={{ marginTop: '0', marginLeft: '0' }}
          >
            {user?.name ?? user?.username ?? localize('com_nav_user')}
          </div>
        )}
      </Menu.MenuButton>
      <Menu.Menu
        portal
        className="z-[125] w-[305px] rounded-lg border border-rule bg-paper shadow-atelier md:w-[244px]"
        style={{
          transformOrigin: 'bottom',
          translate: '0 -4px',
        }}
      >
        <div className="ml-3 mr-2 py-2 text-sm text-ink-700" role="note">
          {user?.email ?? localize('com_nav_user')}
        </div>
        <DropdownMenuSeparator />
        {startupConfig?.balance?.enabled === true && balanceQuery.data != null && (
          <>
            <BalanceMenuRow
              balance={balanceQuery.data}
              configStartBalance={startupConfig?.balance?.startBalance}
              onClick={() => {
                setSettingsTab(SettingsTabValues.BALANCE);
                setShowSettings(true);
              }}
            />
            <DropdownMenuSeparator />
          </>
        )}
        <Menu.MenuItem
          onClick={() => {
            setSettingsTab(undefined);
            setShowSettings(true);
          }}
          className="flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-md px-1 py-2 text-sm text-ink-700 hover:bg-canvas"
        >
          <GearIcon className="icon-md" aria-hidden="true" />
          {localize('com_nav_settings')}
        </Menu.MenuItem>
        <DropdownMenuSeparator />
        <Menu.MenuItem
          onClick={() => logout()}
          className="flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-md px-1 py-2 text-sm text-ink-700 hover:bg-canvas"
        >
          <LogOut className="icon-md" aria-hidden="true" />
          {localize('com_nav_log_out')}
        </Menu.MenuItem>
      </Menu.Menu>
      {showSettings && (
        <Settings open={showSettings} onOpenChange={setShowSettings} initialTab={settingsTab} />
      )}
    </Menu.MenuProvider>
  );
}

export default memo(AccountSettings);
