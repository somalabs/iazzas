const {
  logger,
  runAsSystem,
  tenantStorage,
} = require('@librechat/data-schemas');
const { AutomationScheduler, nextRunAt } = require('@librechat/api');
const { Automation } = require('~/db/models');
const { getAppConfig } = require('~/server/services/Config');
const { executeRun } = require('./runner');
const repo = require('./repository');
const db = require('~/models');

const BOOTSTRAP_PAGE = 100;

let scheduler = null;

/** Loads an automation across tenants (system context bypasses isolation). */
const loadAutomationAsSystem = (id) =>
  runAsSystem(() => Automation.findById(id).lean());

/** Builds a minimal authenticated-like req so headless runs reuse the agent seam. */
async function buildSyntheticReq(automation) {
  const user = await runAsSystem(() => db.getUserById(automation.createdBy));
  const appConfig = await getAppConfig({ baseOnly: true });
  const id = String(automation.createdBy);
  return {
    user: {
      ...(user || {}),
      id,
      role: user?.role,
      tenantId: automation.tenantId,
    },
    body: {},
    config: appConfig,
    app: { locals: {} },
  };
}

function buildDeps() {
  return {
    logger: {
      warn: (m) => logger.warn(`[Automations] ${m}`),
      error: (m) => logger.error(`[Automations] ${m}`),
    },
    now: () => new Date(),
    nextRunAt: (cron, timezone, from) => nextRunAt(cron, timezone, from),
    persistNextRun: async (id, next) => {
      await runAsSystem(() =>
        Automation.updateOne({ _id: id }, { $set: { nextRunAt: next ?? null } }),
      );
    },
    onFire: async (id) => {
      const automation = await loadAutomationAsSystem(id);
      if (!automation || !automation.enabled) {
        return;
      }
      const tenantId = automation.tenantId;
      await tenantStorage.run({ tenantId }, async () => {
        const flow = await repo.getFlow({ tenantId, id: automation.flowId });
        if (!flow) {
          logger.warn(
            `[Automations] flow missing for automation ${JSON.stringify({ automationId: id })}`,
          );
          return;
        }
        const req = await buildSyntheticReq(automation);
        const result = await executeRun({
          tenantId,
          req,
          automation,
          flow,
          input: automation.triggerInput || '',
        });
        if (result.skipped) {
          logger.warn(
            `[Automations] concurrent run active, skipped ${JSON.stringify({
              automationId: id,
              flowId: String(automation.flowId),
              reason: 'concurrentRunActive',
            })}`,
          );
        }
      });
    },
    setTimer: (ms, cb) => setTimeout(cb, ms),
    clearTimer: (h) => clearTimeout(h),
  };
}

function getScheduler() {
  if (!scheduler) {
    scheduler = new AutomationScheduler(buildDeps());
  }
  return scheduler;
}

/** Boot bootstrap: cursor-paginated cross-tenant scan of enabled automations. */
async function bootstrapScheduler() {
  const s = getScheduler();
  async function* pages() {
    let cursor = null;
    for (;;) {
      const batch = await runAsSystem(() =>
        repo.listEnabledPage({ cursor, limit: BOOTSTRAP_PAGE }),
      );
      if (!batch.length) {
        return;
      }
      yield batch.map((a) => ({
        id: String(a._id),
        cron: a.cron,
        timezone: a.timezone,
      }));
      if (batch.length < BOOTSTRAP_PAGE) {
        return;
      }
      cursor = batch[batch.length - 1]._id;
    }
  }
  await s.bootstrap(pages());
  logger.info(`[Automations] scheduler bootstrapped (${s.size()} active)`);
}

/** (Re)register a single automation after a create/update/toggle-on. */
function registerAutomation(automation) {
  return getScheduler().register({
    id: String(automation._id),
    cron: automation.cron,
    timezone: automation.timezone,
  });
}

/** Cancel scheduling for a deleted / disabled automation. */
function unregisterAutomation(id) {
  getScheduler().unregister(String(id));
}

module.exports = {
  bootstrapScheduler,
  registerAutomation,
  unregisterAutomation,
  getScheduler,
};
