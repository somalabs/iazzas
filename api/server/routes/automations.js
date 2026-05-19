const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const { getRoleByName } = require('~/models');
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

/** New PermissionType — automations schedule flows on the user's behalf. */
const checkRead = generateCheckAccess({
  permissionType: PermissionTypes.AUTOMATIONS,
  permissions: [Permissions.USE],
  getRoleByName,
});
const checkWrite = generateCheckAccess({
  permissionType: PermissionTypes.AUTOMATIONS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});

router.use(requireJwtAuth);
router.use(checkBan);

router.get('/', checkRead, listAutomations);
router.post('/', payloadLimit, checkWrite, createAutomation);

router.get('/:id/runs', checkRead, listRuns);
router.post('/:id/run', payloadLimit, checkRead, runNow);
router.patch('/:id/enabled', payloadLimit, checkWrite, toggleEnabled);

router.get('/:id', checkRead, getAutomation);
router.put('/:id', payloadLimit, checkWrite, updateAutomation);
router.delete('/:id', checkWrite, deleteAutomation);

module.exports = router;
