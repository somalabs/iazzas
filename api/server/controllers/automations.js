const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');
const { validateSchedule, ScheduleValidationError } = require('@librechat/api');
const repo = require('~/server/services/Automations/repository');
const {
  registerAutomation,
  unregisterAutomation,
} = require('~/server/services/Automations/scheduler');
const { executeRun } = require('~/server/services/Automations/runner');

const PAGE_LIMIT = 20;

function maxActivePerTenant() {
  const raw = Number(process.env.AUTOMATION_MAX_ACTIVE_PER_TENANT);
  return Number.isFinite(raw) && raw > 0 ? raw : 20;
}

function castCursor(raw, res) {
  if (raw == null || raw === '') {
    return { ok: true, value: null };
  }
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    res.status(400).json({ error: 'Invalid cursor' });
    return { ok: false };
  }
  return { ok: true, value: new mongoose.Types.ObjectId(raw) };
}

function page(items, limit) {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  return {
    items: sliced,
    nextCursor: hasMore ? String(sliced[sliced.length - 1]._id) : null,
  };
}

/** @returns {string|null} validation message, or null when valid */
function validateBody(body, { partial }) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }
  const need = (k) => !partial || body[k] !== undefined;
  if (need('name') && (typeof body.name !== 'string' || body.name.trim() === '')) {
    return 'name is required and must be a non-empty string';
  }
  if (typeof body.name === 'string' && body.name.length > 200) {
    return 'name exceeds 200 characters';
  }
  if (need('flowId') && (typeof body.flowId !== 'string' || body.flowId === '')) {
    return 'flowId is required';
  }
  if (need('cron') && (typeof body.cron !== 'string' || body.cron.trim() === '')) {
    return 'cron is required';
  }
  if (body.timezone !== undefined && typeof body.timezone !== 'string') {
    return 'timezone must be a string';
  }
  if (body.triggerInput !== undefined && typeof body.triggerInput !== 'string') {
    return 'triggerInput must be a string';
  }
  return null;
}

function hasApprovalNode(flow) {
  return Array.isArray(flow.nodes) && flow.nodes.some((n) => n && n.type === 'human_approval');
}

function enrich(automation, flow) {
  return { ...automation, flowName: flow ? flow.name : undefined };
}

const listAutomations = async (req, res) => {
  const cur = castCursor(req.query.cursor, res);
  if (!cur.ok) {
    return;
  }
  try {
    const tenantId = req.user.tenantId;
    const rows = await repo.listAutomations({ tenantId, cursor: cur.value, limit: PAGE_LIMIT });
    const { items, nextCursor } = page(rows, PAGE_LIMIT);
    res.json({ automations: items, nextCursor });
  } catch (error) {
    logger.error('[Automations.list]', error);
    res.status(500).json({ error: 'Failed to list automations' });
  }
};

const getAutomation = async (req, res) => {
  try {
    const automation = await repo.getAutomation({
      tenantId: req.user.tenantId,
      id: req.params.id,
    });
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    res.json({ automation });
  } catch (error) {
    logger.error('[Automations.get]', error);
    res.status(500).json({ error: 'Failed to load automation' });
  }
};

