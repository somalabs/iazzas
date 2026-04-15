const { logger } = require('@librechat/data-schemas');
const db = require('~/models');

const TAG_REGEX =
  /<cannot_answer(?:\s+category\s*=\s*"([^"]*)")?\s*>([\s\S]*?)<\/cannot_answer>/i;

const VALID_CATEGORIES = new Set([
  'dados_internos',
  'tempo_real',
  'analise_arquivo',
  'info_pessoal',
  'integracao_externa',
  'fora_escopo',
  'limitacao_tecnica',
  'outros',
]);

const truncate = (value, max = 8000) => {
  if (typeof value !== 'string') return undefined;
  return value.length > max ? value.slice(0, max) : value;
};

const parseCannotAnswer = (text) => {
  if (typeof text !== 'string' || !text) return null;
  const match = text.match(TAG_REGEX);
  if (!match) return null;
  const rawCategory = (match[1] || '').trim().toLowerCase();
  const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'outros';
  const reason = (match[2] || '').trim();
  const cleanedText = text.replace(TAG_REGEX, '').replace(/^\s+/, '');
  return { category, reason, cleanedText };
};

const extractUserMessageText = (options) => {
  try {
    const body = options?.req?.body;
    if (typeof body?.text === 'string') return body.text;
    if (typeof body?.message === 'string') return body.message;
    return undefined;
  } catch {
    return undefined;
  }
};

const logCannotAnswerFeedback = async ({ responseMessage, options, user }) => {
  try {
    let searchText = responseMessage?.text;
    if (!searchText && Array.isArray(responseMessage?.content)) {
      searchText = responseMessage.content
        .map((p) => (p && typeof p === 'object' && typeof p.text === 'string' ? p.text : ''))
        .join('\n');
    }
    const parsed = parseCannotAnswer(searchText);
    if (!parsed) return;

    if (typeof responseMessage.text === 'string') {
      responseMessage.text = parsed.cleanedText;
    }
    if (Array.isArray(responseMessage.content)) {
      for (const part of responseMessage.content) {
        if (part && typeof part === 'object' && typeof part.text === 'string') {
          part.text = part.text.replace(TAG_REGEX, '').replace(/^\s+/, '');
        }
      }
    }

    db.createFeedback({
      conversationId: responseMessage.conversationId,
      messageId: responseMessage.messageId,
      userMessage: truncate(extractUserMessageText(options)),
      assistantMessage: truncate(parsed.cleanedText),
      trigger: 'model_self_report',
      category: parsed.category,
      reason: truncate(parsed.reason, 2000),
      modelName:
        responseMessage?.model ||
        options?.modelOptions?.model ||
        options?.endpointOption?.model ||
        options?.req?.body?.model,
    }).catch((err) => {
      logger.error('[cannotAnswerParser] Failed to save feedback', err);
    });
  } catch (error) {
    logger.error('[cannotAnswerParser] Unexpected error', error);
  }
};

module.exports = {
  parseCannotAnswer,
  logCannotAnswerFeedback,
  TAG_REGEX,
};
