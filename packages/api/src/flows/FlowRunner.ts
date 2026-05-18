import type { FlowRunStatus } from 'librechat-data-provider';
import type {
  FlowNode,
  FlowEdge,
  FlowSnapshot,
  FlowRunContext,
  FlowRunnerDeps,
  FlowRunSink,
  FlowNodeExecutor,
  PersistedNodeRun,
} from './types';
import { FlowRunError } from './types';
import { topoOrder } from './graph';
import { triggerNode } from './nodes/triggerNode';
import { agentNode } from './nodes/agentNode';
import { conditionNode } from './nodes/conditionNode';
import { httpNode } from './nodes/httpNode';
import { humanNode } from './nodes/humanNode';
import { outputNode } from './nodes/outputNode';

const EXECUTORS: Record<FlowNode['type'], FlowNodeExecutor> = {
  trigger: triggerNode,
  agent: agentNode,
  condition: conditionNode,
  http: httpNode,
  human_approval: humanNode,
  output: outputNode,
};

export interface FlowRunResult {
  status: FlowRunStatus;
  nodeRuns: PersistedNodeRun[];
  context: FlowRunContext;
  output?: string;
  pausedNodeId?: string;
}

function matchesHandle(edge: FlowEdge, handle: string): boolean {
  const h = edge.sourceHandle;
  if (handle === 'default') {
    return h == null || h === 'default';
  }
  return h === handle;
}

/**
 * Executes a flow over a frozen {@link FlowSnapshot}. v1 is linear: a single
 * active path is followed edge-by-edge (no parallel branches). State is
 * persisted via `sink.persist` after EVERY node so a crash or pause can be
 * recovered. The runner never reads the live flow — only the snapshot.
 */
export class FlowRunner {
  private readonly nodeMap: Map<string, FlowNode>;
  private readonly runMap = new Map<string, PersistedNodeRun>();
  private nodeRuns: PersistedNodeRun[] = [];

