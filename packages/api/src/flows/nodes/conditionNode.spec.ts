import type { FlowNode, FlowRunnerDeps } from '../types';
import { conditionNode } from './conditionNode';
import { FlowRunError } from '../types';

const deps = {
  logger: { warn: () => {}, error: () => {} },
  now: () => new Date(0),
} as unknown as FlowRunnerDeps;

const node = (data: object): FlowNode => ({
  id: 'c1',
  type: 'condition',
  position: { x: 0, y: 0 },
  data: { type: 'condition', ...data } as FlowNode['data'],
});

describe('conditionNode', () => {
  it('equals routes to true/false', async () => {
    const t = await conditionNode(node({ field: '{{a}}', operator: 'equals', value: 'x' }), { a: 'x' }, deps);
    expect(t.handle).toBe('true');
    const f = await conditionNode(node({ field: '{{a}}', operator: 'equals', value: 'y' }), { a: 'x' }, deps);
    expect(f.handle).toBe('false');
  });

  it('contains', async () => {
    const r = await conditionNode(node({ field: 'hello world', operator: 'contains', value: 'wor' }), {}, deps);
    expect(r.handle).toBe('true');
  });

  it('regex matches', async () => {
    const r = await conditionNode(node({ field: 'abc123', operator: 'regex', value: '\\d+' }), {}, deps);
    expect(r.handle).toBe('true');
  });

  it('invalid regex -> non-retryable FlowRunError', async () => {
    await expect(
      conditionNode(node({ field: 'x', operator: 'regex', value: '([' }), {}, deps),
    ).rejects.toMatchObject({ retryable: false });
    await expect(
      conditionNode(node({ field: 'x', operator: 'regex', value: '([' }), {}, deps),
    ).rejects.toBeInstanceOf(FlowRunError);
  });

  it('jsonpath_exists detects present and absent paths', async () => {
    const json = JSON.stringify({ a: { b: [{ c: 1 }] } });
    const present = await conditionNode(
      node({ field: json, operator: 'jsonpath_exists', value: '$.a.b[0].c' }),
      {},
      deps,
    );
    expect(present.handle).toBe('true');
    const absent = await conditionNode(
      node({ field: json, operator: 'jsonpath_exists', value: '$.a.z' }),
      {},
      deps,
    );
    expect(absent.handle).toBe('false');
  });

  it('jsonpath_exists on non-JSON input is false (not an error)', async () => {
    const r = await conditionNode(
      node({ field: 'not json', operator: 'jsonpath_exists', value: '$.a' }),
      {},
      deps,
    );
    expect(r.handle).toBe('false');
  });
});
