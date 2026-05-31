import { CheckCircle, XCircle, Loader, SkipForward, ExternalLink } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import type { AutomationRun } from './context';
import type { TranslationKeys } from '~/hooks';

type RunStatus = AutomationRun['status'];

const STATUS_CONFIG: Record<
  RunStatus,
  { Icon: React.ElementType; color: string; spin: boolean; labelKey: TranslationKeys }
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

type RunsDrawerProps = {
  automationName?: string;
  runs: AutomationRun[];
  onClose: () => void;
};

export default function RunsDrawer({ automationName, runs, onClose }: RunsDrawerProps) {
  const localize = useLocalize();

  return (
    <AtelierDrawer
      open
      title={localize('com_automacoes_runs_title')}
      subtitle={automationName}
      onClose={onClose}
    >
      {runs.length === 0 ? (
        <p className="text-xs text-text-tertiary">{localize('com_automacoes_runs_empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run) => {
              const cfg = STATUS_CONFIG[run.status];
              const Icon = cfg.Icon;
              const duration = run.completedAt
                ? Math.round(
                    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) /
                      1000,
                  )
                : null;

              return (
                <div
                  key={run._id}
                  className="rounded-lg border border-border-light bg-surface-primary p-3"
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 flex-shrink-0',
                        cfg.color,
                        cfg.spin && 'animate-spin',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-medium', cfg.color)}>
                        {localize(cfg.labelKey)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-text-tertiary">
                        <span>
                          {localize('com_automacoes_run_started_at')}:{' '}
                          {new Date(run.startedAt).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                        {duration != null && (
                          <span>
                            {localize('com_automacoes_run_duration', { seconds: duration })}
                          </span>
                        )}
                      </div>
                      {run.input && (
                        <p className="mt-1 truncate text-[11px] text-text-secondary">
                          {localize('com_automacoes_run_input_label')}: {run.input}
                        </p>
                      )}
                      {run.output && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">
                          {localize('com_automacoes_run_output_label')}: {run.output}
                        </p>
                      )}
                      {run.conversationId && (
                        <a
                          href={`/c/${run.conversationId}`}
                          className="mt-1.5 flex items-center gap-1 text-[11px] text-ring-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          {localize('com_automacoes_run_view_convo')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </AtelierDrawer>
  );
}
