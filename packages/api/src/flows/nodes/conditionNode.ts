import type { ConditionNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { FlowRunError } from '../types';

function dumpContext(ctx: FlowRunContext): string {
  const entries = Object.entries(ctx);
  if (entries.length === 0) {
    return '(vazio)';
  }
  return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
}

/**
 * AI-judged router. The `criterio` is a free-form yes/no question; the runner
 * dependency `invokeJudge` answers with a structured boolean over the full
 * run context. Edges leave via the `true` / `false` handle.
 */
export async function conditionNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
): Promise<FlowNodeOutput> {
  const data = node.data as ConditionNodeData;
  const criterio = (data.criterio ?? '').trim();
  if (!criterio) {
    throw new FlowRunError('Decisão node has no criterio defined', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const contextDump = dumpContext(ctx);
  const { answer, reasoning } = await deps.invokeJudge({ criterio, contextDump });

  const handle = answer ? 'true' : 'false';
  return { output: `${handle}: ${reasoning}`, handle };
}