  constructor(
    private readonly snapshot: FlowSnapshot,
    private readonly deps: FlowRunnerDeps,
    private readonly sink: FlowRunSink,
    seedNodeRuns?: PersistedNodeRun[],
  ) {
    this.nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));
    if (seedNodeRuns) {
      this.nodeRuns = seedNodeRuns.map((r) => ({ ...r }));
      for (const r of this.nodeRuns) {
        this.runMap.set(r.nodeId, r);
      }
    }
  }

  private edge(sourceId: string, handle: string): FlowEdge | undefined {
    return this.snapshot.edges.find((e) => e.source === sourceId && matchesHandle(e, handle));
  }

  private upsertRun(node: FlowNode): PersistedNodeRun {
    const existing = this.runMap.get(node.id);
    if (existing) {
      return existing;
    }
    const entry: PersistedNodeRun = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'pending',
    };
    this.runMap.set(node.id, entry);
    this.nodeRuns.push(entry);
    return entry;
  }

  private persist(
    status: FlowRunStatus,
    extra?: { context: FlowRunContext; pausedNodeId?: string; completedAt?: Date },
  ): Promise<void> {
    return this.sink.persist({
      status,
      nodeRuns: this.nodeRuns.map((r) => ({ ...r })),
      context: extra?.context ?? {},
      pausedNodeId: extra?.pausedNodeId,
      completedAt: extra?.completedAt,
    });
  }

  private async traverse(
    startId: string,
    incoming: string,
    ctx: FlowRunContext,
  ): Promise<FlowRunResult> {
    let currentId: string | undefined = startId;
    let carry = incoming;

    while (currentId) {
      const node = this.nodeMap.get(currentId);
      if (!node) {
        await this.persist('failed', { context: ctx, completedAt: this.deps.now() });
        return { status: 'failed', nodeRuns: this.nodeRuns, context: ctx };
      }

      const entry = this.upsertRun(node);
      entry.status = 'running';
      entry.startedAt = this.deps.now().toISOString();
      await this.persist('running', { context: ctx });

      let result;
      try {
        result = await EXECUTORS[node.type](node, ctx, this.deps, carry);
      } catch (err) {
        const message =
          err instanceof FlowRunError ? err.message : 'Node execution failed';
        entry.status = 'failed';
        entry.error = message;
        entry.completedAt = this.deps.now().toISOString();
        await this.persist('failed', { context: ctx, completedAt: this.deps.now() });
        return { status: 'failed', nodeRuns: this.nodeRuns, context: ctx };
      }

      ctx[`${node.id}.output`] = result.output;
      entry.output = result.output;

      if (result.pause) {
        entry.status = 'waiting';
        await this.persist('paused', {
          context: ctx,
          pausedNodeId: node.id,
        });
        return {
          status: 'paused',
          nodeRuns: this.nodeRuns,
          context: ctx,
          pausedNodeId: node.id,
        };
      }

      entry.status = 'completed';
      entry.completedAt = this.deps.now().toISOString();
      await this.persist('running', { context: ctx });

      if (result.terminal) {
        await this.persist('success', { context: ctx, completedAt: this.deps.now() });
        return {
          status: 'success',
          nodeRuns: this.nodeRuns,
          context: ctx,
          output: result.output,
        };
      }

      const next = this.edge(node.id, result.handle);
      if (!next) {
        await this.persist('skipped', { context: ctx, completedAt: this.deps.now() });
        return { status: 'skipped', nodeRuns: this.nodeRuns, context: ctx };
      }
      carry = result.output;
      currentId = next.target;
    }

    await this.persist('skipped', { context: ctx, completedAt: this.deps.now() });
    return { status: 'skipped', nodeRuns: this.nodeRuns, context: ctx };
  }

  /** Runs the flow from its single Trigger with the dispatch `input`. */
  async run(input: string): Promise<FlowRunResult> {
    const ctx: FlowRunContext = {
      'trigger.input': input,
      'trigger.output': input,
    };

    try {
      topoOrder(this.snapshot.nodes, this.snapshot.edges);
    } catch {
      await this.persist('failed', { context: ctx, completedAt: this.deps.now() });
      return { status: 'failed', nodeRuns: this.nodeRuns, context: ctx };
    }

    const triggers = this.snapshot.nodes.filter((n) => n.type === 'trigger');
    if (triggers.length !== 1) {
      await this.persist('failed', { context: ctx, completedAt: this.deps.now() });
      return { status: 'failed', nodeRuns: this.nodeRuns, context: ctx };
    }

    return this.traverse(triggers[0].id, input, ctx);
  }

  /**
   * Resumes a `paused` run from its human-approval node. The node is NOT
   * re-executed; the persisted context is restored and the `approved` /
   * `rejected` handle is followed deterministically.
   */
  async resume(params: {
    context: FlowRunContext;
    pausedNodeId: string;
    approved: boolean;
  }): Promise<FlowRunResult> {
    const ctx: FlowRunContext = { ...params.context };
    const human = this.nodeMap.get(params.pausedNodeId);
    if (!human) {
      await this.persist('failed', { context: ctx, completedAt: this.deps.now() });
      return { status: 'failed', nodeRuns: this.nodeRuns, context: ctx };
    }

    const entry = this.upsertRun(human);
    entry.status = 'completed';
    entry.completedAt = this.deps.now().toISOString();

    const handle = params.approved ? 'approved' : 'rejected';
    const next = this.edge(params.pausedNodeId, handle);
    if (!next) {
      await this.persist('skipped', { context: ctx, completedAt: this.deps.now() });
      return { status: 'skipped', nodeRuns: this.nodeRuns, context: ctx };
    }

    const carry = ctx[`${params.pausedNodeId}.output`] ?? '';
    return this.traverse(next.target, carry, ctx);
  }
}
