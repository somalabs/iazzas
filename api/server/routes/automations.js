const express = require('express');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleEnabled,
  runNow,
  listRuns,
} = require('~/server/controllers/automations');

const router = express.Router();

const payloadLimit = express.json({ limit: '1mb' });

router.use(requireJwtAuth);
router.use(checkBan);

router.get('/', listAutomations);
router.post('/', payloadLimit, createAutomation);

router.get('/:id/runs', listRuns);
router.post('/:id/run', payloadLimit, runNow);
router.patch('/:id/enabled', payloadLimit, toggleEnabled);

router.get('/:id', getAutomation);
router.put('/:id', payloadLimit, updateAutomation);
router.delete('/:id', deleteAutomation);

module.exports = router;
