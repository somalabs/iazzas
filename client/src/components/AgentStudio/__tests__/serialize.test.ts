import type { FlowNode } from 'librechat-data-provider';
import { deserializeNodes } from '../serialize';

describe('deserializeNodes', () => {
  it('guarantees a data object when the persisted node has no data (defeito #4)', () => {
    const persisted = [
      { id: 't1', type: 'trigger', position: { x: 0, y: 0 } },
      { id: 'o1', type: 'output', position: { x: 0, y: 200 } },
    ] as unknown as FlowNode[];

    const nodes = deserializeNodes(persisted);

    expect(nodes).toHaveLength(2);
    for (const n of nodes) {
      expect(n.data).toBeDefined();
      expect(typeof n.data).toBe('object');
    }
  });

  it('preserves existing node data', () => {
    const persisted = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { agentId: 'x' } },
    ] as unknown as FlowNode[];

    const [node] = deserializeNodes(persisted);

    expect(node.data).toEqual({ agentId: 'x' });
  });
});
