import type {
  Flow,
  FlowNode,
  FlowEdge,
  FlowNodeRun,
  FlowRunStatus,
} from 'librechat-data-provider';

/** Frozen view of a flow captured at dispatch time. */
export type FlowSnapshot = Pick<Flow, 'name' | 'nodes' | 'edges'>;

/**
 * Accumulated execution state. Keys are interpolation paths exactly as written
 * in `{{...}}` placeholders: `trigger.input`, `trigger.output`, `<nodeId>.output`.
 * Values are always strings; nothing else (no env, no globals) is ever placed here.
 */
export type FlowRunContext = Record<string, string>;

export interface FlowLogger {
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

/** Structured graph validation error (no free-form prose; client localizes by `code`). */
export interface FlowGraphError {
  code:
    | 'no_trigger'
    | 'multiple_triggers'
    | 'no_output'
    | 'cycle'
    | 'disconnected_node'
    | 'path_without_output'
    | 'agent_required'
    | 'agent_inaccessible';
  nodeId?: string;
}

/**
 * Raised by node executors / the runner. `retryable` is reserved for future use
 * (v1 performs no retries) but kept so security failures are explicitly marked
 * non-retryable and never silently re-attempted.
 */
export class FlowRunError extends Error {
  readonly retryable: boolean;
  readonly nodeId?: string;
  constructor(message: string, opts?: { retryable?: boolean; nodeId?: string }) {
    super(message);
    this.name = 'FlowRunError';
    this.retryable = opts?.retryable ?? false;
    this.nodeId = opts?.nodeId;
  }
}

/** Result of executing a single node. */
export interface FlowNodeOutput {
  /** Text output stored at `<nodeId>.output` in the RunContext. */
  output: string;
  /** Outgoing handle to follow (`default` | `true` | `false` | `approved` | `rejected`). */
  handle: string;
  /** Set by the human-approval node: the run must pause here. */
  pause?: boolean;
  /** Set by the output node: the run reached a terminal Saída node. */
  terminal?: boolean;
}

/** Per-run dependency injection. Heavy req/res-coupled work lives behind these seams. */
export interface FlowRunnerDeps {
  logger: FlowLogger;
  /** Wall clock; injectable for deterministic tests. */
  now: () => Date;
  /**
   * Runs a single existing agent to completion and returns its final text.
   * The /api controller wires this to the real AgentClient path; the agent's
   * own handoff/edge graph is suppressed (single-agent run only).
   */
  invokeAgent: (params: {
    agentId: string;
    input: string;
    instructionsOverride?: string;
    modelOverride?: string;
  }) => Promise<{ output: string }>;
  /** Returns true if the calling user may VIEW the given agent. */
  checkAgentAccess: (agentId: string) => Promise<boolean>;
  /** Minimal fetch seam (host already validated by the HTTP node before this is called). */
  httpFetch: (
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
  ) => Promise<{ status: number; text: () => Promise<string> }>;
}

/**
 * @param incoming output of the immediately-preceding node (or the trigger
 *   input for the first node). The Condition node evaluates against it; the
 *   Agent node uses it as the agent's message input.
 */
export type { Flow, FlowNode, FlowEdge };

export type FlowNodeExecutor = (
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
  incoming: string,
) => Promise<FlowNodeOutput>;

export interface PersistedNodeRun extends FlowNodeRun {
  nodeId: string;
}

export interface FlowRunSink {
  /** Persists the full run state after every node (step-by-step durability). */
  persist: (state: {
    status: FlowRunStatus;
    nodeRuns: PersistedNodeRun[];
    context: FlowRunContext;
    pausedNodeId?: string;
    completedAt?: Date;
  }) => Promise<void>;
}
