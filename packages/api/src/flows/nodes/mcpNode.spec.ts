import type { FlowNode, FlowRunnerDeps } from '../types';
import { mcpNode } from './mcpNode';
import { FlowRunError } from '../types';

const node = (data: object): FlowNode => ({
  id: 'm1',
  type: 'mcp',
  position: { x: 0, y: 0 },
  data: {
    type: 'mcp',
    serverName: 'azzas_vendas_linx',
    toolName: 'consultar',
    ...data,
  } as unknown as FlowNode['data'],
});

const baseLogger = { warn: () => {}, error: () => {} };

const makeDeps = (invokeMcpTool: jest.Mock): FlowRunnerDeps =>
  ({ logger: baseLogger, now: () => new Date(0), invokeMcpTool }) as unknown as FlowRunnerDeps;

describe('mcpNode', () => {
  it('calls the tool with parsed + interpolated JSON args and returns text', async () => {
    const invokeMcpTool = jest.fn().mockResolvedValue({ output: 'TOOL-RESULT' });
    const out = await mcpNode(
      node({ args: '{"periodo": "{{trigger.input}}"}' }),
      { 'trigger.input': '2026-06' },
      makeDeps(invokeMcpTool),
    );
    expect(out).toEqual({ output: 'TOOL-RESULT', handle: 'default' });
    expect(invokeMcpTool).toHaveBeenCalledTimes(1);
    expect(invokeMcpTool.mock.calls[0][0]).toEqual({
      serverName: 'azzas_vendas_linx',
      toolName: 'consultar',
      args: { periodo: '2026-06' },
    });
  });

  it('treats blank args as an empty object', async () => {
    const invokeMcpTool = jest.fn().mockResolvedValue({ output: 'ok' });
    await mcpNode(node({ args: '' }), {}, makeDeps(invokeMcpTool));
    expect(invokeMcpTool.mock.calls[0][0].args).toEqual({});
  });

  it('rejects when no server is selected', async () => {
    const deps = makeDeps(jest.fn());
    await expect(mcpNode(node({ serverName: '' }), {}, deps)).rejects.toBeInstanceOf(FlowRunError);
    expect(deps.invokeMcpTool).not.toHaveBeenCalled();
  });

  it('rejects when no tool is selected', async () => {
    const deps = makeDeps(jest.fn());
    await expect(mcpNode(node({ toolName: '' }), {}, deps)).rejects.toBeInstanceOf(FlowRunError);
    expect(deps.invokeMcpTool).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON args without calling the tool', async () => {
    const deps = makeDeps(jest.fn());
    await expect(mcpNode(node({ args: '{not json' }), {}, deps)).rejects.toBeInstanceOf(
      FlowRunError,
    );
    expect(deps.invokeMcpTool).not.toHaveBeenCalled();
  });

  it('rejects non-object JSON args (array/scalar)', async () => {
    const deps = makeDeps(jest.fn());
    await expect(mcpNode(node({ args: '[1,2,3]' }), {}, deps)).rejects.toBeInstanceOf(FlowRunError);
    await expect(mcpNode(node({ args: '"hi"' }), {}, deps)).rejects.toBeInstanceOf(FlowRunError);
  });

  it('serializes a non-string tool output to JSON', async () => {
    const invokeMcpTool = jest.fn().mockResolvedValue({ output: { rows: 3 } });
    const out = await mcpNode(node({ args: '' }), {}, makeDeps(invokeMcpTool));
    expect(out.output).toBe('{"rows":3}');
  });

  it('wraps underlying errors in a scrubbed FlowRunError', async () => {
    const invokeMcpTool = jest.fn().mockRejectedValue(new Error('secret-internal-trace'));
    try {
      await mcpNode(node({ args: '{"a":"{{x}}"}' }), { x: 'b' }, makeDeps(invokeMcpTool));
      throw new Error('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowRunError);
      expect((err as Error).message).not.toContain('secret-internal-trace');
      expect((err as FlowRunError).retryable).toBe(false);
    }
  });
});
