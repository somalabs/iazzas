// Drives the REAL iazzas agent chat (/api/agents/chat) end-to-end, through the
// actual LibreChat agent loop (which injects current date, runs LangGraph, etc).
// Usage: node e2e.mjs "<prompt text>" [model] [promptFile] [--raw]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const BASE = 'http://localhost:3080';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ email: 'evalbot@iazzas.local', password: 'EvalBot!2026aZ' }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).token;
}

const text = process.argv[2] || 'Que dia e hora são agora? Responda só a data e hora.';
const model = process.argv[3] || 'gemini-2.5-pro';
const promptFile = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : null;
const raw = process.argv.includes('--raw');
const promptPrefix = promptFile ? readFileSync(here(`prompts/${promptFile}.txt`), 'utf8').trim() : undefined;

const specArg = process.argv.find((a) => a.startsWith('--spec='));
const spec = specArg ? specArg.slice('--spec='.length) : null;

const token = await login();
const convoId = randomUUID();
const body = {
  endpoint: 'agents',
  agent_id: 'ephemeral',
  model,
  ...(spec ? { spec } : {}),
  ...(promptPrefix && !spec ? { promptPrefix } : {}),
  ephemeralAgent: { mcp: [], web_search: false, file_search: false, execute_code: false, artifacts: '' },
  text,
  sender: 'User',
  isCreatedByUser: true,
  conversationId: convoId,
  parentMessageId: '00000000-0000-0000-0000-000000000000',
  messageId: randomUUID(),
  error: false,
};

const startRes = await fetch(`${BASE}/api/agents/chat/agents`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Accept: 'text/event-stream',
    'User-Agent': UA,
  },
  body: JSON.stringify(body),
});

if (!startRes.ok) {
  console.log(`HTTP ${startRes.status}`);
  console.log((await startRes.text()).slice(0, 1000));
  process.exit(1);
}

const startInfo = await startRes.json();
const streamId = startInfo.streamId;
if (!streamId) {
  console.log('sem streamId:', JSON.stringify(startInfo).slice(0, 400));
  process.exit(1);
}

const res = await fetch(`${BASE}/api/agents/chat/stream/${encodeURIComponent(streamId)}`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream', 'User-Agent': UA },
});
if (!res.ok) {
  console.log(`stream HTTP ${res.status}`, (await res.text()).slice(0, 300));
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';
let finalText = '';
let acc = '';
let rawDump = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  buf += chunk;
  rawDump += chunk;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const ev = JSON.parse(payload);
      if (ev.event === 'on_message_delta' && Array.isArray(ev.data?.delta?.content)) {
        for (const part of ev.data.delta.content) {
          if (part.type === 'text' && typeof part.text === 'string') acc += part.text;
        }
      } else if (ev.final && ev.responseMessage?.text) {
        finalText = ev.responseMessage.text;
      } else if (ev.responseMessage?.text) {
        finalText = ev.responseMessage.text;
      }
    } catch {
      /* non-JSON data line */
    }
  }
}

if (raw) {
  console.log('=== RAW SSE (first 2500 chars) ===');
  console.log(rawDump.slice(0, 2500));
}
console.log('\n=== FINAL TEXT ===');
console.log(finalText || acc || '(vazio — ver --raw)');
