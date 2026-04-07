const express = require('express');
const { balanceSchema } = require('librechat-data-provider');
const {
  createAdminConfigHandlers,
  createEffectiveBalanceService,
  createEffectiveBalanceHandler,
  getBalanceConfig,
} = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const {
  hasConfigCapability,
  requireCapability,
} = require('~/server/middleware/roles/capabilities');
const { getAppConfig, invalidateConfigCaches } = require('~/server/services/Config');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const effectiveBalanceService = createEffectiveBalanceService({
  getUserPrincipals: db.getUserPrincipals,
  getApplicableConfigs: db.getApplicableConfigs,
  getGlobalBalanceConfig: () => {
    const config = getBalanceConfig();
    return config ?? {};
  },
});

const handlers = createAdminConfigHandlers({
  listAllConfigs: db.listAllConfigs,
  findConfigByPrincipal: db.findConfigByPrincipal,
  upsertConfig: db.upsertConfig,
  patchConfigFields: db.patchConfigFields,
  unsetConfigField: db.unsetConfigField,
  deleteConfig: db.deleteConfig,
  toggleConfigActive: db.toggleConfigActive,
  hasConfigCapability,
  getAppConfig,
  invalidateConfigCaches,
  validateBalanceOverride: (overrides) => {
    if (!overrides.balance) return null;
    const result = balanceSchema.safeParse(overrides.balance);
    if (!result.success) {
      return `Invalid balance override: ${result.error.issues.map((i) => i.message).join(', ')}`;
    }
    return null;
  },
  invalidateEffectiveBalanceCache: () => effectiveBalanceService.invalidateCache(),
});

const effectiveBalanceHandler = createEffectiveBalanceHandler({
  getEffectiveBalanceConfig: effectiveBalanceService.getEffectiveBalanceConfig,
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', handlers.listConfigs);
router.get('/base', handlers.getBaseConfig);
router.get('/effective/:userId/balance', effectiveBalanceHandler);
router.get('/:principalType/:principalId', handlers.getConfig);
router.put('/:principalType/:principalId', handlers.upsertConfigOverrides);
router.patch('/:principalType/:principalId/fields', handlers.patchConfigField);
router.delete('/:principalType/:principalId/fields', handlers.deleteConfigField);
router.delete('/:principalType/:principalId', handlers.deleteConfigOverrides);
router.patch('/:principalType/:principalId/active', handlers.toggleConfig);

module.exports = router;
