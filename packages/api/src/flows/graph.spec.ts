import type { FlowNode, FlowEdge } from './types';
import { validateGraph, topoOrder } from './graph';
import { FlowRunError } from './types';

const n = (id: string, type: FlowNode['type'], data: object = {}): FlowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { type, ...data } as FlowNode['data'],
});
const e = (source: string, target: string, sourceHandle?: string): FlowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle,
});

describe('topoOrder', () => {
  it('orders a linear flow trigger->agent->output', () => {
    const nodes = [n('t', 'trigger'), n('a', 'agent', { agentId: 'x' }), n('o', 'output')];
    const edges = [e('t', 'a'), e('a', 'o')];
    expect(topoOrder(nodes, edges)).toEqual(['t', 'a', 'o']);
  });

  it('throws non-retryable FlowRunError on a cycle', () => {
    const nodes = [n('a', 'agent', { agentId: 'x' }), n('b', 'agent', { agentId: 'y' })];
    const edges = [e('a', 'b'), e('b', 'a')];
    try {
      topoOrder(nodes, edges);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowRunError);
      expect((err as FlowRunError).retryable).toBe(false);
    }
  });
});

describe('validateGraph', () => {
  it('passes a valid linear flow', () => {
    const nodes = [n('t', 'trigger'), n('a', 'agent', { agentId: 'x' }), n('o', 'output')];
    const edges = [e('t', 'a'), e('a', 'o')];
    expect(validateGraph(nodes, edges, new Set(['x']))).toEqual([]);
  });

  it('flags missing trigger and missing output', () => {
    const codes = validateGraph([n('a', 'agent', { agentId: 'x' })], []).map((x) => x.code);
    expect(codes).toContain('no_trigger');
    expect(codes).toContain('no_output');
  });

  it('flags multiple triggers', () => {
    const nodes = [n('t1', 'trigger'), n('t2', 'trigger'), n('o', 'output')];
    const codes = validateGraph(nodes, [e('t1', 'o'), e('t2', 'o')]).map((x) => x.code);
    expect(codes).toContain('multiple_triggers');
  });

  it('flags a cycle', () => {
    const nodes = [
      n('t', 'trigger'),
      n('a', 'agent', { agentId: 'x' }),
      n('b', 'agent', { agentId: 'y' }),
      n('o', 'output'),
    ];
    const edges = [e('t', 'a'), e('a', 'b'), e('b', 'a'), e('a', 'o')];
    expect(validateGraph(nodes, edges).map((x) => x.code)).toContain('cycle');
  });

  it('flags a disconnected node', () => {
    const nodes = [
      n('t', 'trigger'),
      n('o', 'output'),
      n('orphan', 'agent', { agentId: 'x' }),
    ];
    const errs = validateGraph(nodes, [e('t', 'o')], new Set(['x']));
    expect(errs.some((x) => x.code === 'disconnected_node' && x.nodeId === 'orphan')).toBe(true);
  });

  it('flags a non-output dead-end as path_without_output', () => {
    const nodes = [
      n('t', 'trigger'),
      n('a', 'agent', { agentId: 'x' }),
      n('o', 'output'),
    ];
    const errs = validateGraph(nodes, [e('t', 'a'), e('t', 'o')], new Set(['x']));
    expect(errs.some((x) => x.code === 'path_without_output' && x.nodeId === 'a')).toBe(true);
  });

  it('flags agent_required and agent_inaccessible', () => {
    const nodes = [
      n('t', 'trigger'),
      n('a1', 'agent', {}),
      n('a2', 'agent', { agentId: 'secret' }),
      n('o', 'output'),
    ];
    const edges = [e('t', 'a1'), e('a1', 'a2'), e('a2', 'o')];
    const codes = validateGraph(nodes, edges, new Set(['public'])).map((x) => x.code);
    expect(codes).toContain('agent_required');
    expect(codes).toContain('agent_inaccessible');
  });
});
