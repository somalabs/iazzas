const { logger } = require('@librechat/data-schemas');
const { EModelEndpoint } = require('librechat-data-provider');

/**
 * Agent-invocation seam for the flow runner.
 *
 * Reuses the EXISTING agent runtime (`initializeClient` → `AgentClient`) rather
 * than re-deriving `createRun`. Crucially, the agent's OWN handoff/edge graph is
 * suppressed: `endpointOption` carries a single `agent_id` only, so
 * `initializeClient` builds a standard single-agent run with no edge collector
 * and no sub-agent BFS — flow topology is the sole routing authority.
 *
 * Heavy req/res/streaming coupling lives here (a thin /api wrapper, per
 * CLAUDE.md) so `packages/api/src/flows` stays pure and unit-tested. This is the
 * single integration point validated live by QA (no provider key in CI).
 */
function buildSyntheticRes() {
  const noop = () => res;
  const res = {};
  res.write = noop;
  res.end = noop;
  res.json = noop;
  res.status = () => res;
  res.setHeader = noop;
  res.removeHeader = noop;
  res.flush = noop;
  res.on = noop;
  res.headersSent = false;
  res.locals = {};
  return res;
}

function collectText(parts) {
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
    .map((p) => (typeof p.text === 'string' ? p.text : p.text?.value || ''))
    .join('')
    .trim();
}

/**
 * @param {object} params
 * @param {import('express').Request} params.req  The authenticated flow-run request.
 * @param {string} params.agentId
 * @param {string} params.input
 * @param {string} [params.instructionsOverride]
 * @param {string} [params.modelOverride]
 * @returns {Promise<{ output: string }>}
 */
async function runAgent({ req, agentId, input, instructionsOverride, modelOverride }) {
  const { initializeClient } = require('~/server/services/Endpoints/agents/initialize');

  const endpointOption = {
    endpoint: EModelEndpoint.agents,
    agent_id: agentId,
    /** Single-agent run: no edges => standard (non-handoff) graph. */
    edges: [],
  };
  if (instructionsOverride) {
    endpointOption.instructions = instructionsOverride;
  }
  if (modelOverride) {
    endpointOption.model_parameters = { model: modelOverride };
  }

  const syntheticReq = {
    ...req,
    body: {
      ...(req.body || {}),
      text: input,
      endpoint: EModelEndpoint.agents,
      endpointOption,
    },
  };
  const res = buildSyntheticRes();

  try {
    const { client } = await initializeClient({
      req: syntheticReq,
      res,
      endpointOption,
    });
    const { completion } = await client.sendCompletion(
      [{ role: 'user', content: input }],
      {},
    );
    return { output: collectText(completion) };
  } catch (err) {
    logger.error('[Flows.runAgent] agent invocation failed', err);
    /** Scrubbed: never surface provider/runtime internals into the run output. */
    throw new Error('agent_runtime_error');
  }
}

module.exports = { runAgent };
