const { randomUUID } = require('crypto');
const { logger } = require('@librechat/data-schemas');
const { Constants, EModelEndpoint } = require('librechat-data-provider');

const JUDGE_INSTRUCTIONS = [
  'Você é um avaliador determinístico para um flow automatizado.',
  'Receberá um CRITÉRIO em linguagem natural e o CONTEXTO acumulado do flow.',
  'Sua tarefa: responder se o critério está satisfeito pelo contexto.',
  '',
  'RESPONDA APENAS com um objeto JSON válido, sem texto ao redor e sem markdown, no formato:',
  '{"answer": true|false, "reasoning": "explicação curta em uma frase"}',
].join('\n');

function buildSyntheticRes() {
  const noop = () => res;
  const res = {};
  res.write = noop;
  res.end = noop;
  res.json = noop;
  res.status = () => res;
  res.setHeader = noop;
  res.removeHeader = noop;
  res.flush = noop;
  res.on = noop;
  res.headersSent = false;
  res.locals = {};
  return res;
}

function collectText(parts) {
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
    .map((p) => (typeof p.text === 'string' ? p.text : p.text?.value || ''))
    .join('')
    .trim();
}

function pickDefaultSpec(req) {
  const list = req.config?.modelSpecs?.list;
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  return list.find((s) => s.default) ?? list[0];
}

function parseAnswer(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Judge did not return JSON: ${raw.slice(0, 200)}`);
    }
    obj = JSON.parse(match[0]);
  }
  if (typeof obj.answer !== 'boolean') {
    throw new Error(`Judge JSON missing boolean "answer": ${cleaned.slice(0, 200)}`);
  }
  return {
    answer: obj.answer,
    reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
  };
}

/**
 * @param {object} params
 * @param {import('express').Request} params.req
 * @param {string} params.criterio
 * @param {string} params.contextDump
 * @returns {Promise<{ answer: boolean, reasoning: string }>}
 */
async function runJudge({ req, criterio, contextDump }) {
  const { initializeClient } = require('~/server/services/Endpoints/agents/initialize');
  const { loadAgent: loadAgentFn } = require('@librechat/api');
  const { getMCPServerTools } = require('~/server/services/Config');
  const db = require('~/models');

  const spec = pickDefaultSpec(req);
  if (!spec) {
    throw new Error('No default modelSpec configured for Decisão node');
  }
  const model = spec.preset?.model;
  const endpoint = spec.preset?.endpoint ?? EModelEndpoint.agents;
  if (!model) {
    throw new Error('Default modelSpec is missing preset.model');
  }

  const agentId = Constants.EPHEMERAL_AGENT_ID;
  const model_parameters = { model };

  const judgeReqBody = {
    ...(req.body || {}),
    spec: spec.name,
    promptPrefix: JUDGE_INSTRUCTIONS,
    ephemeralAgent: {},
    endpoint,
    endpointOption: undefined,
  };
  const syntheticReq = { ...req, body: judgeReqBody };

  const agentPromise = loadAgentFn(
    { req: syntheticReq, spec: spec.name, agent_id: agentId, endpoint, model_parameters },
    { getAgent: db.getAgent, getMCPServerTools },
  ).catch((error) => {
    logger.error('[Flows.runJudge] loadAgent failed', error);
    return undefined;
  });

  const endpointOption = {
    endpoint,
    agent_id: agentId,
    spec: spec.name,
    agent: agentPromise,
    model_parameters,
    edges: [],
  };

  judgeReqBody.endpointOption = endpointOption;

  const userMessage = `CRITÉRIO:\n${criterio}\n\nCONTEXTO:\n${contextDump}`;

  const res = buildSyntheticRes();

  try {
    const { client } = await initializeClient({ req: syntheticReq, res, endpointOption });
    client.responseMessageId = randomUUID();
    client.conversationId = randomUUID();
    client.parentMessageId = randomUUID();
    const { completion } = await client.sendCompletion(
      [{ role: 'user', content: userMessage }],
      {},
    );
    const raw = collectText(completion);
    return parseAnswer(raw);
  } catch (err) {
    logger.error('[Flows.runJudge] judge invocation failed', err);
    throw new Error(`judge_runtime_error: ${err.message || 'unknown'}`);
  }
}

module.exports = { runJudge };
