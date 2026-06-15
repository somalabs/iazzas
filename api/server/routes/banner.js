const express = require('express');
const { logger } = require('@librechat/data-schemas');
const optionalJwtAuth = require('~/server/middleware/optionalJwtAuth');
const { getBanner, listBanners } = require('~/models');

const router = express.Router();

router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    res.status(200).send(await getBanner(req.user));
  } catch (error) {
    logger.error('[getBanner] Error getting banner', error);
    res.status(500).json({ message: 'Error getting banner' });
  }
});

const bannersRouter = express.Router();

bannersRouter.get('/', optionalJwtAuth, async (req, res) => {
  try {
    res.status(200).send(await listBanners({ user: req.user, limit: 10 }));
  } catch (error) {
    logger.error('[listBanners] Error listing banners', error);
    res.status(500).json({ message: 'Error listing banners' });
  }
});

module.exports = router;
module.exports.banners = bannersRouter;
