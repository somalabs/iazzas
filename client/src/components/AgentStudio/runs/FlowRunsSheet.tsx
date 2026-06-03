import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Spinner, useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useFlowRunsQuery, useResumeFlowRunMutation } from '~/data-provider';
import { cn } from '~/utils';
import RunCard from './RunCard';

type FlowRunsSheetProps = {
  flowId: string;
  flowName: string;
  open: boolean;
  onClose: () => void;
};

const ACTIVE_STATUSES = new Set(['running', 'paused']);

export default function FlowRunsSheet({ flowId, flowName, open, onClose }: FlowRunsSheetProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const { data, isLoading } = useFlowRunsQuery(flowId, {
    enabled: open,
    refetchInterval: (latest) =>
      open && (latest?.runs ?? []).some((run) => ACTIVE_STATUSES.has(run.status)) ? 2500 : false,
  });
  const runs = data?.runs ?? [];

  const resumeRun = useResumeFlowRunMutation(flowId);
  const decide = (runId: string, approved: boolean) =>
    resumeRun.mutate(
      { runId, approved },
      {
        onError: () =>
          showToast({ message: localize('com_studio_flow_run_error'), status: 'error' }),
      },
    );

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-safe:animate-fade-in-fast" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col',
            'rounded-t-2xl border-t border-border-medium bg-surface-dialog shadow-xl',
            'motion-safe:animate-slide-in-up',
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 flex-shrink-0 rounded-full bg-border-medium" />
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-text-primary">
                {localize('com_studio_flow_runs_title')}
              </Dialog.Title>
              <p className="truncate text-xs text-text-tertiary">{flowName}</p>
            </div>
            <Dialog.Close
              className="flex-shrink-0 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
              aria-label={localize('com_ui_close')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {isLoading && (
              <div className="flex h-24 items-center justify-center">
                <Spinner className="size-5 text-text-secondary" />
              </div>
            )}
            {!isLoading && runs.length === 0 && (
              <p className="py-8 text-center text-xs text-text-tertiary">
                {localize('com_studio_flow_runs_empty')}
              </p>
            )}
            {!isLoading && runs.length > 0 && (
              <div className="flex flex-col gap-2">
                {runs.map((run) => (
                  <RunCard
                    key={run._id}
                    run={run}
                    onApprove={(runId) => decide(runId, true)}
                    onReject={(runId) => decide(runId, false)}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
