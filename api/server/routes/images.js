const express = require('express');
const { requireJwtAuth, configMiddleware, checkBan } = require('~/server/middleware');
const {
  generate,
  edit,
  listGenerations,
  getGeneration,
} = require('~/server/controllers/images');

const router = express.Router();

router.use(requireJwtAuth);
router.use(configMiddleware);
router.use(checkBan);
router.use(express.json({ limit: '2mb' }));

router.post('/generate', generate);
router.post('/edit', edit);
router.get('/generations', listGenerations);
router.get('/generations/:id', getGeneration);

module.exports = router;
