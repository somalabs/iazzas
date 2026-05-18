const { logger } = require('@librechat/data-schemas');
const { FlowRunner, validateGraph } = require('@librechat/api');
const { ResourceType, PermissionBits } = require('librechat-data-provider');
const { getResourcePermissionsMap } = require('~/server/services/PermissionService');
const { runAgent } = require('~/server/services/Flows/runAgent');
const { applyOutputTargets } = require('./outputs');
const repo = require('./repository');
const db = require('~/models');

function makeAgentAccessChecker(req) {
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
      warn: (m) => logger.warn(`[Automations] ${m}`),
      error: (m) => logger.error(`[Automations] ${m}`),
    },
    now: () => new Date(),
    checkAgentAccess: makeAgentAccessChecker(req),
    invokeAgent: ({ agentId, input, instructionsOverride, modelOverride }) =>
      runAgent({ req, agentId, input, instructionsOverride, modelOverride }),
    httpFetch: async (url, init) => {
      const r = await fetch(url, init);
      return { status: r.status, text: () => r.text() };
    },
  };
}

function makeSink(tenantId, runId) {
  return {
    persist: (state) =>
      repo
        .saveRunState({
          tenantId,
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

function extractResult(run) {
  const nodeRuns = Array.isArray(run?.nodeRuns) ? run.nodeRuns : [];
  if (run?.status === 'failed') {
    const failed = nodeRuns.find((n) => n.status === 'failed' && n.error);
    return { output: '', errorReason: failed?.error || 'agent_runtime_error' };
  }
  const out = [...nodeRuns].reverse().find((n) => n.nodeType === 'output' && n.output != null);
  const last = [...nodeRuns].reverse().find((n) => n.output != null);
  return { output: (out || last)?.output || '', errorReason: undefined };
}

/**
 * Executes one automation run end-to-end. Atomic concurrency claim → graph
 * validation → FlowRunner → persistence → output targets → automation
 * bookkeeping. Never throws; concurrency skip returns `{ skipped: true }`.
 */
async function executeRun({ tenantId, req, automation, flow, input }) {
  const snapshot = { name: flow.name, nodes: flow.nodes, edges: flow.edges };
  const flowVersion = new Date(flow.updatedAt || flow.createdAt || Date.now()).getTime();

  const claim = await repo.claimRun({
    flowId: flow._id,
    automationId: automation._id,
    input,
    flowSnapshot: snapshot,
    flowVersion,
  });
  if (claim.skipped) {
    return { skipped: true };
  }
  const run = claim.run;
  const runId = String(run._id);

  const deps = buildDeps(req);
  let finalStatus = 'failed';
  try {
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
      await repo.saveRunState({
        tenantId,
        runId,
        status: 'failed',
        nodeRuns: [],
        context: {},
        completedAt: new Date(),
      });
    } else {
      const runner = new FlowRunner(snapshot, deps, makeSink(tenantId, runId));
      await runner.run(input);
    }
  } catch (error) {
    logger.error('[Automations.executeRun] runner crashed', error);
  }

  const finalRun = await repo.getRun({ tenantId, runId });
  finalStatus = finalRun?.status || 'failed';
  const reportable = finalStatus === 'success' || finalStatus === 'failed';

  await repo.updateAutomation({
    tenantId,
    id: automation._id,
    patch: { lastRunAt: new Date(), lastStatus: finalStatus },
  });

  if (reportable) {
    const { output, errorReason } = extractResult(finalRun);
    await applyOutputTargets({
      userId: automation.createdBy,
      automationId: String(automation._id),
      runId,
      flowName: flow.name,
      timezone: automation.timezone,
      status: finalStatus === 'success' ? 'success' : 'failed',
      output,
      errorReason,
    });
  }

  return { runId, status: finalStatus };
}

module.exports = { executeRun };
