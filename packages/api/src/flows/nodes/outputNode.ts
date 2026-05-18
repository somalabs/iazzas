import type { OutputNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { interpolate } from '../interpolate';

/**
 * Terminal node. Consolidates the run result: the interpolated `template` when
 * set, otherwise the incoming value (output of the preceding node). Reaching
 * any Saída node ends the run with `success`.
 */
export async function outputNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
  incoming: string,
): Promise<FlowNodeOutput> {
  const data = node.data as OutputNodeData;
  const output = data.template
    ? interpolate(data.template, ctx, { nodeId: node.id, logger: deps.logger })
    : incoming;
  return { output, handle: 'default', terminal: true };
}
