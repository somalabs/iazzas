/** Delimiter used in MCP-prefixed tool IDs (`prefix::serverName`). */
const MCP_TOOL_DELIMITER = '::';

/**
 * Extracts unique MCP server names from a list of tool IDs.
 *
 * Handles two formats:
 * - Prefixed:  `prefix::serverName` — splits on `'::'` and takes index 1.
 * - Legacy:    bare `serverName` present in `mcpServersMap`.
 */
export function extractMcpServerNames(
  toolIds: string[] | undefined,
  mcpServersMap: Map<string, unknown>,
): string[] {
  const servers = new Set<string>();
  for (const toolId of toolIds ?? []) {
    if (toolId.includes(MCP_TOOL_DELIMITER)) {
      const serverName = toolId.split(MCP_TOOL_DELIMITER)[1];
      if (serverName) {
        servers.add(serverName);
      }
    } else if (mcpServersMap.has(toolId)) {
      servers.add(toolId);
    }
  }
  return Array.from(servers).sort((a, b) => a.localeCompare(b));
}
