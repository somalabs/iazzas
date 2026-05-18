import type { FlowNode, FlowRunnerDeps } from '../types';
import { agentNode } from './agentNode';
import { FlowRunError } from '../types';

const node = (data: object): FlowNode => ({
  id: 'a1',
  type: 'agent',
  position: { x: 0, y: 0 },
  data: { type: 'agent', ...data } as FlowNode['data'],
});

const mkDeps = (over: Partial<FlowRunnerDeps>): FlowRunnerDeps =>
  ({
    logger: { warn: () => {}, error: () => {} },
    now: () => new Date(0),
    checkAgentAccess: async () => true,
    invokeAgent: async () => ({ output: 'agent-said' }),
    ...over,
  }) as unknown as FlowRunnerDeps;

describe('agentNode', () => {
  it('runs the agent with incoming as input and interpolated instructions', async () => {
    const invokeAgent = jest.fn().mockResolvedValue({ output: 'done' });
    const deps = mkDeps({ invokeAgent });
    const out = await agentNode(
      node({ agentId: 'ag1', instructionsOverride: 'use {{x}}' }),
      { x: 'ctx-val' },
      deps,
      'the-input',
    );
    expect(out).toEqual({ output: 'done', handle: 'default' });
    expect(invokeAgent).toHaveBeenCalledWith({
      agentId: 'ag1',
      input: 'the-input',
      instructionsOverride: 'use ctx-val',
      modelOverride: undefined,
    });
  });

  it('missing agentId -> non-retryable error, agent not invoked', async () => {
    const invokeAgent = jest.fn();
    const deps = mkDeps({ invokeAgent });
    await expect(agentNode(node({}), {}, deps, 'i')).rejects.toMatchObject({ retryable: false });
    expect(invokeAgent).not.toHaveBeenCalled();
  });

  it('denied access -> non-retryable error, agent not invoked', async () => {
    const invokeAgent = jest.fn();
    const deps = mkDeps({ checkAgentAccess: async () => false, invokeAgent });
    await expect(
      agentNode(node({ agentId: 'ag1' }), {}, deps, 'i'),
    ).rejects.toBeInstanceOf(FlowRunError);
    expect(invokeAgent).not.toHaveBeenCalled();
  });

  it('wraps runtime failures as a scrubbed FlowRunError', async () => {
    const deps = mkDeps({
      invokeAgent: async () => {
        throw new Error('boom with secret token=xyz');
      },
    });
    try {
      await agentNode(node({ agentId: 'ag1' }), {}, deps, 'i');
      throw new Error('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowRunError);
      expect((err as Error).message).not.toContain('xyz');
    }
  });
});
