// Anonymizes results-spec/run.json (v4 vs v5 exec-writing) into per-task judge inputs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const resDir = process.argv[2] || 'results-spec';
const judgeDir = process.argv[3] || 'judge-spec';
const results = JSON.parse(readFileSync(here(`${resDir}/run.json`), 'utf8'));
mkdirSync(here(judgeDir), { recursive: true });

const LABELS = ['A', 'B', 'C', 'D'];
function shuffle(arr, seed) {
  const s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return arr.map((v, i) => ({ v, k: (s * 31 + i * 17) % 101 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
const byTask = {};
for (const r of results) (byTask[r.task] ??= []).push(r);
const keymap = {};
const taskIds = [];
for (const [taskId, rows] of Object.entries(byTask)) {
  const sh = shuffle(rows, taskId);
  writeFileSync(
    here(`${judgeDir}/${taskId}.json`),
    JSON.stringify({ id: taskId, prompt: rows[0].prompt, checks: rows[0].checks, candidates: sh.map((r, i) => ({ anonId: LABELS[i], text: r.text })) }, null, 2),
  );
  keymap[taskId] = Object.fromEntries(sh.map((r, i) => [LABELS[i], r.config]));
  taskIds.push(taskId);
}
writeFileSync(here('judge-spec/keymap.json'), JSON.stringify(keymap, null, 2));
console.log('prep-spec:', taskIds.join(', '));
