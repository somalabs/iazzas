import React from 'react';

// Import the pure extraction helper that AgentPanel uses internally.
import { extractMcpServerNames } from '~/utils/mcpTools';

describe('extractMcpServerNames', () => {
  const mcpServersMap = new Map([
    ['server-a', {}],
    ['server-b', {}],
  ]);

  it('extracts server names from MCP-prefixed tool IDs', () => {
    const tools = ['mcp::server-a', 'mcp::server-b', 'regular-tool'];
    expect(extractMcpServerNames(tools, mcpServersMap)).toEqual(['server-a', 'server-b']);
  });

  it('extracts legacy server names (bare server name in map)', () => {
    const tools = ['server-a', 'not-a-server'];
    expect(extractMcpServerNames(tools, mcpServersMap)).toEqual(['server-a']);
  });

  it('returns empty array when tools is undefined', () => {
    expect(extractMcpServerNames(undefined, mcpServersMap)).toEqual([]);
  });
});
