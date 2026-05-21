export type FlowNodeType =
  | 'trigger'
  | 'agent'
  | 'condition'
  | 'http'
  | 'human_approval'
  | 'output';

export type FlowRunStatus = 'running' | 'paused' | 'success' | 'failed' | 'skipped';
export type FlowNodeRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'skipped'
  | 'failed'
  | 'waiting';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TriggerNodeData = { type: 'trigger'; label?: string };

export type AgentNodeData = {
  type: 'agent';
  agentId: string;
  agentName?: string;
  agentAvatar?: string;
  instructionsOverride?: string;
  modelOverride?: string;
};

export type ConditionNodeData = {
  type: 'condition';
  criterio: string;
};

export type HttpHeader = { key: string; value: string };

export type HttpNodeData = {
  type: 'http';
  method: HttpMethod;
  url: string;
  headers: HttpHeader[];
  body?: string;
  timeout: number;
};

export type HumanApprovalNodeData = {
  type: 'human_approval';
  prompt: string;
  assigneeRole?: string;
  timeoutHours?: number;
};

export type OutputNodeData = {
  type: 'output';
  template?: string;
  label?: string;
};

export type FlowNodeData =
  | TriggerNodeData
  | AgentNodeData
  | ConditionNodeData
  | HttpNodeData
  | HumanApprovalNodeData
  | OutputNodeData;

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type Flow = {
  _id: string;
  tenantId: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
};

export type FlowNodeRun = {
  nodeId: string;
  nodeType: FlowNodeType;
  status: FlowNodeRunStatus;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type FlowRun = {
  _id: string;
  flowId: string;
  tenantId: string;
  status: FlowRunStatus;
  input: string;
  nodeRuns: FlowNodeRun[];
  startedAt: string;
  completedAt?: string;
  flowSnapshot: Flow;
  /** Monotonic flow revision captured at dispatch (epoch ms of flow.updatedAt). */
  flowVersion?: number;
  /** Node id a `paused` run is waiting on (human-approval). */
  pausedNodeId?: string;
  /** Accumulated RunContext, restored on resume. */
  context?: Record<string, string>;
};

export type TFlowListResponse = {
  flows: Flow[];
  nextCursor: string | null;
};

export type TFlowResponse = {
  flow: Flow;
};

export type TFlowMutationRequest = {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type TRunFlowRequest = {
  input?: string;
};

export type TRunFlowResponse = {
  runId: string;
  status: FlowRunStatus;
};

export type TFlowRunsResponse = {
  runs: FlowRun[];
  nextCursor: string | null;
};

export type TResumeRunRequest = {
  approved: boolean;
};
