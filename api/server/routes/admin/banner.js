const express = require('express');
const { logger, SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const { createBanner, listBanners, deleteBanner } = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

router.use(requireJwtAuth, requireAdminAccess);

router.post('/', async (req, res) => {
  try {
    const { message, type, displayFrom, displayTo, isPublic, persistable } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const banner = await createBanner({
      message,
      type,
      displayFrom,
      displayTo,
      isPublic,
      persistable,
    });
    res.status(201).json(banner);
  } catch (error) {
    logger.error('[createBanner] Error creating banner', error);
    res.status(500).json({ message: 'Error creating banner' });
  }
});

router.get('/', async (req, res) => {
  try {
    res.status(200).json(await listBanners({ user: req.user, limit: 100 }));
  } catch (error) {
    logger.error('[listBanners] Error listing banners', error);
    res.status(500).json({ message: 'Error listing banners' });
  }
});

router.delete('/:bannerId', async (req, res) => {
  try {
    const result = await deleteBanner(req.params.bannerId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[deleteBanner] Error deleting banner', error);
    res.status(500).json({ message: 'Error deleting banner' });
  }
});

module.exports = router;
