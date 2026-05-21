const { Automation, AgentFlow, AgentFlowRun } = require('~/db/models');

/**
 * Data access for Automations.
 *
 * Multi-tenant: the `applyTenantIsolation` plugin injects `tenantId` from the
 * async tenant context into every query (controller requests run inside
 * requireJwtAuth's context; the scheduler wraps each run in
 * `tenantStorage.run({ tenantId })`). `tenantId` is also passed explicitly so
 * the contract is readable at the call site.
 *
 * Owner isolation: in the iazzas single-instance deployment users have no
 * `tenantId` (SSO tenants are optional), so tenant scoping alone collapses to
 * "everyone shares one bucket" — every user would see and mutate every other
 * user's automations. `createdBy` (the owner's user id) is therefore filtered
 * in every owner-facing query as defense-in-depth: list, read, update and
 * delete stay private to their creator regardless of tenant. Added to the
 * query only when present so an absent owner never widens into a null scan.
 */

const ownerScope = (createdBy) => (createdBy ? { createdBy } : {});

const listAutomations = ({ tenantId, createdBy, cursor, limit }) => {
  const query = { tenantId, ...ownerScope(createdBy) };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  return Automation.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();
};

const getAutomation = ({ tenantId, createdBy, id }) =>
  Automation.findOne({ _id: id, tenantId, ...ownerScope(createdBy) }).lean();

const createAutomation = (data) => Automation.create(data);

const updateAutomation = ({ tenantId, createdBy, id, patch }) =>
  Automation.findOneAndUpdate(
    { _id: id, tenantId, ...ownerScope(createdBy) },
    { $set: patch },
    { new: true },
  ).lean();

const deleteAutomation = async ({ tenantId, createdBy, id }) => {
  const res = await Automation.deleteOne({ _id: id, tenantId, ...ownerScope(createdBy) });
  return res.deletedCount > 0;
};

const countEnabled = ({ tenantId, createdBy }) =>
  Automation.countDocuments({ tenantId, ...ownerScope(createdBy), enabled: true });

const getFlow = ({ tenantId, id }) => AgentFlow.findOne({ _id: id, tenantId }).lean();

/**
 * Atomically claims a run for `flowId`. Returns `{ skipped: true }` when an
 * active (`running`|`paused`) run already exists for the flow.
 *
 * Two layers guarantee atomicity without a read-then-check window:
 * 1. The upsert filter is the partial-index predicate, so a matching active
 *    run short-circuits to `updatedExisting`.
 * 2. The partial index is `unique`, so when two dispatches race past (1) only
 *    one insert wins; the loser throws E11000, caught here as a skip.
 */
const claimRun = async ({ flowId, automationId, input, flowSnapshot, flowVersion }) => {
  let res;
  try {
    res = await AgentFlowRun.findOneAndUpdate(
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
  } catch (error) {
    if (error && error.code === 11000) {
      return { skipped: true };
    }
    throw error;
  }
  if (res.lastErrorObject && res.lastErrorObject.updatedExisting) {
    return { skipped: true };
  }
  return { run: res.value };
};

const getRun = ({ tenantId, runId }) => AgentFlowRun.findOne({ _id: runId, tenantId }).lean();

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
  return Automation.find(query).sort({ _id: 1 }).limit(limit).lean();
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
