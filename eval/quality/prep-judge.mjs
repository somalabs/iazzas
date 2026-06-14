// Reads results/run.json and emits anonymized per-task judge inputs.
// Each task -> judge/<taskid>.json with candidates labeled A..E (shuffled,
// config identity hidden) + judge/keymap.json mapping back to config ids.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const results = JSON.parse(readFileSync(here('results/run.json'), 'utf8'));
mkdirSync(here('judge'), { recursive: true });

const byTask = {};
for (const r of results) {
  (byTask[r.task] ??= []).push(r);
}

// Deterministic shuffle by task id char sum (no Math.random — reproducible).
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
function shuffle(arr, seedStr) {
  const seed = [...seedStr].reduce((a, c) => a + c.charCodeAt(0), 0);
  return arr
    .map((v, i) => ({ v, k: (seed * 31 + i * 17) % 101 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

const keymap = {};
const taskIds = [];
for (const [taskId, rows] of Object.entries(byTask)) {
  const meta = rows[0];
  const shuffled = shuffle(rows, taskId);
  const candidates = shuffled.map((r, i) => ({ anonId: LABELS[i], text: r.text }));
  keymap[taskId] = Object.fromEntries(shuffled.map((r, i) => [LABELS[i], r.config]));
  writeFileSync(
    here(`judge/${taskId}.json`),
    JSON.stringify(
      { id: taskId, category: meta.category, prompt: meta.prompt, checks: meta.checks, candidates },
      null,
      2,
    ),
  );
  taskIds.push(taskId);
}

writeFileSync(here('judge/keymap.json'), JSON.stringify(keymap, null, 2));
writeFileSync(here('judge/taskids.json'), JSON.stringify(taskIds, null, 2));
console.log(`Prepared ${taskIds.length} judge inputs:`, taskIds.join(', '));
