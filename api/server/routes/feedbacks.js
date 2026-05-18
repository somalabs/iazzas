const express = require('express');
const { logger, SystemCapabilities } = require('@librechat/data-schemas');
const { requireJwtAuth } = require('~/server/middleware');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const ALLOWED_CATEGORIES = new Set([
  'dados_internos',
  'tempo_real',
  'analise_arquivo',
  'info_pessoal',
  'integracao_externa',
  'fora_escopo',
  'limitacao_tecnica',
  'outros',
]);

const ALLOWED_TRIGGERS = new Set(['model_self_report', 'user_thumbs_down']);

const truncate = (value, max = 8000) => {
  if (typeof value !== 'string') return undefined;
  return value.length > max ? value.slice(0, max) : value;
};

router.post('/', requireJwtAuth, async (req, res) => {
  try {
    const body = req.body || {};

    if (!ALLOWED_TRIGGERS.has(body.trigger)) {
      return res.status(400).json({ message: 'Invalid trigger' });
    }
    if (body.category && !ALLOWED_CATEGORIES.has(body.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const entry = await db.createFeedback({
      conversationId: body.conversationId,
      messageId: body.messageId,
      userMessage: truncate(body.userMessage),
      assistantMessage: truncate(body.assistantMessage),
      trigger: body.trigger,
      category: body.category,
      reason: truncate(body.reason, 2000),
      modelName: body.modelName,
    });

    res.status(201).json(entry);
  } catch (error) {
    logger.error('[POST /api/feedbacks] Error creating feedback', error);
    res.status(500).json({ message: 'Error creating feedback' });
  }
});

const parseFilters = (query) => {
  const filters = {};
  if (query.category) filters.category = query.category;
  if (query.trigger) filters.trigger = query.trigger;
  if (query.modelName) filters.modelName = query.modelName;
  if (query.from) {
    const d = new Date(query.from);
    if (!isNaN(d.getTime())) filters.from = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!isNaN(d.getTime())) filters.to = d;
  }
  return filters;
};

router.get('/', requireJwtAuth, requireAdminAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const filters = parseFilters(req.query);
    const result = await db.listFeedbacks({ filters, limit, offset });
    res.json(result);
  } catch (error) {
    logger.error('[GET /api/admin/feedbacks] Error', error);
    res.status(500).json({ message: 'Error listing feedbacks' });
  }
});

const csvEscape = (value) => {
  if (value == null) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

const toCsv = (items) => {
  const headers = [
    'createdAt',
    'trigger',
    'category',
    'modelName',
    'conversationId',
    'messageId',
    'userMessage',
    'assistantMessage',
    'reason',
  ];
  const lines = [headers.join(',')];
  for (const item of items) {
    lines.push(
      headers
        .map((h) => csvEscape(item[h] instanceof Date ? item[h].toISOString() : item[h]))
        .join(','),
    );
  }
  return lines.join('\n');
};

router.get('/export', requireJwtAuth, requireAdminAccess, async (req, res) => {
  try {
    const format = req.query.format === 'json' ? 'json' : 'csv';
    const filters = parseFilters(req.query);
    const items = await db.exportFeedbacks(filters);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="feedbacks-${timestamp}.json"`);
      return res.send(JSON.stringify(items, null, 2));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="feedbacks-${timestamp}.csv"`);
    res.send(toCsv(items));
  } catch (error) {
    logger.error('[GET /api/admin/feedbacks/export] Error', error);
    res.status(500).json({ message: 'Error exporting feedbacks' });
  }
});

module.exports = router;
