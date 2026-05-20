import { useState } from 'react';
import { Clock, Loader, CheckCircle, XCircle, SkipForward, Pause, Copy, Check } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { FlowNodeRun, FlowNodeRunStatus } from 'librechat-data-provider';

const STATUS_CONFIG: Record<
  FlowNodeRunStatus,
  { icon: React.ElementType; colorClass: string; labelKey: TranslationKeys; spin?: boolean }
> = {
  pending: { icon: Clock, colorClass: 'text-text-tertiary', labelKey: 'com_studio_flow_node_run_pending' },
  running: { icon: Loader, colorClass: 'text-blue-400', labelKey: 'com_studio_flow_node_run_running', spin: true },
  completed: { icon: CheckCircle, colorClass: 'text-emerald-400', labelKey: 'com_studio_flow_node_run_completed' },
  skipped: { icon: SkipForward, colorClass: 'text-text-tertiary', labelKey: 'com_studio_flow_node_run_skipped' },
  failed: { icon: XCircle, colorClass: 'text-red-400', labelKey: 'com_studio_flow_node_run_failed' },
  waiting: { icon: Pause, colorClass: 'text-orange-400', labelKey: 'com_studio_flow_node_run_waiting' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label="Copiar"
      className="rounded p-0.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
    >
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
    </button>
  );
}

export default function NodeStatusRow({ nodeRun }: { nodeRun: FlowNodeRun }) {
  const localize = useLocalize();
  const config = STATUS_CONFIG[nodeRun.status];
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);

  const hasOutput = !!nodeRun.output;
  const hasError = !!nodeRun.error;
  const canExpand = hasOutput || hasError;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon
        className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0', config.colorClass, config.spin && 'animate-spin')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => canExpand && setExpanded((p) => !p)}
          disabled={!canExpand}
          aria-expanded={expanded}
          className={cn(
            'flex w-full items-center justify-between text-left',
            canExpand && 'cursor-pointer',
          )}
        >
          <p className="text-xs font-medium text-text-primary">{nodeRun.nodeType}</p>
          <span className={cn('text-[10px]', config.colorClass)}>
            {localize(config.labelKey)}
          </span>
        </button>

        {hasOutput && (
          <div className="group/output relative mt-0.5">
            {expanded ? (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-border-light bg-surface-secondary px-2 py-1.5 pr-7 font-mono text-[10px] text-text-secondary">
                {nodeRun.output}
              </pre>
            ) : (
              <p className="line-clamp-2 font-mono text-[10px] text-text-secondary">
                {nodeRun.output}
              </p>
            )}
            {expanded && (
              <div className="absolute right-1 top-1">
                <CopyButton text={nodeRun.output ?? ''} />
              </div>
            )}
          </div>
        )}

        {hasError && (
          <div className="group/error relative mt-1">
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5 pr-7 font-mono text-[10px] text-red-400">
              {nodeRun.error}
            </pre>
            <div className="absolute right-1 top-1">
              <CopyButton text={nodeRun.error ?? ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
