import type { FlowNode, FlowRunnerDeps } from '../types';
import { outputNode } from './outputNode';
import { humanNode } from './humanNode';

const deps = {
  logger: { warn: () => {}, error: () => {} },
  now: () => new Date(0),
} as unknown as FlowRunnerDeps;

const mk = (type: FlowNode['type'], data: object): FlowNode => ({
  id: 'x',
  type,
  position: { x: 0, y: 0 },
  data: { type, ...data } as FlowNode['data'],
});

describe('outputNode', () => {
  it('uses incoming when no template', async () => {
    const r = await outputNode(mk('output', {}), {}, deps, 'final-value');
    expect(r).toEqual({ output: 'final-value', handle: 'default', terminal: true });
  });
  it('renders the template with context', async () => {
    const r = await outputNode(mk('output', { template: 'R: {{a}}' }), { a: '42' }, deps, 'ignored');
    expect(r.output).toBe('R: 42');
    expect(r.terminal).toBe(true);
  });
});

describe('humanNode', () => {
  it('signals pause and returns the interpolated prompt', async () => {
    const r = await humanNode(mk('human_approval', { prompt: 'Aprovar {{a}}?' }), { a: 'X' }, deps);
    expect(r.pause).toBe(true);
    expect(r.output).toBe('Aprovar X?');
  });
});