const createAutomation = async (req, res) => {
  const invalid = validateBody(req.body, { partial: false });
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }
  const tenantId = req.user.tenantId;
  const timezone = req.body.timezone || 'America/Sao_Paulo';
  const enabled = req.body.enabled !== false;

  let nextRunAt;
  try {
    nextRunAt = validateSchedule(req.body.cron, timezone);
  } catch (e) {
    if (e instanceof ScheduleValidationError) {
      return res.status(400).json({ error: e.code });
    }
    throw e;
  }

  try {
    const flow = await repo.getFlow({ tenantId, id: req.body.flowId });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    if (hasApprovalNode(flow)) {
      return res.status(422).json({ error: 'approvalNodeIncompatible' });
    }
    if (enabled) {
      const active = await repo.countEnabled({ tenantId });
      if (active >= maxActivePerTenant()) {
        return res.status(422).json({ error: 'automationLimitReached' });
      }
    }
    const created = await repo.createAutomation({
      tenantId,
      flowId: flow._id,
      name: req.body.name.trim(),
      cron: req.body.cron.trim(),
      timezone,
      enabled,
      triggerInput: req.body.triggerInput,
      outputTargets: ['conversation', 'notification'],
      createdBy: req.user.id,
      nextRunAt,
    });
    if (enabled) {
      await registerAutomation(created);
    }
    res.status(201).json({ automation: enrich(created.toObject(), flow) });
  } catch (error) {
    logger.error('[Automations.create]', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
};

const updateAutomation = async (req, res) => {
  const invalid = validateBody(req.body, { partial: true });
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }
  const tenantId = req.user.tenantId;
  try {
    const current = await repo.getAutomation({ tenantId, id: req.params.id });
    if (!current) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    const cron = req.body.cron ?? current.cron;
    const timezone = req.body.timezone ?? current.timezone;
    let nextRunAt;
    try {
      nextRunAt = validateSchedule(cron, timezone);
    } catch (e) {
      if (e instanceof ScheduleValidationError) {
        return res.status(400).json({ error: e.code });
      }
      throw e;
    }

    const flowId = req.body.flowId ?? String(current.flowId);
    const flow = await repo.getFlow({ tenantId, id: flowId });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    if (hasApprovalNode(flow)) {
      return res.status(422).json({ error: 'approvalNodeIncompatible' });
    }

    const patch = { cron, timezone, nextRunAt, flowId: flow._id };
    if (req.body.name !== undefined) {
      patch.name = req.body.name.trim();
    }
    if (req.body.triggerInput !== undefined) {
      patch.triggerInput = req.body.triggerInput;
    }
    const updated = await repo.updateAutomation({ tenantId, id: req.params.id, patch });
    if (!updated) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    if (updated.enabled) {
      await registerAutomation(updated);
    }
    res.json({ automation: enrich(updated, flow) });
  } catch (error) {
    logger.error('[Automations.update]', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
};

const deleteAutomation = async (req, res) => {
  try {
    const ok = await repo.deleteAutomation({
      tenantId: req.user.tenantId,
      id: req.params.id,
    });
    if (!ok) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    unregisterAutomation(req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    logger.error('[Automations.delete]', error);
    res.status(500).json({ error: 'Failed to delete automation' });
  }
};

const toggleEnabled = async (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') {
    return res.status(422).json({ error: 'enabled must be a boolean' });
  }
  const tenantId = req.user.tenantId;
  try {
    const current = await repo.getAutomation({ tenantId, id: req.params.id });
    if (!current) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    const enabled = req.body.enabled;
    if (enabled && !current.enabled) {
      const active = await repo.countEnabled({ tenantId });
      if (active >= maxActivePerTenant()) {
        return res.status(422).json({ error: 'automationLimitReached' });
      }
    }
    let nextRunAt = current.nextRunAt;
    if (enabled) {
      try {
        nextRunAt = validateSchedule(current.cron, current.timezone);
      } catch (e) {
        if (e instanceof ScheduleValidationError) {
          return res.status(400).json({ error: e.code });
        }
        throw e;
      }
    }
    const updated = await repo.updateAutomation({
      tenantId,
      id: req.params.id,
      patch: { enabled, nextRunAt },
    });
    if (!updated) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    if (enabled) {
      await registerAutomation(updated);
    } else {
      unregisterAutomation(req.params.id);
    }
    const flow = await repo.getFlow({ tenantId, id: updated.flowId });
    res.json({ automation: enrich(updated, flow) });
  } catch (error) {
    logger.error('[Automations.toggle]', error);
    res.status(500).json({ error: 'Failed to toggle automation' });
  }
};

const runNow = async (req, res) => {
  const tenantId = req.user.tenantId;
  if (req.body?.triggerInput !== undefined && typeof req.body.triggerInput !== 'string') {
    return res.status(422).json({ error: 'triggerInput must be a string' });
  }
  try {
    const automation = await repo.getAutomation({ tenantId, id: req.params.id });
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    if (!automation.enabled) {
      return res.status(422).json({ error: 'automationDisabled' });
    }
    const flow = await repo.getFlow({ tenantId, id: automation.flowId });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    const input =
      typeof req.body?.triggerInput === 'string'
        ? req.body.triggerInput
        : automation.triggerInput || '';
    const result = await executeRun({ tenantId, req, automation, flow, input });
    if (result.skipped) {
      return res.status(409).json({ error: 'concurrentRunActive' });
    }
    res.status(202).json({ runId: result.runId });
  } catch (error) {
    logger.error('[Automations.runNow]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start run' });
    }
  }
};

const listRuns = async (req, res) => {
  const cur = castCursor(req.query.cursor, res);
  if (!cur.ok) {
    return;
  }
  const tenantId = req.user.tenantId;
  try {
    const automation = await repo.getAutomation({ tenantId, id: req.params.id });
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    const rows = await repo.listRuns({
      tenantId,
      automationId: automation._id,
      cursor: cur.value,
      limit: PAGE_LIMIT,
    });
    const { items, nextCursor } = page(rows, PAGE_LIMIT);
    res.json({ runs: items, nextCursor });
  } catch (error) {
    logger.error('[Automations.listRuns]', error);
    res.status(500).json({ error: 'Failed to list runs' });
  }
};

module.exports = {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleEnabled,
  runNow,
  listRuns,
};
