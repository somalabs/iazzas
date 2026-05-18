import type { Node, Edge } from '@xyflow/react';
import type { FlowNode, FlowEdge, FlowNodeData, FlowNodeType } from 'librechat-data-provider';

/** Maps canvas (React Flow) nodes/edges to the persisted Flow contract. */
export function serializeNodes(nodes: Node[]): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type as FlowNodeType,
    position: n.position,
    data: n.data as unknown as FlowNodeData,
  }));
}

export function serializeEdges(edges: Edge[]): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
}

/** Maps persisted Flow nodes/edges back to React Flow shapes. */
export function deserializeNodes(nodes: FlowNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: (n.data ?? {}) as unknown as Record<string, unknown>,
  }));
}

export function deserializeEdges(edges: FlowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }));
}
