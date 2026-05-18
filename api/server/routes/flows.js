const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const { getRoleByName } = require('~/models');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  runFlow,
  resumeRun,
  listRuns,
} = require('~/server/controllers/flows');

const router = express.Router();

const flowPayloadLimit = express.json({ limit: '1mb' });

/** RBAC reuses PermissionTypes.AGENTS — flows orchestrate existing agents. */
const checkFlowRead = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE],
  getRoleByName,
});
const checkFlowCreate = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});
const checkFlowUpdate = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});
const checkFlowRun = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE],
  getRoleByName,
});

router.use(requireJwtAuth);
router.use(checkBan);

router.get('/', checkFlowRead, listFlows);
router.post('/', flowPayloadLimit, checkFlowCreate, createFlow);

router.post('/runs/:runId/resume', flowPayloadLimit, checkFlowRun, resumeRun);

router.get('/:id', checkFlowRead, getFlow);
router.put('/:id', flowPayloadLimit, checkFlowUpdate, updateFlow);
router.delete('/:id', checkFlowUpdate, deleteFlow);
router.get('/:id/runs', checkFlowRead, listRuns);
router.post('/:id/run', flowPayloadLimit, checkFlowRun, runFlow);

module.exports = router;
