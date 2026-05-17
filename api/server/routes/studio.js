const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const { requireJwtAuth, configMiddleware, checkBan } = require('~/server/middleware');
const { getRoleByName } = require('~/models');
const {
  generate,
  edit,
  getCreation,
  listCreations,
} = require('~/server/controllers/studio');

const router = express.Router();

const studioPayloadLimit = express.json({ limit: '2mb' });

/**
 * Studio generate/edit hit paid image providers (Flux/Imagen). Gate them with
 * the same RBAC mechanism every other paid AI route in this codebase uses
 * (see memories.js / agents/chat.js). Studio is the productized form of the
 * legacy agent image-generation tools, so it reuses the existing AGENTS/USE
 * permission — no new permission mechanism is invented.
 */
const checkStudioAccess = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE],
  getRoleByName,
});

router.use(requireJwtAuth);
router.use(checkBan);
router.use(configMiddleware);

router.post('/generate', checkStudioAccess, studioPayloadLimit, generate);
router.post('/edit', checkStudioAccess, studioPayloadLimit, edit);
router.get('/creations', listCreations);
router.get('/creations/:id', getCreation);

module.exports = router;
