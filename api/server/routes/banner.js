const express = require('express');
const { logger } = require('@librechat/data-schemas');
const optionalJwtAuth = require('~/server/middleware/optionalJwtAuth');
const { requireJwtAuth } = require('~/server/middleware');
const { getBanner, listBanners, markBannerSeen } = require('~/models');

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
    res.status(200).send(await listBanners({ user: req.user, limit: 30 }));
  } catch (error) {
    logger.error('[listBanners] Error listing banners', error);
    res.status(500).json({ message: 'Error listing banners' });
  }
});

bannersRouter.post('/:bannerId/seen', requireJwtAuth, async (req, res) => {
  try {
    await markBannerSeen(req.params.bannerId, req.user.id);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[markBannerSeen] Error marking banner seen', error);
    res.status(500).json({ message: 'Error marking banner seen' });
  }
});

module.exports = router;
module.exports.banners = bannersRouter;
