import type { Node, Edge } from '@xyflow/react';

type ValidationError = { key: string; label?: string };

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const triggerNodes = nodes.filter((n) => n.type === 'trigger');
  const outputNodes = nodes.filter((n) => n.type === 'output');

  if (triggerNodes.length === 0) {
    errors.push({ key: 'com_studio_flow_error_no_trigger' });
  }
  if (outputNodes.length === 0) {
    errors.push({ key: 'com_studio_flow_error_no_output' });
  }

  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  for (const n of nodes) {
    if (n.type === 'trigger') continue;
    if (!connectedIds.has(n.id)) {
      const label =
        (n.data as { label?: string; agentName?: string; url?: string }).label ??
        (n.data as { agentName?: string }).agentName ??
        (n.data as { url?: string }).url ??
        n.type ??
        n.id;
      errors.push({ key: 'com_studio_flow_error_disconnected_node', label });
    }
  }

  return errors;
}

export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some(
    (e) =>
      e.key === 'com_studio_flow_error_no_trigger' ||
      e.key === 'com_studio_flow_error_no_output',
  );
}
