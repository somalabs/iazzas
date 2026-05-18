const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');
const { FlowRunner, validateGraph } = require('@librechat/api');
const { ResourceType, PermissionBits } = require('librechat-data-provider');
const { getResourcePermissionsMap } = require('~/server/services/PermissionService');
const repo = require('~/server/services/Flows/repository');
const { runAgent } = require('~/server/services/Flows/runAgent');
const db = require('~/models');

const NODE_TYPES = new Set([
  'trigger',
  'agent',
  'condition',
  'http',
  'human_approval',
  'output',
]);
const PAGE_LIMIT = 20;

/** Structural errors that must block persistence (mirrors client hasBlockingErrors). */
const SAVE_BLOCKING_CODES = new Set([
  'no_trigger',
  'no_output',
  'multiple_triggers',
  'cycle',
  'path_without_output',
]);

/** @returns {Array|null} blocking graph errors, or null when the graph may be saved */
function validateGraphForSave(nodes, edges) {
  const errors = validateGraph(nodes, edges).filter((e) => SAVE_BLOCKING_CODES.has(e.code));
  return errors.length > 0 ? errors : null;
}

/** @returns {string|null} validation message, or null when valid */
function validateFlowBody(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return 'name is required and must be a non-empty string';
  }
  if (body.name.length > 200) {
    return 'name exceeds 200 characters';
  }
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return 'nodes and edges must be arrays';
  }
  for (const n of body.nodes) {
    if (!n || typeof n.id !== 'string' || !NODE_TYPES.has(n.type)) {
      return 'each node requires a string id and a valid type';
    }
  }
  for (const e of body.edges) {
    if (!e || typeof e.source !== 'string' || typeof e.target !== 'string') {
      return 'each edge requires string source and target';
    }
  }
  return null;
}

/**
 * Guarantees every persisted node carries a `data` object. The client renders
 * `node.data.label` and friends without a null-guard fallback for the missing
 * key; an absent `data` (e.g. a programmatic client posting `data:{}`, which
 * Mongoose used to drop) crashes the whole canvas on reload.
 * @returns {Array} nodes with a guaranteed `data` object
 */
function normalizeNodes(nodes) {
  return nodes.map((n) =>
    n && typeof n.data === 'object' && n.data !== null ? n : { ...n, data: {} },
  );
}

function castCursor(raw, res) {
  if (raw == null || raw === '') {
    return { ok: true, value: null };
  }
  try {
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      throw new Error('invalid');
    }
    return { ok: true, value: new mongoose.Types.ObjectId(raw) };
  } catch {
    res.status(400).json({ error: 'Invalid cursor' });
    return { ok: false };
  }
}

function page(items, limit) {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  return {
    items: sliced,
    nextCursor: hasMore ? String(sliced[sliced.length - 1]._id) : null,
  };
}

/** Single-agent VIEW check, mirroring validateEdgeAgentAccess (agents/v1.js). */
async function makeAgentAccessChecker(req) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const cache = new Map();
  return async (agentId) => {
    if (cache.has(agentId)) {
      return cache.get(agentId);
    }
    const agents = await db.getAgents({ id: agentId });
    if (!agents || agents.length === 0) {
      cache.set(agentId, false);
      return false;
    }
    const permissionsMap = await getResourcePermissionsMap({
      userId,
      role: userRole,
      resourceType: ResourceType.AGENT,
      resourceIds: agents.map((a) => a._id),
    });
    const bits = permissionsMap.get(agents[0]._id.toString()) ?? 0;
    const allowed = (bits & PermissionBits.VIEW) !== 0;
    cache.set(agentId, allowed);
    return allowed;
  };
}

function buildDeps(req) {
  return {
    logger: {
      warn: (m) => logger.warn(`[Flows] ${m}`),
      error: (m) => logger.error(`[Flows] ${m}`),
    },
    now: () => new Date(),
    checkAgentAccess: undefined,
    invokeAgent: ({ agentId, input, instructionsOverride, modelOverride }) =>
      runAgent({ req, agentId, input, instructionsOverride, modelOverride }),
    httpFetch: async (url, init) => {
      const r = await fetch(url, init);
      return { status: r.status, text: () => r.text() };
    },
  };
}

const listFlows = async (req, res) => {
  const cur = castCursor(req.query.cursor, res);
  if (!cur.ok) {
    return;
  }
  try {
    const rows = await repo.listFlows({
      tenantId: req.user.tenantId,
      cursor: cur.value,
      limit: PAGE_LIMIT,
    });
    const { items, nextCursor } = page(rows, PAGE_LIMIT);
    res.json({ flows: items, nextCursor });
  } catch (error) {
    logger.error('[Flows.listFlows]', error);
    res.status(500).json({ error: 'Failed to list flows' });
  }
};

const getFlow = async (req, res) => {
  try {
    const flow = await repo.getFlow({ tenantId: req.user.tenantId, id: req.params.id });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ flow });
  } catch (error) {
    logger.error('[Flows.getFlow]', error);
    res.status(500).json({ error: 'Failed to load flow' });
  }
};

