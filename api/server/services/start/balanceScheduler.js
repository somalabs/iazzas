const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');
const { getBalanceConfig, startBalanceResetScheduler } = require('@librechat/api');
const { getAppConfig } = require('~/server/services/Config');

async function resolveStartBalance() {
  const appConfig = await getAppConfig({ baseOnly: true });
  const balanceConfig = getBalanceConfig(appConfig);
  return balanceConfig?.startBalance ?? null;
}

function getBalanceModel() {
  return mongoose.models.Balance || mongoose.model('Balance');
}

async function resetAllBalances() {
  const startBalance = await resolveStartBalance();
  if (startBalance == null) {
    logger.warn('[BalanceScheduler] Skipping reset: startBalance is not configured');
    return 0;
  }
  const Balance = getBalanceModel();
  const result = await Balance.updateMany(
    {},
    {
      $set: {
        tokenCredits: startBalance,
        lastRefill: new Date(),
        autoRefillEnabled: false,
      },
    },
  );
  return result.modifiedCount ?? 0;
}

async function getLatestRefill() {
  const Balance = getBalanceModel();
  const doc = await Balance.findOne({}).sort({ lastRefill: -1 }).select('lastRefill').lean();
  return doc?.lastRefill ?? null;
}

function initializeBalanceScheduler() {
  return startBalanceResetScheduler({ resetAllBalances, getLatestRefill });
}

module.exports = { initializeBalanceScheduler };
