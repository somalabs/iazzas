// Minimal Gemini function-calling protocol probe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
const KEY = env.split('\n').find((l) => /^GOOGLE_KEY=/.test(l)).replace(/^GOOGLE_KEY=/, '').trim();

const model = 'gemini-2.5-flash';
const tools = [{
  functionDeclarations: [{
    name: 'consultar_bq',
    description: 'Executa uma query SQL no BigQuery e retorna linhas agregadas.',
    parameters: {
      type: 'OBJECT',
      properties: { sql: { type: 'STRING', description: 'A query Standard SQL' } },
      required: ['sql'],
    },
  }],
}];

async function call(contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, tools, generationConfig: { temperature: 1 } }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 400) };
  return { ok: true, data: await res.json() };
}

// Turn 1: force a tool call
const contents = [{ role: 'user', parts: [{ text: 'Qual a venda líquida total de setembro? Use a ferramenta consultar_bq.' }] }];
let r = await call(contents);
if (!r.ok) { console.log('TURN1 ERR', r); process.exit(1); }
const cand = r.data.candidates[0];
const fcPart = cand.content.parts.find((p) => p.functionCall);
console.log('TURN1 parts:', JSON.stringify(cand.content.parts).slice(0, 300));
if (!fcPart) { console.log('no functionCall — model answered directly'); process.exit(0); }
console.log('functionCall:', JSON.stringify(fcPart.functionCall));

// Turn 2: append model content, then send functionResponse (testing role)
contents.push(cand.content);
contents.push({
  role: 'user',
  parts: [{ functionResponse: { name: 'consultar_bq', response: { rows: [{ mes: '2025-09', venda_liquida: 1234567.89 }] } } }],
});
r = await call(contents);
if (!r.ok) { console.log('TURN2 ERR (role=user)', r); process.exit(1); }
const txt = r.data.candidates[0].content.parts.filter((p) => p.text).map((p) => p.text).join('');
console.log('TURN2 final text:', txt.slice(0, 300));
console.log('PROTOCOL OK (role=user functionResponse works)');
