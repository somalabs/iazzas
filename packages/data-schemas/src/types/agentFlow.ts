import type { Types, Document } from 'mongoose';
import type {
  Flow,
  FlowNode,
  FlowEdge,
  FlowRunStatus,
  FlowNodeRun,
} from 'librechat-data-provider';

export interface IAgentFlow extends Document {
  tenantId?: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAgentFlowRun extends Document {
  tenantId?: string;
  flowId: Types.ObjectId;
  status: FlowRunStatus;
  input: string;
  nodeRuns: FlowNodeRun[];
  /** Accumulated RunContext, persisted step by step so a paused run can resume deterministically. */
  context: Record<string, string>;
  /** Frozen copy of the flow at dispatch time. Run/history reads use this, never the live flow. */
  flowSnapshot: Pick<Flow, 'name' | 'nodes' | 'edges'>;
  /** Monotonic flow revision captured at dispatch; lets history disambiguate snapshots. */
  flowVersion: number;
  /** Node id of the human-approval node a `paused` run is waiting on. */
  pausedNodeId?: string;
  startedAt: Date;
  completedAt?: Date;
}
