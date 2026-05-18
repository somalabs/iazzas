import { useState, useEffect, useId } from 'react';
import { AlertTriangle, Loader } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useFlowsQuery } from '~/data-provider';
import { cn } from '~/utils';
import type { Automation } from './context';

type ScheduleMode = 'daily' | 'weekdays' | 'interval' | 'advanced';

const SCHEDULE_MODES: { key: ScheduleMode; label: string }[] = [
  { key: 'daily', label: 'Diariamente' },
  { key: 'weekdays', label: 'Dias da semana' },
  { key: 'interval', label: 'Intervalo' },
  { key: 'advanced', label: 'Cron avançado' },
];

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const COMMON_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'UTC',
];

function buildCron(
  mode: ScheduleMode,
  hour: number,
  minute: number,
  days: number[],
  intervalValue: number,
  intervalUnit: 'minutes' | 'hours',
  rawCron: string,
): string {
  switch (mode) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekdays': {
      const sorted = [...days].sort((a, b) => a - b);
      const dayStr = sorted.length > 0 ? sorted.join(',') : '1';
      return `${minute} ${hour} * * ${dayStr}`;
    }
    case 'interval':
      return intervalUnit === 'minutes'
        ? `*/${intervalValue} * * * *`
        : `0 */${intervalValue} * * *`;
    case 'advanced':
      return rawCron;
  }
}

const inputClass =
  'w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ring-primary focus:outline-none focus:ring-1 focus:ring-ring-primary';

const labelClass =
  'mb-1 block text-xs font-semibold uppercase tracking-wider text-text-tertiary';

type ApiError = { response?: { data?: { error?: string } } };

export type AutomationEditorProps = {
  automation?: Automation;
  onSaved: (automation: Automation) => void;
  onCancel: () => void;
};

