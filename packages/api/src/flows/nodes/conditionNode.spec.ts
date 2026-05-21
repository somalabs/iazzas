import type { FlowNode, FlowRunnerDeps } from '../types';
import { conditionNode } from './conditionNode';
import { FlowRunError } from '../types';

const baseDeps = (
  invokeJudge: FlowRunnerDeps['invokeJudge'],
): FlowRunnerDeps =>
  ({
    logger: { warn: () => {}, error: () => {} },
    now: () => new Date(0),
    invokeJudge,
  }) as unknown as FlowRunnerDeps;

const node = (criterio: string): FlowNode => ({
  id: 'c1',
  type: 'condition',
  position: { x: 0, y: 0 },
  data: { type: 'condition', criterio } as FlowNode['data'],
});

describe('conditionNode', () => {
  it('routes to true handle when judge answers true', async () => {
    const deps = baseDeps(async () => ({ answer: true, reasoning: 'matches' }));
    const r = await conditionNode(node('é reembolso?'), { 'trigger.input': 'quero reembolso' }, deps);
    expect(r.handle).toBe('true');
    expect(r.output).toContain('matches');
  });

  it('routes to false handle when judge answers false', async () => {
    const deps = baseDeps(async () => ({ answer: false, reasoning: 'no match' }));
    const r = await conditionNode(node('é reembolso?'), { 'trigger.input': 'oi' }, deps);
    expect(r.handle).toBe('false');
    expect(r.output).toContain('no match');
  });

  it('throws non-retryable when criterio is empty', async () => {
    const deps = baseDeps(async () => ({ answer: true, reasoning: '' }));
    await expect(conditionNode(node(''), {}, deps)).rejects.toBeInstanceOf(FlowRunError);
    await expect(conditionNode(node('   '), {}, deps)).rejects.toMatchObject({ retryable: false });
  });

  it('passes the context dump to the judge', async () => {
    const calls: Array<{ criterio: string; contextDump: string }> = [];
    const deps = baseDeps(async (params) => {
      calls.push(params);
      return { answer: true, reasoning: 'ok' };
    });
    await conditionNode(node('?'), { a: '1', b: '2' }, deps);
    expect(calls[0].contextDump).toContain('a: 1');
    expect(calls[0].contextDump).toContain('b: 2');
    expect(calls[0].criterio).toBe('?');
  });
});
