import { useState } from 'react';
import {
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  SkipForward,
  History,
} from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { Automation } from './context';

type RunStatus = NonNullable<Automation['lastStatus']>;

const STATUS_CONFIG: Record<
  RunStatus,
  { Icon: React.ElementType; color: string; spin: boolean; labelKey: string }
> = {
  running: {
    Icon: Loader,
    color: 'text-blue-400',
    spin: true,
    labelKey: 'com_automacoes_run_status_running',
  },
  success: {
    Icon: CheckCircle,
    color: 'text-emerald-400',
    spin: false,
    labelKey: 'com_automacoes_run_status_success',
  },
  failed: {
    Icon: XCircle,
    color: 'text-red-400',
    spin: false,
    labelKey: 'com_automacoes_run_status_failed',
  },
  skipped: {
    Icon: SkipForward,
    color: 'text-text-tertiary',
    spin: false,
    labelKey: 'com_automacoes_run_status_skipped',
  },
};

const DAY_NAMES: Record<string, string> = {
  '0': 'dom',
  '1': 'seg',
  '2': 'ter',
  '3': 'qua',
  '4': 'qui',
  '5': 'sex',
  '6': 'sáb',
};

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCronSummary(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;

  if (min.startsWith('*/') && hour === '*') return `A cada ${min.slice(2)} min`;
  if (min === '0' && hour.startsWith('*/')) return `A cada ${hour.slice(2)}h`;

  const hh = hour.padStart(2, '0');
  const mm = min.padStart(2, '0');
  const time = `${hh}h${mm}`;

  if (dow === '*') return `Diariamente às ${time}`;
  if (dow === '1-5' || dow === '1,2,3,4,5') return `Dias úteis às ${time}`;

  const days = dow
    .split(',')
    .map((d) => DAY_NAMES[d] ?? d)
    .join(', ');
  return `${days} às ${time}`;
}

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
};

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        checked ? 'bg-surface-submit' : 'border-border-medium bg-surface-hover',
      )}
    >
      <span
        className={cn(
          'inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

type AutomationRowProps = {
  automation: Automation;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onRunNow: () => void;
  onDelete: () => void;
  onOpenRuns: () => void;
};

function AutomationRow({
  automation,
  selected,
  onSelect,
  onEdit,
  onToggleEnabled,
  onRunNow,
  onDelete,
  onOpenRuns,
}: AutomationRowProps) {
  const localize = useLocalize();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusCfg = automation.lastStatus ? STATUS_CONFIG[automation.lastStatus] : null;
  const StatusIcon = statusCfg?.Icon;

  return (
    <div
      className={cn(
        'group rounded-lg border transition-colors',
        selected
          ? 'border-border-medium bg-surface-hover'
          : 'border-transparent hover:border-border-light hover:bg-surface-hover',
      )}
    >
      <div
        className="flex cursor-pointer items-start gap-3 p-3"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        aria-current={selected}
        aria-label={automation.name}
      >
        <div className="mt-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()} role="none">
          <ToggleSwitch
            checked={automation.enabled}
            onChange={onToggleEnabled}
            label={
              automation.enabled
                ? localize('com_automacoes_toggle_disable')
                : localize('com_automacoes_toggle_enable')
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{automation.name}</p>
          <p className="mt-0.5 truncate text-xs text-text-tertiary">
            {automation.flowName ?? automation.flowId}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
              <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              {formatCronSummary(automation.cron)}
            </span>
            {statusCfg && StatusIcon ? (
              <span className={cn('flex items-center gap-1 text-[11px]', statusCfg.color)}>
                <StatusIcon
                  className={cn('h-3 w-3 flex-shrink-0', statusCfg.spin && 'animate-spin')}
                  aria-hidden="true"
                />
                {formatDateTime(automation.lastRunAt)}
              </span>
            ) : (
              <span className="text-[11px] text-text-tertiary">
                {localize('com_automacoes_run_never')}
              </span>
            )}
            {automation.nextRunAt && (
              <span className="text-[11px] text-text-tertiary">
                {localize('com_automacoes_run_next_at', {
                  datetime: formatDateTime(automation.nextRunAt),
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {confirmDelete ? (
        <div
          className="flex flex-col gap-2 border-t border-border-light px-3 py-2"
          onClick={(e) => e.stopPropagation()}
          role="none"
        >
          <p className="text-[11px] leading-snug text-text-secondary">
            {localize('com_automacoes_delete_confirm')}
          </p>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover"
            >
              {localize('com_automacoes_form_cancel_btn')}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setConfirmDelete(false);
              }}
              className="rounded px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10"
            >
              {localize('com_automacoes_delete_btn')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 border-t border-border-light px-3 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRunNow();
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_automacoes_run_now_btn')}
          >
            <Play className="h-3 w-3" aria-hidden="true" />
            {localize('com_automacoes_run_now_btn')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_automacoes_edit_btn')}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            {localize('com_automacoes_edit_btn')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRuns();
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_automacoes_runs_title')}
          >
            <History className="h-3 w-3" aria-hidden="true" />
            {localize('com_automacoes_runs_title')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-tertiary hover:bg-red-500/10 hover:text-red-400"
            aria-label={localize('com_automacoes_delete_btn')}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

type AutomationListProps = {
  automations: Automation[];
  selectedId: string | null;
  canCreate: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onRunNow: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenRuns: (id: string) => void;
  className?: string;
};

export default function AutomationList({
  automations,
  selectedId,
  canCreate,
  onSelect,
  onCreate,
  onToggleEnabled,
  onRunNow,
  onDelete,
  onOpenRuns,
  className,
}: AutomationListProps) {
  const localize = useLocalize();

  return (
    <aside
      aria-label={localize('com_automacoes_page_title')}
      className={cn(
        'flex h-full w-[300px] flex-shrink-0 flex-col border-r border-border-light bg-surface-primary',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {localize('com_automacoes_list_col_name')}
          </p>
          <p className="truncate text-[11px] text-text-tertiary">
            {localize('com_automacoes_page_subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          aria-label={localize('com_automacoes_create_btn')}
          className={cn(
            'ml-3 flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            canCreate
              ? 'bg-surface-submit text-white hover:bg-surface-submit-hover'
              : 'bg-surface-submit/40 cursor-not-allowed text-white/60',
          )}
        >
          + {localize('com_automacoes_create_btn')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-text-tertiary">{localize('com_automacoes_empty_state')}</p>
            {canCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="rounded-lg bg-surface-submit px-4 py-2 text-xs font-medium text-white hover:bg-surface-submit-hover"
              >
                {localize('com_automacoes_create_btn')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {automations.map((a) => (
              <AutomationRow
                key={a._id}
                automation={a}
                selected={selectedId === a._id}
                onSelect={() => onSelect(a._id)}
                onEdit={() => onSelect(a._id)}
                onToggleEnabled={(enabled) => onToggleEnabled(a._id, enabled)}
                onRunNow={() => onRunNow(a._id)}
                onDelete={() => onDelete(a._id)}
                onOpenRuns={() => onOpenRuns(a._id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
