import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader, CheckCircle, XCircle, Pause, SkipForward } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import NodeStatusRow from './NodeStatusRow';
import type { FlowRun, FlowRunStatus } from 'librechat-data-provider';

const RUN_STATUS_CONFIG: Record<
  FlowRunStatus,
  { icon: React.ElementType; colorClass: string; labelKey: TranslationKeys }
> = {
  running: { icon: Loader, colorClass: 'text-blue-400', labelKey: 'com_studio_flow_run_status_running' },
  paused: { icon: Pause, colorClass: 'text-orange-400', labelKey: 'com_studio_flow_run_status_paused' },
  success: { icon: CheckCircle, colorClass: 'text-emerald-400', labelKey: 'com_studio_flow_run_status_success' },
  failed: { icon: XCircle, colorClass: 'text-red-400', labelKey: 'com_studio_flow_run_status_failed' },
  skipped: { icon: SkipForward, colorClass: 'text-text-tertiary', labelKey: 'com_studio_flow_run_status_skipped' },
};

type RunCardProps = {
  run: FlowRun;
  onApprove?: (runId: string) => void;
  onReject?: (runId: string) => void;
};

export default function RunCard({ run, onApprove, onReject }: RunCardProps) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const config = RUN_STATUS_CONFIG[run.status];
  const Icon = config.icon;
  const isPaused = run.status === 'paused';

  const duration =
    run.completedAt
      ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
      : null;

  const firstError = run.status === 'failed'
    ? run.nodeRuns.find((nr) => nr.status === 'failed' && nr.error)
    : undefined;

  return (
    <div className="rounded-lg border border-border-light bg-surface-primary overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-surface-hover text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" aria-hidden="true" />
        )}
        <Icon
          className={cn('h-3.5 w-3.5 flex-shrink-0', config.colorClass, run.status === 'running' && 'animate-spin')}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-text-primary">{run.input || '—'}</p>
          <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
            <span>{new Date(run.startedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            {duration != null && <span>· {duration}s</span>}
          </div>
        </div>
        <span className={cn('text-[10px] font-medium flex-shrink-0', config.colorClass)}>
          {localize(config.labelKey)}
        </span>
      </button>

      {firstError && !expanded && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="line-clamp-2 font-mono text-[10px] text-red-400" title={firstError.error}>
            <span className="font-semibold">{firstError.nodeType}:</span> {firstError.error}
          </p>
        </div>
      )}

      {expanded && (
        <div className="border-t border-border-light px-3 pb-3 pt-2">
          <div className="divide-y divide-border-light">
            {run.nodeRuns.map((nr, i) => (
              <NodeStatusRow key={`${nr.nodeId}-${i}`} nodeRun={nr} />
            ))}
          </div>

          {isPaused && (
            <div className="mt-3 flex gap-2">
              {confirmApprove ? (
                <>
                  <button
                    type="button"
                    onClick={() => { onApprove?.(run._id); setConfirmApprove(false); }}
                    className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30"
                  >
                    {localize('com_studio_flow_run_approve_confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmApprove(false)}
                    className="rounded-lg border border-border-light px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
                  >
                    Cancelar
                  </button>
                </>
              ) : confirmReject ? (
                <>
                  <button
                    type="button"
                    onClick={() => { onReject?.(run._id); setConfirmReject(false); }}
                    className="flex-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                  >
                    {localize('com_studio_flow_run_reject_confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReject(false)}
                    className="rounded-lg border border-border-light px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmApprove(true)}
                    className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30"
                  >
                    {localize('com_studio_flow_run_approve_btn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReject(true)}
                    className="flex-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                  >
                    {localize('com_studio_flow_run_reject_btn')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
