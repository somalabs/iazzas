import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useResumeFlowRunMutation } from '~/data-provider';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import { useFlowContext } from '../context';
import RunCard from './RunCard';

export default function RunsDrawer() {
  const localize = useLocalize();
  const { state, dispatch } = useFlowContext();
  const { showToast } = useToastContext();
  const resumeRun = useResumeFlowRunMutation(state.flowId ?? '');

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
    <AtelierDrawer
      open={state.runsOpen}
      title={localize('com_studio_flow_runs_title')}
      onClose={() => dispatch({ type: 'TOGGLE_RUNS' })}
    >
      {state.runs.length === 0 ? (
        <p className="text-xs text-text-tertiary">{localize('com_studio_flow_runs_empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {state.runs.map((run) => (
            <RunCard key={run._id} run={run} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </AtelierDrawer>
  );
}
