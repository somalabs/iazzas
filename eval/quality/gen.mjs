// Lever Lab generator — calls Gemini directly with the IAzzas system prompt,
// varying one harness lever at a time. Stage 1 of the quality eval harness.
// Reads GOOGLE_KEY from repo-root .env. No LibreChat HTTP / no MCP here.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../../.env');

function loadKey() {
  if (process.env.GOOGLE_KEY) return process.env.GOOGLE_KEY;
  const env = readFileSync(ENV_PATH, 'utf8');
  const line = env.split('\n').find((l) => /^GOOGLE_KEY=/.test(l));
  if (!line) throw new Error('GOOGLE_KEY not found in .env');
  return line.replace(/^GOOGLE_KEY=/, '').trim();
}

const KEY = loadKey();

/**
 * @param {{model:string, systemInstruction?:string, prompt:string,
 *          temperature?:number, maxOutputTokens?:number, thinkingBudget?:number}} cfg
 */
export async function generate(cfg) {
  const {
    model,
    systemInstruction,
    prompt,
    temperature,
    maxOutputTokens,
    thinkingBudget,
    thinkingLevel,
  } = cfg;

  const isGemini3Plus = /gemini-(?:[3-9]|\d{2,})/i.test(model);
  const generationConfig = {};
  if (temperature != null) generationConfig.temperature = temperature;
  if (maxOutputTokens != null) generationConfig.maxOutputTokens = maxOutputTokens;
  if (isGemini3Plus) {
    // Gemini 3+ uses qualitative thinkingLevel, not numeric thinkingBudget.
    generationConfig.thinkingConfig = { thinkingLevel: thinkingLevel || 'high', includeThoughts: false };
  } else if (thinkingBudget != null) {
    generationConfig.thinkingConfig = { thinkingBudget, includeThoughts: false };
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, error: errText.slice(0, 500), ms };
  }

  const data = await res.json();
  const cand = data.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  const usage = data.usageMetadata ?? {};
  return {
    ok: true,
    ms,
    text,
    finishReason: cand?.finishReason,
    usage: {
      prompt: usage.promptTokenCount ?? 0,
      output: usage.candidatesTokenCount ?? 0,
      thoughts: usage.thoughtsTokenCount ?? 0,
      total: usage.totalTokenCount ?? 0,
    },
  };
}

// CLI smoke test: node gen.mjs <model> "<prompt>"
if (process.argv[1] && process.argv[1].endsWith('gen.mjs')) {
  const model = process.argv[2] || 'gemini-2.5-flash';
  const prompt = process.argv[3] || 'Responda em uma frase: você está funcionando?';
  const r = await generate({ model, prompt, thinkingBudget: -1 });
  console.log(JSON.stringify(r, null, 2).slice(0, 1200));
}
