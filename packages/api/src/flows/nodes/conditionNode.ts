import type { ConditionNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { FlowRunError } from '../types';
import { interpolate } from '../interpolate';

/** Tokenises a minimal JSONPath: `$.a.b`, `a[0].b`, `a["x"]`. No eval, no library. */
function jsonPathSegments(path: string): string[] {
  const cleaned = path.replace(/^\$\.?/, '');
  const segs: string[] = [];
  const re = /[^.[\]"']+|\[(\d+)\]|\["([^"]*)"\]|\['([^']*)'\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    segs.push(m[1] ?? m[2] ?? m[3] ?? m[0]);
  }
  return segs.filter((s) => s.length > 0);
}

function jsonPathExists(raw: string, path: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  let cursor: unknown = parsed;
  for (const seg of jsonPathSegments(path)) {
    if (cursor == null || typeof cursor !== 'object') {
      return false;
    }
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor != null;
}

/**
 * Deterministic, zero-LLM router. Evaluates `field` (lhs) against `value` (rhs)
 * — both interpolated — and routes to the `true` or `false` handle.
 * Invalid regex is a non-retryable {@link FlowRunError} (never silently retried).
 */
export async function conditionNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
): Promise<FlowNodeOutput> {
  const data = node.data as ConditionNodeData;
  const lhs = interpolate(data.field ?? '', ctx, { nodeId: node.id, logger: deps.logger });
  const rhs = interpolate(data.value ?? '', ctx, { nodeId: node.id, logger: deps.logger });

  let result: boolean;
  switch (data.operator) {
    case 'equals':
      result = lhs === rhs;
      break;
    case 'contains':
      result = lhs.includes(rhs);
      break;
    case 'regex': {
      let re: RegExp;
      try {
        re = new RegExp(rhs);
      } catch {
        throw new FlowRunError('Invalid regular expression in condition', {
          retryable: false,
          nodeId: node.id,
        });
      }
      result = re.test(lhs);
      break;
    }
    case 'jsonpath_exists':
      result = jsonPathExists(lhs, rhs);
      break;
    default:
      throw new FlowRunError('Unknown condition operator', {
        retryable: false,
        nodeId: node.id,
      });
  }

  const handle = result ? 'true' : 'false';
  return { output: handle, handle };
}
