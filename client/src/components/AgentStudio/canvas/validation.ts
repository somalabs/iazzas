import type { Node, Edge } from '@xyflow/react';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationError = {
  key: string;
  label?: string;
  nodeId?: string;
  severity: ValidationSeverity;
};

function getNodeLabel(n: Node): string {
  const d = (n.data ?? {}) as {
    label?: string;
    agentName?: string;
    url?: string;
    serverName?: string;
  };
  return d.label ?? d.agentName ?? d.url ?? d.serverName ?? n.type ?? n.id;
}

function buildAdj(edges: Edge[]): Map<string, string[]> {
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

function reachableFrom(startId: string, adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([startId]);
  const stack = [startId];
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

function hasCycleKahn(nodes: Node[], edges: Edge[]): boolean {
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    if (indegree.has(e.target)) {
      indegree.set(e.target, (indegree.get(e.target) as number) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }
  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift() as string;
    processed++;
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return processed !== nodes.length;
}

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const triggerNodes = nodes.filter((n) => n.type === 'trigger');
  const outputNodes = nodes.filter((n) => n.type === 'output');

  if (triggerNodes.length === 0) {
    errors.push({ key: 'com_studio_flow_error_no_trigger', severity: 'error' });
  } else if (triggerNodes.length > 1) {
    for (const t of triggerNodes) {
      errors.push({
        key: 'com_studio_flow_error_multiple_triggers',
        nodeId: t.id,
        label: getNodeLabel(t),
        severity: 'error',
      });
    }
  }

  if (outputNodes.length === 0) {
    errors.push({ key: 'com_studio_flow_error_no_output', severity: 'error' });
  }

  const cycle = hasCycleKahn(nodes, edges);
  if (cycle) {
    errors.push({ key: 'com_studio_flow_error_cycle', severity: 'error' });
  }

  if (triggerNodes.length === 1 && !cycle) {
    const adj = buildAdj(edges);
    const reachable = reachableFrom(triggerNodes[0].id, adj);
    const outDegree = new Map<string, number>();
    for (const e of edges) {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
    }

    for (const n of nodes) {
      if (n.id === triggerNodes[0].id) continue;
      if (!reachable.has(n.id)) {
        errors.push({
          key: 'com_studio_flow_error_disconnected_node',
          nodeId: n.id,
          label: getNodeLabel(n),
          severity: 'warning',
        });
        continue;
      }
      if (n.type !== 'output' && (outDegree.get(n.id) ?? 0) === 0) {
        errors.push({
          key: 'com_studio_flow_error_path_without_output',
          nodeId: n.id,
          label: getNodeLabel(n),
          severity: 'error',
        });
      }
    }

    // Check trigger itself for path_without_output (no outgoing edges)
    if ((outDegree.get(triggerNodes[0].id) ?? 0) === 0 && nodes.length > 1) {
      errors.push({
        key: 'com_studio_flow_error_path_without_output',
        nodeId: triggerNodes[0].id,
        label: getNodeLabel(triggerNodes[0]),
        severity: 'error',
      });
    }
  }

  return errors;
}

const SAVE_BLOCKING_KEYS = new Set([
  'com_studio_flow_error_no_trigger',
  'com_studio_flow_error_no_output',
  'com_studio_flow_error_multiple_triggers',
  'com_studio_flow_error_cycle',
  'com_studio_flow_error_path_without_output',
]);

export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => SAVE_BLOCKING_KEYS.has(e.key));
}
