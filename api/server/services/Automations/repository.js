const { Automation, AgentFlow, AgentFlowRun } = require('~/db/models');

/**
 * Data access for Automations.
 *
 * Multi-tenant: the `applyTenantIsolation` plugin injects `tenantId` from the
 * async tenant context into every query (controller requests run inside
 * requireJwtAuth's context; the scheduler wraps each run in
 * `tenantStorage.run({ tenantId })`). `tenantId` is also passed explicitly so
 * the contract is readable at the call site.
 */

const listAutomations = ({ tenantId, cursor, limit }) => {
  const query = { tenantId };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  return Automation.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
};

const getAutomation = ({ tenantId, id }) =>
  Automation.findOne({ _id: id, tenantId }).lean();

const createAutomation = (data) => Automation.create(data);

const updateAutomation = ({ tenantId, id, patch }) =>
  Automation.findOneAndUpdate({ _id: id, tenantId }, { $set: patch }, { new: true }).lean();

const deleteAutomation = async ({ tenantId, id }) => {
  const res = await Automation.deleteOne({ _id: id, tenantId });
  return res.deletedCount > 0;
};

const countEnabled = ({ tenantId }) =>
  Automation.countDocuments({ tenantId, enabled: true });

const getFlow = ({ tenantId, id }) =>
  AgentFlow.findOne({ _id: id, tenantId }).lean();

/**
 * Atomically claims a run for `flowId`. Returns `{ skipped: true }` when an
 * active (`running`|`paused`) run already exists for the flow — the upsert
 * filter is exactly the partial-index predicate from Épico 1, so two
 * concurrent dispatches resolve to one inserted run and one skip without a
 * read-then-check window.
 */
const claimRun = async ({ flowId, automationId, input, flowSnapshot, flowVersion }) => {
  const res = await AgentFlowRun.findOneAndUpdate(
    { flowId, status: { $in: ['running', 'paused'] } },
    {
      $setOnInsert: {
        flowId,
        automationId,
        input,
        status: 'running',
        nodeRuns: [],
        context: {},
        flowSnapshot,
        flowVersion,
        startedAt: new Date(),
      },
    },
    { upsert: true, new: true, includeResultMetadata: true, setDefaultsOnInsert: true },
  );
  if (res.lastErrorObject && res.lastErrorObject.updatedExisting) {
    return { skipped: true };
  }
  return { run: res.value };
};

const getRun = ({ tenantId, runId }) =>
  AgentFlowRun.findOne({ _id: runId, tenantId }).lean();

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

const listRuns = ({ tenantId, automationId, cursor, limit }) => {
  const query = { tenantId, automationId };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  return AgentFlowRun.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
};

/** Cross-tenant scan for boot bootstrap (caller must run as system). */
const listEnabledPage = ({ cursor, limit }) => {
  const query = { enabled: true };
  if (cursor) {
    query._id = { $gt: cursor };
  }
  return Automation.find(query)
    .sort({ _id: 1 })
    .limit(limit)
    .lean();
};

module.exports = {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  countEnabled,
  getFlow,
  claimRun,
  getRun,
  saveRunState,
  listRuns,
  listEnabledPage,
};
