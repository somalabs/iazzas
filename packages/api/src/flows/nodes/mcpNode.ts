import type { McpNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { FlowRunError } from '../types';
import { interpolate } from '../interpolate';

const MAX_OUTPUT_CHARS = 100_000;

/**
 * MCP node. Calls a single tool on a configured MCP server. Arguments are an
 * optional JSON string carrying `{{...}}` placeholders: interpolation runs
 * BEFORE the parse, so resolved values land inside the JSON document. A blank
 * args field means "no arguments" (empty object).
 *
 * Errors are scrubbed: the args (which may carry interpolated secrets) are never
 * placed in the run output — only a generic message reaches the UI.
 */
export async function mcpNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
): Promise<FlowNodeOutput> {
  const data = node.data as McpNodeData;

  if (!data.serverName) {
    throw new FlowRunError('MCP node: no server selected', {
      retryable: false,
      nodeId: node.id,
    });
  }
  if (!data.toolName) {
    throw new FlowRunError('MCP node: no tool selected', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const raw = interpolate(data.args ?? '', ctx, { nodeId: node.id, logger: deps.logger }).trim();

  let args: Record<string, unknown> = {};
  if (raw.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new FlowRunError('MCP node: arguments must be valid JSON', {
        retryable: false,
        nodeId: node.id,
      });
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new FlowRunError('MCP node: arguments must be a JSON object', {
        retryable: false,
        nodeId: node.id,
      });
    }
    args = parsed as Record<string, unknown>;
  }

  try {
    const { output } = await deps.invokeMcpTool({
      serverName: data.serverName,
      toolName: data.toolName,
      args,
    });
    const text = typeof output === 'string' ? output : JSON.stringify(output);
    const truncated = text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) : text;
    return { output: truncated, handle: 'default' };
  } catch (err) {
    if (err instanceof FlowRunError) {
      throw err;
    }
    if (err instanceof Error) {
      deps.logger.error(`[mcpNode] underlying error (scrubbed in UI): ${err.message}`);
    }
    throw new FlowRunError('MCP tool call failed', { retryable: false, nodeId: node.id });
  }
}
