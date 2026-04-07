import { Switch } from '@librechat/client';
import { useLocalize } from '~/hooks';

export interface BalanceOverride {
  startBalance?: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  refillIntervalValue?: number;
  refillIntervalUnit?: string;
}

interface BalanceFormProps {
  value: BalanceOverride;
  onChange: (value: BalanceOverride) => void;
  disabled?: boolean;
}

const INTERVAL_UNITS = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'];

export default function BalanceForm({ value, onChange, disabled }: BalanceFormProps) {
  const localize = useLocalize();

  const update = (field: keyof BalanceOverride, v: unknown) => {
    onChange({ ...value, [field]: v });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-medium p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {localize('com_admin_configs_balance')}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            {localize('com_admin_configs_balance_start')}
          </label>
          <input
            type="number"
            min={0}
            value={value.startBalance ?? ''}
            onChange={(e) =>
              update('startBalance', e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={disabled}
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            {localize('com_admin_configs_balance_refill_amount')}
          </label>
          <input
            type="number"
            min={0}
            value={value.refillAmount ?? ''}
            onChange={(e) =>
              update('refillAmount', e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={disabled || !value.autoRefillEnabled}
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary">
          {localize('com_admin_configs_balance_auto_refill')}
        </label>
        <Switch
          checked={value.autoRefillEnabled ?? false}
          onCheckedChange={(checked) => update('autoRefillEnabled', checked)}
          aria-label={localize('com_admin_configs_balance_auto_refill')}
          disabled={disabled}
        />
      </div>
      {value.autoRefillEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {localize('com_admin_configs_balance_refill_interval')}
            </label>
            <input
              type="number"
              min={1}
              value={value.refillIntervalValue ?? ''}
              onChange={(e) =>
                update(
                  'refillIntervalValue',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              disabled={disabled}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {localize('com_admin_configs_balance_refill_unit')}
            </label>
            <select
              value={value.refillIntervalUnit ?? 'days'}
              onChange={(e) => update('refillIntervalUnit', e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            >
              {INTERVAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