export default function AutomationEditor({ automation, onSaved, onCancel }: AutomationEditorProps) {
  const localize = useLocalize();
  const uid = useId();
  const { showToast } = useToastContext();
  const { data: flowsData } = useFlowsQuery();

  const isCreating = !automation;
  const flows = flowsData?.flows ?? [];

  const [name, setName] = useState(automation?.name ?? '');
  const [flowId, setFlowId] = useState(automation?.flowId ?? '');
  const [timezone, setTimezone] = useState(automation?.timezone ?? 'America/Sao_Paulo');
  const [triggerInput, setTriggerInput] = useState(automation?.triggerInput ?? '');
  const [enabled, setEnabled] = useState(automation?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(isCreating ? 'daily' : 'advanced');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervalValue, setIntervalValue] = useState(30);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [rawCron, setRawCron] = useState(automation?.cron ?? '0 9 * * *');

  const [nameError, setNameError] = useState('');
  const [flowError, setFlowError] = useState('');
  const [cronError, setCronError] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [limitError, setLimitError] = useState('');

  useEffect(() => {
    if (!automation) return;
    setName(automation.name);
    setFlowId(automation.flowId);
    setTimezone(automation.timezone);
    setTriggerInput(automation.triggerInput ?? '');
    setEnabled(automation.enabled);
    setRawCron(automation.cron);
    setScheduleMode('advanced');
  }, [automation?._id]);

  const currentCron = buildCron(
    scheduleMode,
    hour,
    minute,
    selectedDays,
    intervalValue,
    intervalUnit,
    rawCron,
  );

  const toggleDay = (day: number) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError(localize('com_automacoes_error_name_required'));
      valid = false;
    } else {
      setNameError('');
    }
    if (!flowId) {
      setFlowError(localize('com_automacoes_error_flow_required'));
      valid = false;
    } else {
      setFlowError('');
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setCronError('');
    setApprovalError('');
    setLimitError('');
    setSaving(true);

    try {
      // Seam: tech stream wires POST /api/automacoes or PUT /api/automacoes/:id
      const selectedFlow = flows.find((f) => f._id === flowId);
      const saved: Automation = {
        _id: automation?._id ?? crypto.randomUUID(),
        flowId,
        flowName: selectedFlow?.name,
        name: name.trim(),
        cron: currentCron,
        timezone,
        triggerInput: triggerInput.trim() || undefined,
        enabled,
        createdAt: automation?.createdAt ?? new Date().toISOString(),
      };
      onSaved(saved);
      showToast({ message: localize('com_automacoes_save_success'), status: 'success' });
    } catch (err) {
      const code = (err as ApiError)?.response?.data?.error;
      if (code === 'approvalNodeIncompatible') {
        setApprovalError(localize('com_automacoes_error_approval_node'));
      } else if (code === 'automationLimitReached') {
        setLimitError(localize('com_automacoes_error_limit_reached', { limit: '20' }));
      } else if (code === 'cronInvalid') {
        setCronError(localize('com_automacoes_error_cron_invalid'));
      } else if (code === 'cronIntervalTooShort') {
        setCronError(localize('com_automacoes_error_cron_too_short', { min: '5' }));
      } else {
        showToast({ message: localize('com_automacoes_save_error'), status: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-secondary">
      <div className="flex items-center border-b border-border-light px-6 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          {isCreating ? localize('com_automacoes_create_btn') : name || localize('com_automacoes_form_name_label')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-xl space-y-5">

          {/* Name */}
          <div>
            <label htmlFor={`${uid}-name`} className={labelClass}>
              {localize('com_automacoes_form_name_label')}
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_automacoes_form_name_placeholder')}
              className={cn(inputClass, nameError && 'border-red-500/60')}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? `${uid}-name-err` : undefined}
            />
            {nameError && (
              <p id={`${uid}-name-err`} className="mt-1 text-xs text-red-400" role="alert">
                {nameError}
              </p>
            )}
          </div>

          {/* Flow */}
          <div>
            <label htmlFor={`${uid}-flow`} className={labelClass}>
              {localize('com_automacoes_form_flow_label')}
            </label>
            <select
              id={`${uid}-flow`}
              value={flowId}
              onChange={(e) => { setFlowId(e.target.value); setApprovalError(''); }}
              className={cn(inputClass, flowError && 'border-red-500/60')}
              aria-invalid={!!flowError}
              aria-describedby={flowError ? `${uid}-flow-err` : undefined}
            >
              <option value="">{localize('com_automacoes_form_flow_placeholder')}</option>
              {flows.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
            {flowError && (
              <p id={`${uid}-flow-err`} className="mt-1 text-xs text-red-400" role="alert">
                {flowError}
              </p>
            )}
            {approvalError && (
              <div
                className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" aria-hidden="true" />
                <p className="text-xs text-red-400">{approvalError}</p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <p className={labelClass}>{localize('com_automacoes_form_cron_label')}</p>

            <div
              className="mb-3 flex rounded-lg border border-border-light bg-surface-primary p-0.5"
              role="tablist"
              aria-label={localize('com_automacoes_form_cron_label')}
            >
              {SCHEDULE_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={scheduleMode === key}
                  aria-controls={`${uid}-tab-${key}`}
                  onClick={() => setScheduleMode(key)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    scheduleMode === key
                      ? 'bg-surface-hover text-text-primary shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Daily */}
            {scheduleMode === 'daily' && (
              <div
                id={`${uid}-tab-daily`}
                role="tabpanel"
                className="flex items-end gap-2"
              >
                <div className="flex-1">
                  <label htmlFor={`${uid}-hour`} className="mb-1 block text-xs text-text-tertiary">
                    Hora (0–23)
                  </label>
                  <input
                    id={`${uid}-hour`}
                    type="number"
                    min={0}
                    max={23}
                    value={hour}
                    onChange={(e) => setHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                    className={inputClass}
                  />
                </div>
                <span className="mb-1.5 text-text-tertiary">:</span>
                <div className="flex-1">
                  <label htmlFor={`${uid}-min`} className="mb-1 block text-xs text-text-tertiary">
                    Minuto (0–59)
                  </label>
                  <input
                    id={`${uid}-min`}
                    type="number"
                    min={0}
                    max={59}
                    value={minute}
                    onChange={(e) => setMinute(Math.min(59, Math.max(0, Number(e.target.value))))}
                    className={inputClass}
                  />
                </div>
                <div className="mb-1.5">
                  <p className="font-mono text-[11px] text-text-tertiary">→ {currentCron}</p>
                </div>
              </div>
            )}

            {/* Weekdays */}
            {scheduleMode === 'weekdays' && (
              <div id={`${uid}-tab-weekdays`} role="tabpanel">
                <div className="mb-3 flex gap-1" role="group" aria-label="Dias da semana">
                  {WEEKDAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selectedDays.includes(value)}
                      onClick={() => toggleDay(value)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                        selectedDays.includes(value)
                          ? 'bg-surface-submit text-white'
                          : 'border border-border-light bg-surface-primary text-text-secondary hover:bg-surface-hover',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor={`${uid}-wh`} className="mb-1 block text-xs text-text-tertiary">
                      Hora (0–23)
                    </label>
                    <input
                      id={`${uid}-wh`}
                      type="number"
                      min={0}
                      max={23}
                      value={hour}
                      onChange={(e) => setHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                      className={inputClass}
                    />
                  </div>
                  <span className="mb-1.5 text-text-tertiary">:</span>
                  <div className="flex-1">
                    <label htmlFor={`${uid}-wm`} className="mb-1 block text-xs text-text-tertiary">
                      Minuto (0–59)
                    </label>
                    <input
                      id={`${uid}-wm`}
                      type="number"
                      min={0}
                      max={59}
                      value={minute}
                      onChange={(e) => setMinute(Math.min(59, Math.max(0, Number(e.target.value))))}
                      className={inputClass}
                    />
                  </div>
                  <div className="mb-1.5">
                    <p className="font-mono text-[11px] text-text-tertiary">→ {currentCron}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Interval */}
            {scheduleMode === 'interval' && (
              <div id={`${uid}-tab-interval`} role="tabpanel" className="flex items-end gap-2">
                <div className="w-28">
                  <label htmlFor={`${uid}-iv`} className="mb-1 block text-xs text-text-tertiary">
                    A cada
                  </label>
                  <input
                    id={`${uid}-iv`}
                    type="number"
                    min={intervalUnit === 'minutes' ? 5 : 1}
                    max={intervalUnit === 'minutes' ? 59 : 23}
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value)))}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor={`${uid}-iu`} className="mb-1 block text-xs text-text-tertiary">
                    Unidade
                  </label>
                  <select
                    id={`${uid}-iu`}
                    value={intervalUnit}
                    onChange={(e) => {
                      const unit = e.target.value as 'minutes' | 'hours';
                      setIntervalUnit(unit);
                      if (unit === 'minutes' && intervalValue < 5) setIntervalValue(5);
                    }}
                    className={inputClass}
                  >
                    <option value="minutes">minutos</option>
                    <option value="hours">horas</option>
                  </select>
                </div>
                <div className="mb-1.5">
                  <p className="font-mono text-[11px] text-text-tertiary">→ {currentCron}</p>
                </div>
              </div>
            )}

            {/* Advanced */}
            {scheduleMode === 'advanced' && (
              <div id={`${uid}-tab-advanced`} role="tabpanel">
                <input
                  type="text"
                  value={rawCron}
                  onChange={(e) => { setRawCron(e.target.value); setCronError(''); }}
                  placeholder={localize('com_automacoes_form_cron_placeholder')}
                  className={cn(inputClass, 'font-mono', cronError && 'border-red-500/60')}
                  aria-label={localize('com_automacoes_form_cron_label')}
                  aria-invalid={!!cronError}
                />
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {localize('com_automacoes_form_cron_hint')}
                </p>
              </div>
            )}

            {cronError && (
              <p className="mt-1 text-xs text-red-400" role="alert">
                {cronError}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor={`${uid}-tz`} className={labelClass}>
              {localize('com_automacoes_form_timezone_label')}
            </label>
            <select
              id={`${uid}-tz`}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger input */}
          <div>
            <label htmlFor={`${uid}-input`} className={labelClass}>
              {localize('com_automacoes_form_input_label')}
            </label>
            <textarea
              id={`${uid}-input`}
              value={triggerInput}
              onChange={(e) => setTriggerInput(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ring-primary focus:outline-none focus:ring-1 focus:ring-ring-primary"
              aria-describedby={`${uid}-input-hint`}
            />
            <p id={`${uid}-input-hint`} className="mt-1 text-[11px] text-text-tertiary">
              {localize('com_automacoes_form_input_hint')}
            </p>
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`${uid}-enabled`}
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-border-medium accent-surface-submit"
            />
            <label htmlFor={`${uid}-enabled`} className="cursor-pointer text-sm text-text-primary">
              {localize('com_automacoes_form_enabled_label')}
            </label>
          </div>

          {/* Limit error */}
          {limitError && (
            <div
              className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
              <p className="text-xs text-amber-400">{limitError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border-light px-6 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border-light px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
        >
          {localize('com_automacoes_form_cancel_btn')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            saving
              ? 'cursor-not-allowed bg-surface-submit/40 text-white/60'
              : 'bg-surface-submit text-white hover:bg-surface-submit-hover',
          )}
          aria-disabled={saving}
        >
          {saving && <Loader className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {localize('com_automacoes_form_save_btn')}
        </button>
      </div>
    </div>
  );
}
