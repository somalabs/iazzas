import type { FlowRun } from 'librechat-data-provider';
import type { AutomationRun } from './context';

/**
 * Maps an Épico-1 `FlowRun` (the persisted run record) onto the design's
 * `AutomationRun` view model used by RunsDrawer. `paused` collapses to
 * `running` (the drawer has no paused state); the displayed output is the
 * last node that produced text.
 */
export function toAutomationRun(run: FlowRun, automationId: string): AutomationRun {
  const status = run.status === 'paused' ? 'running' : run.status;
  const lastWithOutput = [...(run.nodeRuns ?? [])]
    .reverse()
    .find((n) => n.output != null && n.output !== '');
  return {
    _id: run._id,
    automationId,
    status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    input: run.input,
    output: lastWithOutput?.output,
  };
}
