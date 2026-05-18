import { Clock, Loader, CheckCircle, XCircle, SkipForward, Pause } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { FlowNodeRun, FlowNodeRunStatus } from 'librechat-data-provider';

const STATUS_CONFIG: Record<
  FlowNodeRunStatus,
  { icon: React.ElementType; colorClass: string; labelKey: TranslationKeys }
> = {
  pending: { icon: Clock, colorClass: 'text-text-tertiary', labelKey: 'com_studio_flow_node_run_pending' },
  running: { icon: Loader, colorClass: 'text-blue-400 animate-spin', labelKey: 'com_studio_flow_node_run_running' },
  completed: { icon: CheckCircle, colorClass: 'text-emerald-400', labelKey: 'com_studio_flow_node_run_completed' },
  skipped: { icon: SkipForward, colorClass: 'text-text-tertiary', labelKey: 'com_studio_flow_node_run_skipped' },
  failed: { icon: XCircle, colorClass: 'text-red-400', labelKey: 'com_studio_flow_node_run_failed' },
  waiting: { icon: Pause, colorClass: 'text-orange-400', labelKey: 'com_studio_flow_node_run_waiting' },
};

export default function NodeStatusRow({ nodeRun }: { nodeRun: FlowNodeRun }) {
  const localize = useLocalize();
  const config = STATUS_CONFIG[nodeRun.status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon
        className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0', config.colorClass)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-primary">{nodeRun.nodeType}</p>
          <span className={cn('text-[10px]', config.colorClass)}>
            {localize(config.labelKey)}
          </span>
        </div>
        {nodeRun.output && (
          <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-text-secondary">
            {nodeRun.output}
          </p>
        )}
        {nodeRun.error && (
          <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-red-400">
            {nodeRun.error}
          </p>
        )}
      </div>
    </div>
  );
}