const createFlow = async (req, res) => {
  const invalid = validateFlowBody(req.body);
  if (invalid) {
    return res.status(422).json({ error: invalid });
  }
  const graphErrors = validateGraphForSave(req.body.nodes, req.body.edges);
  if (graphErrors) {
    return res.status(422).json({ error: 'Invalid flow graph', details: graphErrors });
  }
  try {
    const flow = await repo.createFlow({
      tenantId: req.user.tenantId,
      name: req.body.name.trim(),
      nodes: normalizeNodes(req.body.nodes),
      edges: req.body.edges,
    });
    res.status(201).json({ flow });
  } catch (error) {
    logger.error('[Flows.createFlow]', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
};

const updateFlow = async (req, res) => {
  const invalid = validateFlowBody(req.body);
  if (invalid) {
    return res.status(422).json({ error: invalid });
  }
  const graphErrors = validateGraphForSave(req.body.nodes, req.body.edges);
  if (graphErrors) {
    return res.status(422).json({ error: 'Invalid flow graph', details: graphErrors });
  }
  try {
    const flow = await repo.updateFlow({
      tenantId: req.user.tenantId,
      id: req.params.id,
      name: req.body.name.trim(),
      nodes: normalizeNodes(req.body.nodes),
      edges: req.body.edges,
    });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ flow });
  } catch (error) {
    logger.error('[Flows.updateFlow]', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
};

const deleteFlow = async (req, res) => {
  try {
    const ok = await repo.deleteFlow({ tenantId: req.user.tenantId, id: req.params.id });
    if (!ok) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ deleted: true });
  } catch (error) {
    logger.error('[Flows.deleteFlow]', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
};

function makeSink(req, runId) {
  return {
    persist: (state) =>
      repo
        .saveRunState({
          tenantId: req.user.tenantId,
          runId,
          status: state.status,
          nodeRuns: state.nodeRuns,
          context: state.context,
          pausedNodeId: state.pausedNodeId,
          completedAt: state.completedAt,
        })
        .then(() => undefined),
  };
}

const runFlow = async (req, res) => {
  const input = typeof req.body?.input === 'string' ? req.body.input : '';
  if (req.body && req.body.input != null && typeof req.body.input !== 'string') {
    return res.status(422).json({ error: 'input must be a string' });
  }
  try {
    const flow = await repo.getFlow({ tenantId: req.user.tenantId, id: req.params.id });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const deps = buildDeps(req);
    deps.checkAgentAccess = await makeAgentAccessChecker(req);

    const accessible = new Set();
    for (const n of flow.nodes) {
      if (n.type === 'agent' && n.data && n.data.agentId) {
        if (await deps.checkAgentAccess(n.data.agentId)) {
          accessible.add(n.data.agentId);
        }
      }
    }
    const graphErrors = validateGraph(flow.nodes, flow.edges, accessible);
    if (graphErrors.length > 0) {
      return res.status(422).json({ error: 'Invalid flow graph', details: graphErrors });
    }

    const snapshot = { name: flow.name, nodes: flow.nodes, edges: flow.edges };
    const flowVersion = new Date(flow.updatedAt || flow.createdAt || Date.now()).getTime();
    const run = await repo.createRun({
      tenantId: req.user.tenantId,
      flowId: flow._id,
      input,
      flowSnapshot: snapshot,
      flowVersion,
    });

    res.status(202).json({ runId: String(run._id), status: 'running' });

    const runner = new FlowRunner(snapshot, deps, makeSink(req, run._id));
    runner.run(input).catch((error) => {
      logger.error('[Flows.runFlow] runner crashed', error);
    });
  } catch (error) {
    logger.error('[Flows.runFlow]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start run' });
    }
  }
};

const resumeRun = async (req, res) => {
  if (typeof req.body?.approved !== 'boolean') {
    return res.status(422).json({ error: 'approved must be a boolean' });
  }
  try {
    const run = await repo.getRun({ tenantId: req.user.tenantId, runId: req.params.runId });
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    if (run.status !== 'paused') {
      return res.status(409).json({ error: 'Run is not awaiting approval' });
    }

    const deps = buildDeps(req);
    deps.checkAgentAccess = await makeAgentAccessChecker(req);

    res.json({ runId: String(run._id), status: 'running' });

    const runner = new FlowRunner(
      run.flowSnapshot,
      deps,
      makeSink(req, run._id),
      run.nodeRuns,
    );
    runner
      .resume({
        context: run.context || {},
        pausedNodeId: run.pausedNodeId,
        approved: req.body.approved,
      })
      .catch((error) => {
        logger.error('[Flows.resumeRun] runner crashed', error);
      });
  } catch (error) {
    logger.error('[Flows.resumeRun]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to resume run' });
    }
  }
};

const listRuns = async (req, res) => {
  const cur = castCursor(req.query.cursor, res);
  if (!cur.ok) {
    return;
  }
  try {
    const flow = await repo.getFlow({ tenantId: req.user.tenantId, id: req.params.id });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    const rows = await repo.listRuns({
      tenantId: req.user.tenantId,
      flowId: flow._id,
      cursor: cur.value,
      limit: PAGE_LIMIT,
    });
    const { items, nextCursor } = page(rows, PAGE_LIMIT);
    res.json({ runs: items, nextCursor });
  } catch (error) {
    logger.error('[Flows.listRuns]', error);
    res.status(500).json({ error: 'Failed to list runs' });
  }
};

module.exports = {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  runFlow,
  resumeRun,
  listRuns,
};
