import type { AgentNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { FlowRunError } from '../types';
import { interpolate } from '../interpolate';

/**
 * Executes one existing agent by reference.
 *
 * The agent's OWN handoff/edge graph is suppressed: `deps.invokeAgent` is wired
 * by the /api controller to run a single agent only (no edge collector, no
 * sub-agent BFS), so flow topology is the only routing authority here.
 *
 * Access is re-checked at run time (the flow could have been saved before a
 * permission change) via `deps.checkAgentAccess`; denial is non-retryable.
 */
export async function agentNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
  incoming: string,
): Promise<FlowNodeOutput> {
  const data = node.data as AgentNodeData;
  if (!data.agentId) {
    throw new FlowRunError('Agent node has no agent selected', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const allowed = await deps.checkAgentAccess(data.agentId);
  if (!allowed) {
    throw new FlowRunError('Agent node references an inaccessible agent', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const instructionsOverride = data.instructionsOverride
    ? interpolate(data.instructionsOverride, ctx, { nodeId: node.id, logger: deps.logger })
    : undefined;

  try {
    const { output } = await deps.invokeAgent({
      agentId: data.agentId,
      input: incoming,
      instructionsOverride,
      modelOverride: data.modelOverride || undefined,
    });
    return { output, handle: 'default' };
  } catch (err) {
    if (err instanceof FlowRunError) {
      throw err;
    }
    throw new FlowRunError('Agent execution failed', { retryable: false, nodeId: node.id });
  }
}
