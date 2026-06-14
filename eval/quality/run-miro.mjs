// Miro diagram/board lever lab: runs each Miro task through a real Gemini
// function-calling loop with the fake Miro tool surface, capturing the full
// trajectory (which tools, the emitted DSL) per config for the structural linter.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { declarations, execute } from './miro-fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const env = readFileSync(here('../../.env'), 'utf8');
const KEY = env.split('\n').find((l) => /^GOOGLE_KEY=/.test(l)).replace(/^GOOGLE_KEY=/, '').trim();

const loadPrompt = (name) => readFileSync(here(`prompts/${name}.txt`), 'utf8').trim();
const tasks = JSON.parse(readFileSync(here('tasks-miro.json'), 'utf8'));

const CONFIGS = [
  { id: 'prod-current', model: 'gemini-3.1-pro-preview', prompt: 'prod-current' },
  { id: 'prod-plus', model: 'gemini-3.1-pro-preview', prompt: 'prod-plus' },
];

const tools = [{ functionDeclarations: declarations }];
const MAX_STEPS = 8;

async function gemini(model, systemInstruction, contents, allowTools) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  const isG3 = /gemini-(?:[3-9]|\d{2,})/i.test(model);
  const thinkingConfig = isG3 ? { thinkingLevel: 'high' } : { thinkingBudget: -1 };
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { temperature: 1, maxOutputTokens: 8192, thinkingConfig },
  };
  if (allowTools) body.tools = tools;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) return { ok: false, status: res.status, error: (await res.text()).slice(0, 400) };
  return { ok: true, data: await res.json() };
}

async function runOne(cfg, task) {
  const sys = loadPrompt(cfg.prompt);
  const contents = [{ role: 'user', parts: [{ text: task.prompt }] }];
  const trajectory = [];
  let finalText = '';
  let steps = 0;
  let error = null;

  while (steps < MAX_STEPS) {
    const allowTools = steps < MAX_STEPS - 1;
    const r = await gemini(cfg.model, sys, contents, allowTools);
    if (!r.ok) { error = `${r.status}:${r.error}`; break; }
    const cand = r.data.candidates?.[0];
    const parts = cand?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    const text = parts.filter((p) => p.text).map((p) => p.text).join('');

    if (calls.length === 0) { finalText = text; break; }

    contents.push(cand.content);
    const responseParts = [];
    for (const c of calls) {
      const result = execute(c.name, c.args);
      trajectory.push({ step: steps, tool: c.name, args: c.args || {} });
      responseParts.push({ functionResponse: { name: c.name, response: result } });
    }
    contents.push({ role: 'user', parts: responseParts });
    steps++;
  }

  return {
    config: cfg.id,
    model: cfg.model,
    task: task.id,
    prompt: task.prompt,
    error,
    toolSeq: trajectory.map((t) => t.tool),
    nTools: trajectory.length,
    trajectory,
    finalText,
  };
}

mkdirSync(here('results-miro'), { recursive: true });
let existing = [];
try { existing = JSON.parse(readFileSync(here('results-miro/run.json'), 'utf8')); } catch { existing = []; }
const present = new Set(existing.map((r) => `${r.config}__${r.task}`));
const runnable = CONFIGS.filter((c) => existsSync(here(`prompts/${c.prompt}.txt`)));
const skipped = CONFIGS.filter((c) => !runnable.includes(c));
if (skipped.length) console.log(`pulando (sem prompt): ${skipped.map((c) => c.id).join(', ')}`);
const jobs = [];
for (const cfg of runnable) for (const task of tasks) {
  if (present.has(`${cfg.id}__${task.id}`)) continue;
  jobs.push({ cfg, task });
}
console.log(`${existing.length} existentes, ${jobs.length} novas trajetórias.`);

const results = [];
let idx = 0;
const CONC = 3;
async function worker() {
  while (idx < jobs.length) {
    const my = jobs[idx++];
    const out = await runOne(my.cfg, my.task);
    results.push(out);
    process.stdout.write(`${out.config}/${out.task}: [${out.toolSeq.join(' > ') || '(no tools)'}]${out.error ? ' ERR ' + out.error : ''}\n`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

const merged = [...existing, ...results];
merged.sort((a, b) => a.task.localeCompare(b.task) || a.config.localeCompare(b.config));
writeFileSync(here('results-miro/run.json'), JSON.stringify(merged, null, 2));
console.log(`\nDone. ${results.length} trajetórias, ${results.filter((r) => r.error).length} erros. -> results-miro/run.json`);
