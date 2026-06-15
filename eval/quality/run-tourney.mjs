// Generates all tournament variants x exec tasks (retry on empty), then anonymizes
// into judge-tourney/ (golds copied from judge-spec). Outputs run + keymap.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const tasks = JSON.parse(readFileSync(here('tasks-exec.json'), 'utf8'));
const VARIANTS = ['tour-fs2', 'tour-critique', 'tour-persona', 'tour-plan', 'tour-rubric', 'tour-fs2-critique', 'tour-sink'];
const loadPrompt = (n) => readFileSync(here(`prompts/${n}.txt`), 'utf8').trim();

const jobs = [];
for (const v of VARIANTS) for (const t of tasks) jobs.push({ v, t });
const results = [];
let idx = 0;
async function worker() {
  while (idx < jobs.length) {
    const { v, t } = jobs[idx++];
    let r, n = 0;
    do {
      r = await generate({ model: 'gemini-3.1-pro-preview', systemInstruction: loadPrompt(v), prompt: t.prompt, maxOutputTokens: 8192, thinkingLevel: 'high' });
      n++;
    } while ((!r.ok || !r.text) && n < 4);
    results.push({ config: v, task: t.id, text: r.text || '', ok: r.ok });
    process.stdout.write(`${v}/${t.id}: ${(r.text || '').length}c\n`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
mkdirSync(here('results-tourney'), { recursive: true });
writeFileSync(here('results-tourney/run.json'), JSON.stringify(results, null, 2));

// anonymize per task
mkdirSync(here('judge-tourney'), { recursive: true });
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const shuffle = (arr, seed) => {
  const s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return arr.map((v, i) => ({ v, k: (s * 31 + i * 17) % 101 })).sort((a, b) => a.k - b.k).map((x) => x.v);
};
const byTask = {};
for (const r of results) (byTask[r.task] ??= []).push(r);
const keymap = {};
for (const [taskId, rows] of Object.entries(byTask)) {
  const sh = shuffle(rows, taskId);
  const meta = tasks.find((t) => t.id === taskId);
  writeFileSync(here(`judge-tourney/${taskId}.json`), JSON.stringify({ id: taskId, prompt: meta.prompt, checks: meta.checks, candidates: sh.map((r, i) => ({ anonId: LABELS[i], text: r.text })) }, null, 2));
  keymap[taskId] = Object.fromEntries(sh.map((r, i) => [LABELS[i], r.config]));
  const gold = here(`judge-spec/${taskId}.gold.md`);
  if (existsSync(gold)) copyFileSync(gold, here(`judge-tourney/${taskId}.gold.md`));
}
writeFileSync(here('judge-tourney/keymap.json'), JSON.stringify(keymap, null, 2));
console.log(`\n${results.length} gerações, ${results.filter((r) => !r.text).length} vazias. judge-tourney pronto.`);
