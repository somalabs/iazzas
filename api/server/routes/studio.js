const express = require('express');
const { requireJwtAuth, configMiddleware, checkBan } = require('~/server/middleware');
const {
  generate,
  edit,
  getCreation,
  listCreations,
} = require('~/server/controllers/studio');

const router = express.Router();

const studioPayloadLimit = express.json({ limit: '2mb' });

router.use(requireJwtAuth);
router.use(checkBan);
router.use(configMiddleware);

router.post('/generate', studioPayloadLimit, generate);
router.post('/edit', studioPayloadLimit, edit);
router.get('/creations', listCreations);
router.get('/creations/:id', getCreation);

module.exports = router;
