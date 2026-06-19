const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { logger, SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth, configMiddleware } = require('~/server/middleware');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { resizeImageBuffer } = require('~/server/services/Files/images/resize');
const { getFileStrategy } = require('~/server/utils/getFileStrategy');
const { createMulterInstance } = require('~/server/routes/files/multer');
const { createBanner, listBanners, deleteBanner } = require('~/models');

const router = express.Router();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireBannerManage = requireCapability(SystemCapabilities.MANAGE_BANNERS);

router.use(requireJwtAuth, requireAdminAccess);

let multerInstance;
const uploadSingleImage = async (req, res, next) => {
  try {
    if (!multerInstance) {
      multerInstance = await createMulterInstance();
    }
    multerInstance.single('file')(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.post('/', requireBannerManage, async (req, res) => {
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
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.username || req.user.email,
    });
    res.status(201).json(banner);
  } catch (error) {
    logger.error('[createBanner] Error creating banner', error);
    res.status(500).json({ message: 'Error creating banner' });
  }
});

router.post(
  '/image',
  requireBannerManage,
  configMiddleware,
  uploadSingleImage,
  async (req, res) => {
    try {
      const file = req.file;
      if (!file || file.size === 0) {
        return res.status(400).json({ message: 'No image provided' });
      }
      if (!file.mimetype?.startsWith('image/')) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return res.status(400).json({ message: 'Image too large (max 10 MB)' });
      }

      const appConfig = req.config;
      const userId = req.user.id;
      const input = await fs.readFile(file.path);

      const { buffer } = await resizeImageBuffer(input, { px: 1280 });
      const fileStrategy = getFileStrategy(appConfig, { isImage: true });
      const { saveBuffer } = getStrategyFunctions(fileStrategy);

      const extension = path.extname(file.originalname).toLowerCase() || '.png';
      const fileName = `recado-${crypto.randomUUID()}${extension}`;
      const url = await saveBuffer({ userId, buffer, fileName });

      res.status(201).json({ url });
    } catch (error) {
      logger.error('[createBannerImage] Error uploading banner image', error);
      res.status(500).json({ message: 'Error uploading image' });
    } finally {
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch {
          logger.debug('[createBannerImage] Temp. image upload file already deleted');
        }
      }
    }
  },
);

router.get('/', async (req, res) => {
  try {
    res.status(200).json(await listBanners({ user: req.user, limit: 100 }));
  } catch (error) {
    logger.error('[listBanners] Error listing banners', error);
    res.status(500).json({ message: 'Error listing banners' });
  }
});

router.delete('/:bannerId', requireBannerManage, async (req, res) => {
  try {
    const result = await deleteBanner(req.params.bannerId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[deleteBanner] Error deleting banner', error);
    res.status(500).json({ message: 'Error deleting banner' });
  }
});

module.exports = router;
