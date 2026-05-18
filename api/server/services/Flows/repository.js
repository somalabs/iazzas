const { AgentFlow, AgentFlowRun } = require('~/db/models');

/**
 * Data access for Agent Studio flows.
 *
 * Multi-tenant: the `applyTenantIsolation` Mongoose plugin injects
 * `tenantId` (from the async tenant context set by requireJwtAuth) into every
 * query, so a flow/run from another tenant is simply invisible — `findById`
 * returns null and the controller answers 404 (never reveal existence).
 * `tenantId` is also passed explicitly so the contract is readable at the
 * call site (explicit signature over implicit closure).
 */

const listFlows = ({ tenantId, cursor, limit }) => {
  const query = { tenantId };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  return AgentFlow.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
};

const getFlow = ({ tenantId, id }) => AgentFlow.findOne({ _id: id, tenantId }).lean();

const createFlow = ({ tenantId, name, nodes, edges }) =>
  AgentFlow.create({ tenantId, name, nodes, edges });

const updateFlow = ({ tenantId, id, name, nodes, edges }) =>
  AgentFlow.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { name, nodes, edges } },
    { new: true },
  ).lean();

const deleteFlow = async ({ tenantId, id }) => {
  const res = await AgentFlow.deleteOne({ _id: id, tenantId });
  return res.deletedCount > 0;
};

const createRun = ({ tenantId, flowId, input, flowSnapshot, flowVersion }) =>
  AgentFlowRun.create({
    tenantId,
    flowId,
    input,
    status: 'running',
    nodeRuns: [],
    context: {},
    flowSnapshot,
    flowVersion,
    startedAt: new Date(),
  });

const getRun = ({ tenantId, runId }) =>
  AgentFlowRun.findOne({ _id: runId, tenantId });

const saveRunState = ({ tenantId, runId, status, nodeRuns, context, pausedNodeId, completedAt }) =>
  AgentFlowRun.findOneAndUpdate(
    { _id: runId, tenantId },
    {
      $set: {
        status,
        nodeRuns,
        context,
        pausedNodeId: pausedNodeId ?? null,
        ...(completedAt ? { completedAt } : {}),
      },
    },
    { new: true },
  ).lean();

const listRuns = ({ tenantId, flowId, cursor, limit }) => {
  const query = { tenantId, flowId };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  return AgentFlowRun.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
};

module.exports = {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  createRun,
  getRun,
  saveRunState,
  listRuns,
};
