const { logger } = require('@librechat/data-schemas');
const { CacheKeys, Constants } = require('librechat-data-provider');
const { getMCPManager, getMCPServersRegistry, getFlowStateManager } = require('~/config');
const { findToken, createToken, updateToken, deleteTokens } = require('~/models');
const { getLogStores } = require('~/cache');

/**
 * MCP-tool invocation seam for the flow runner (thin /api wrapper, per CLAUDE.md,
 * so `packages/api/src/flows` stays pure). Calls a single tool on a configured
 * MCP server via the existing `MCPManager.callTool` path and returns its text.
 *
 * `provider` is intentionally left undefined so `formatToolContent` takes the
 * `parseAsString` branch and returns `[text, artifact]` — we keep the text.
 *
 * Already-connected servers (config-sourced internal MCPs, or OAuth servers the
 * user has authenticated) work transparently via `tokenMethods`. A server that
 * still requires interactive OAuth will surface a scrubbed error — flow runs have
 * no UI to drive an auth handshake.
 *
 * @param {object} params
 * @param {import('express').Request} params.req
 * @param {string} params.serverName
 * @param {string} params.toolName
 * @param {Record<string, unknown>} params.args
 * @returns {Promise<{ output: string }>}
 */
async function runMcpTool({ req, serverName, toolName, args }) {
  const userId = req.user.id;
  const registry = getMCPServersRegistry();
  const serverConfig = await registry.getServerConfig(serverName, userId);
  if (!serverConfig) {
    logger.error(`[Flows.runMcpTool] No config for MCP server '${serverName}'`);
    throw new Error('mcp_server_not_found');
  }

  const flowManager = getFlowStateManager(getLogStores(CacheKeys.FLOWS));
  const mcpManager = getMCPManager(userId);
  const tokenMethods = { findToken, createToken, updateToken, deleteTokens };
  const customUserVars = req.body?.userMCPAuthMap?.[`${Constants.mcp_prefix}${serverName}`];

  const result = await mcpManager.callTool({
    serverName,
    serverConfig,
    toolName,
    toolArguments: args,
    user: req.user,
    flowManager,
    tokenMethods,
    customUserVars,
  });

  const text = Array.isArray(result) ? result[0] : result;
  return { output: typeof text === 'string' ? text : JSON.stringify(text) };
}

module.exports = { runMcpTool };
