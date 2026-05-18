import type { FlowRun } from 'librechat-data-provider';
import { toAutomationRun } from '../runMapper';

const base: FlowRun = {
  _id: 'r1',
  flowId: 'f1',
  tenantId: 't1',
  status: 'success',
  input: 'hello',
  nodeRuns: [
    { nodeId: 'n1', nodeType: 'agent', status: 'completed', output: 'first' },
    { nodeId: 'n2', nodeType: 'output', status: 'completed', output: 'final answer' },
  ],
  startedAt: '2026-05-18T12:00:00.000Z',
  completedAt: '2026-05-18T12:00:05.000Z',
  flowSnapshot: { _id: 'f1', tenantId: 't1', name: 'F', nodes: [], edges: [], createdAt: '', updatedAt: '' },
};

describe('toAutomationRun', () => {
  it('maps a successful run, using the last node with output', () => {
    const r = toAutomationRun(base, 'a1');
    expect(r).toEqual({
      _id: 'r1',
      automationId: 'a1',
      status: 'success',
      startedAt: '2026-05-18T12:00:00.000Z',
      completedAt: '2026-05-18T12:00:05.000Z',
      input: 'hello',
      output: 'final answer',
    });
  });

  it('collapses paused to running (the drawer has no paused state)', () => {
    const r = toAutomationRun({ ...base, status: 'paused' }, 'a1');
    expect(r.status).toBe('running');
  });

  it('handles a run with no node output', () => {
    const r = toAutomationRun({ ...base, status: 'failed', nodeRuns: [] }, 'a1');
    expect(r.status).toBe('failed');
    expect(r.output).toBeUndefined();
  });
});
