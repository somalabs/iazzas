import type { FlowNode, FlowEdge, FlowGraphError } from './types';
import { FlowRunError } from './types';

function adjacency(edges: FlowEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) {
      list.push(e.target);
    } else {
      adj.set(e.source, [e.target]);
    }
  }
  return adj;
}

function indegrees(nodeIds: string[], edges: FlowEdge[]): Map<string, number> {
  const deg = new Map<string, number>();
  for (const id of nodeIds) {
    deg.set(id, 0);
  }
  for (const e of edges) {
    if (deg.has(e.target)) {
      deg.set(e.target, (deg.get(e.target) as number) + 1);
    }
  }
  return deg;
}

/**
 * Kahn topological order. Throws a non-retryable {@link FlowRunError} on cycle
 * (loops are forbidden in v1 and rejected at save, but the runner is fail-closed).
 */
export function topoOrder(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const ids = nodes.map((n) => n.id);
  const deg = indegrees(ids, edges);
  const adj = adjacency(edges);
  const queue: string[] = [];
  for (const id of ids) {
    if (deg.get(id) === 0) {
      queue.push(id);
    }
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (deg.get(next) ?? 0) - 1;
      deg.set(next, d);
      if (d === 0) {
        queue.push(next);
      }
    }
  }
  if (order.length !== ids.length) {
    throw new FlowRunError('Flow contains a cycle', { retryable: false });
  }
  return order;
}

function reachableFromTrigger(
  triggerId: string,
  adj: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>([triggerId]);
  const stack = [triggerId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    for (const next of adj.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/**
 * Validates a flow graph. Returns structured errors (empty array = valid).
 * Pure and deterministic; the client localizes each `code`.
 *
 * @param accessibleAgentIds when provided, agent nodes referencing an id absent
 *   from this set yield `agent_inaccessible`.
 */
export function validateGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  accessibleAgentIds?: Set<string>,
): FlowGraphError[] {
  const errors: FlowGraphError[] = [];
  const triggers = nodes.filter((n) => n.type === 'trigger');
  const outputs = nodes.filter((n) => n.type === 'output');

  if (triggers.length === 0) {
    errors.push({ code: 'no_trigger' });
  } else if (triggers.length > 1) {
    for (const t of triggers) {
      errors.push({ code: 'multiple_triggers', nodeId: t.id });
    }
  }
  if (outputs.length === 0) {
    errors.push({ code: 'no_output' });
  }

  for (const n of nodes) {
    if (n.type !== 'agent') {
      continue;
    }
    const agentId = (n.data as { agentId?: string }).agentId;
    if (!agentId) {
      errors.push({ code: 'agent_required', nodeId: n.id });
    } else if (accessibleAgentIds && !accessibleAgentIds.has(agentId)) {
      errors.push({ code: 'agent_inaccessible', nodeId: n.id });
    }
  }

  const adj = adjacency(edges);

  let acyclic = true;
  try {
    topoOrder(nodes, edges);
  } catch {
    acyclic = false;
    errors.push({ code: 'cycle' });
  }

  if (triggers.length === 1) {
    const reachable = reachableFromTrigger(triggers[0].id, adj);
    for (const n of nodes) {
      if (n.id !== triggers[0].id && !reachable.has(n.id)) {
        errors.push({ code: 'disconnected_node', nodeId: n.id });
      }
    }
    if (acyclic) {
      for (const n of nodes) {
        if (n.type === 'output') {
          continue;
        }
        if (!reachable.has(n.id) && n.id !== triggers[0].id) {
          continue;
        }
        const out = adj.get(n.id) ?? [];
        if (out.length === 0) {
          errors.push({ code: 'path_without_output', nodeId: n.id });
        }
      }
    }
  }

  return errors;
}
