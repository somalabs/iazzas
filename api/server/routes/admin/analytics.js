const express = require('express');
const mongoose = require('mongoose');
const { createAdminAnalyticsHandlers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const handlers = createAdminAnalyticsHandlers({
  TransactionModel: mongoose.models.Transaction || mongoose.model('Transaction'),
  UserModel: mongoose.models.User || mongoose.model('User'),
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', handlers.getDashboard);
router.get('/models', handlers.getModels);

module.exports = router;
