import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';

/**
 * First-class entry node. Emits the dispatch input downstream unchanged.
 * `trigger.input` / `trigger.output` are seeded in the RunContext by the runner.
 */
export async function triggerNode(
  _node: FlowNode,
  _ctx: FlowRunContext,
  _deps: FlowRunnerDeps,
  incoming: string,
): Promise<FlowNodeOutput> {
  return { output: incoming, handle: 'default' };
}
