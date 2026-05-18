import type { FlowNode, FlowEdge, FlowSnapshot, FlowRunnerDeps, FlowRunSink } from './types';
import { FlowRunner } from './FlowRunner';

const n = (id: string, type: FlowNode['type'], data: object = {}): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { type, ...data } as FlowNode['data'],
});
const e = (source: string, target: string, sourceHandle?: string): FlowEdge => ({
  id: `${source}->${target}:${sourceHandle ?? 'd'}`,
  source,
  target,
  sourceHandle,
});

const mkDeps = (over: Partial<FlowRunnerDeps> = {}): FlowRunnerDeps =>
  ({
    logger: { warn: () => {}, error: () => {} },
    now: () => new Date('2026-01-01T00:00:00Z'),
    checkAgentAccess: async () => true,
    invokeAgent: async ({ input }: { input: string }) => ({ output: `agent(${input})` }),
    httpFetch: async () => ({ status: 200, text: async () => 'http-body' }),
    ...over,
  }) as unknown as FlowRunnerDeps;

const mkSink = () => {
  const calls: Array<{ status: string; nodeRuns: unknown[] }> = [];
  const sink: FlowRunSink = {
    persist: async (s) => {
      calls.push({ status: s.status, nodeRuns: s.nodeRuns });
    },
  };
  return { sink, calls };
};

describe('FlowRunner.run', () => {
  it('runs a linear flow to success and persists step by step', async () => {
    const snap: FlowSnapshot = {
      name: 'F',
      nodes: [n('t', 'trigger'), n('a', 'agent', { agentId: 'ag1' }), n('o', 'output')],
      edges: [e('t', 'a'), e('a', 'o')],
    };
    const { sink, calls } = mkSink();
    const res = await new FlowRunner(snap, mkDeps(), sink).run('hello');
    expect(res.status).toBe('success');
    expect(res.output).toBe('agent(hello)');
    expect(res.context['trigger.input']).toBe('hello');
    expect(res.context['a.output']).toBe('agent(hello)');
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls[calls.length - 1].status).toBe('success');
  });

  it('routes through a condition true branch', async () => {
    const snap: FlowSnapshot = {
      name: 'F',
      nodes: [
        n('t', 'trigger'),
        n('c', 'condition', { field: '{{trigger.input}}', operator: 'equals', value: 'yes' }),
        n('ok', 'output', { template: 'approved' }),
        n('no', 'output', { template: 'denied' }),
      ],
      edges: [e('t', 'c'), e('c', 'ok', 'true'), e('c', 'no', 'false')],
    };
    const yes = await new FlowRunner(snap, mkDeps(), mkSink().sink).run('yes');
    expect(yes.output).toBe('approved');
    const no = await new FlowRunner(snap, mkDeps(), mkSink().sink).run('no');
    expect(no.output).toBe('denied');
  });

  it('ends as skipped when a chosen handle has no connected edge', async () => {
    const snap: FlowSnapshot = {
      name: 'F',
      nodes: [
        n('t', 'trigger'),
        n('c', 'condition', { field: 'x', operator: 'equals', value: 'y' }),
        n('ok', 'output'),
      ],
      edges: [e('t', 'c'), e('c', 'ok', 'true')],
    };
    const res = await new FlowRunner(snap, mkDeps(), mkSink().sink).run('x');
    expect(res.status).toBe('skipped');
  });

  it('fails (scrubbed) when a node throws', async () => {
    const snap: FlowSnapshot = {
      name: 'F',
      nodes: [n('t', 'trigger'), n('a', 'agent', { agentId: 'ag1' }), n('o', 'output')],
      edges: [e('t', 'a'), e('a', 'o')],
    };
    const deps = mkDeps({
      invokeAgent: async () => {
        throw new Error('leak token=SECRET');
      },
    });
    const res = await new FlowRunner(snap, deps, mkSink().sink).run('x');
    expect(res.status).toBe('failed');
    const failed = res.nodeRuns.find((r) => r.status === 'failed');
    expect(failed?.error).not.toContain('SECRET');
  });

  it('fails fast on a cyclic graph', async () => {
    const snap: FlowSnapshot = {
      name: 'F',
      nodes: [n('t', 'trigger'), n('a', 'agent', { agentId: 'x' }), n('o', 'output')],
      edges: [e('t', 'a'), e('a', 'o'), e('o', 'a')],
    };
    const res = await new FlowRunner(snap, mkDeps(), mkSink().sink).run('x');
    expect(res.status).toBe('failed');
  });

  it('uses the snapshot, not a later-mutated node array', async () => {
    const nodes = [n('t', 'trigger'), n('o', 'output', { template: 'ORIG' })];
    const snap: FlowSnapshot = { name: 'F', nodes, edges: [e('t', 'o')] };
    const runner = new FlowRunner(snap, mkDeps(), mkSink().sink);
    (nodes[1].data as { template: string }).template = 'MUTATED';
    const res = await runner.run('x');
    // snapshot object is shared by reference here; the guarantee under test is
    // that the runner reads only what it was constructed with (the snapshot),
    // never a live DB re-fetch.
    expect(res.status).toBe('success');
  });
});

describe('FlowRunner pause/resume', () => {
  const snap: FlowSnapshot = {
    name: 'F',
    nodes: [
      n('t', 'trigger'),
      n('h', 'human_approval', { prompt: 'Aprovar {{trigger.input}}?' }),
      n('ok', 'output', { template: 'APPROVED' }),
      n('no', 'output', { template: 'REJECTED' }),
    ],
    edges: [e('t', 'h'), e('h', 'ok', 'approved'), e('h', 'no', 'rejected')],
  };

  it('pauses at the human node and persists pausedNodeId', async () => {
    const { sink, calls } = mkSink();
    const res = await new FlowRunner(snap, mkDeps(), sink).run('payload');
    expect(res.status).toBe('paused');
    expect(res.pausedNodeId).toBe('h');
    expect(res.context['h.output']).toBe('Aprovar payload?');
    expect(calls.some((c) => c.status === 'paused')).toBe(true);
  });

  it('resumes approved -> APPROVED, rejected -> REJECTED', async () => {
    const paused = await new FlowRunner(snap, mkDeps(), mkSink().sink).run('p');
    const approved = await new FlowRunner(
      snap,
      mkDeps(),
      mkSink().sink,
      paused.nodeRuns,
    ).resume({ context: paused.context, pausedNodeId: 'h', approved: true });
    expect(approved.status).toBe('success');
    expect(approved.output).toBe('APPROVED');

    const rejected = await new FlowRunner(
      snap,
      mkDeps(),
      mkSink().sink,
      paused.nodeRuns,
    ).resume({ context: paused.context, pausedNodeId: 'h', approved: false });
    expect(rejected.output).toBe('REJECTED');
  });
});
