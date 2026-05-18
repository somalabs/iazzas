import type { HumanApprovalNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { interpolate } from '../interpolate';

/**
 * Human-approval node. First execution pauses the run: it signals `pause` so
 * the runner persists `context` + `pausedNodeId`, sets status `paused` and
 * returns WITHOUT blocking a worker. The decision is applied later by
 * `FlowRunner.resume`, which follows the `approved` / `rejected` handle
 * deterministically — this node is never re-executed on resume.
 */
export async function humanNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
): Promise<FlowNodeOutput> {
  const data = node.data as HumanApprovalNodeData;
  const prompt = interpolate(data.prompt ?? '', ctx, { nodeId: node.id, logger: deps.logger });
  return { output: prompt, handle: 'default', pause: true };
}
