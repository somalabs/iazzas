import { X } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useResumeFlowRunMutation } from '~/data-provider';
import { useFlowContext } from '../context';
import RunCard from './RunCard';

export default function RunsDrawer() {
  const localize = useLocalize();
  const { state, dispatch } = useFlowContext();
  const { showToast } = useToastContext();
  const resumeRun = useResumeFlowRunMutation(state.flowId ?? '');

  if (!state.runsOpen) {
    return null;
  }

  const decide = (runId: string, approved: boolean) =>
    resumeRun.mutate(
      { runId, approved },
      {
        onError: () =>
          showToast({ message: localize('com_studio_flow_run_error'), status: 'error' }),
      },
    );

  const handleApprove = (runId: string) => decide(runId, true);
  const handleReject = (runId: string) => decide(runId, false);

  return (
    <aside
      role="complementary"
      aria-label={localize('com_studio_flow_runs_title')}
      className="flex h-full w-[320px] flex-shrink-0 flex-col border-l border-border-light bg-surface-secondary animate-slide-in-right"
    >
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <p className="text-xs font-semibold text-text-primary">
          {localize('com_studio_flow_runs_title')}
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_RUNS' })}
          aria-label="Fechar histórico de execuções"
          className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {state.runs.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            {localize('com_studio_flow_runs_empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {state.runs.map((run) => (
              <RunCard
                key={run._id}
                run={run}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
