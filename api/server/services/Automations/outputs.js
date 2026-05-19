const { v4: uuidv4 } = require('uuid');
const { logger } = require('@librechat/data-schemas');
const { EModelEndpoint, Constants } = require('librechat-data-provider');
const { publishOutputTargets } = require('@librechat/api');
const { Notification } = require('~/db/models');
const { saveConvo, recordMessage } = require('~/models');

/**
 * Binds the pure {@link publishOutputTargets} orchestration to LibreChat's
 * persistence helpers. Conversation + Notification are best-effort: failures
 * are caught inside `publishOutputTargets` and logged scrubbed — never thrown.
 *
 * There is no pre-existing in-app notification subsystem in LibreChat
 * (confirmed during research), so per CONTRACT §17 ("se não existe, tech
 * define") a minimal `Notification` collection was introduced; surfacing UI
 * (a bell) is explicitly v2.
 */
function buildOutputDeps() {
  return {
    logger: {
      warn: (m) => logger.warn(`[Automations] ${m}`),
    },
    createConversation: async ({ userId, title, text }) => {
      const conversationId = uuidv4();
      await saveConvo(
        { userId },
        { conversationId, title, endpoint: EModelEndpoint.agents },
        { context: 'api/server/services/Automations/outputs.js' },
      );
      await recordMessage({
        user: userId,
        endpoint: EModelEndpoint.agents,
        messageId: uuidv4(),
        conversationId,
        parentMessageId: Constants.NO_PARENT,
        sender: 'Automação',
        text,
        isCreatedByUser: false,
        unfinished: false,
      });
    },
    notify: async ({ userId, type, title, body, link }) => {
      await Notification.create({ userId, type, title, body, link });
    },
  };
}

/** Fans an automation run result out to Conversation + Notification. */
function applyOutputTargets(params) {
  return publishOutputTargets(params, buildOutputDeps());
}

module.exports = { applyOutputTargets, buildOutputDeps };
