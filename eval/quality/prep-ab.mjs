// Generic blind A/B judge prep for prod-current vs prod-plus comparisons.
// Usage: node prep-ab.mjs <resultsDir> <judgeDir>  (run.json must have config in
// {prod-current, prod-plus}). Emits per-task {prompt, checks, candidates:[A,B]} +
// keymap.json (A/B -> config). A/B order alternates by index to balance position bias.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const [resDir = 'results-prod-exec', judgeDir = 'judge-ab'] = process.argv.slice(2);
const runs = JSON.parse(readFileSync(here(`${resDir}/run.json`), 'utf8'));

const byTask = {};
for (const r of runs) (byTask[r.task] ??= {})[r.config] = r;
mkdirSync(here(judgeDir), { recursive: true });

const keymap = {};
const ids = Object.keys(byTask);
ids.forEach((task, i) => {
  const cur = byTask[task]['prod-current'];
  const plus = byTask[task]['prod-plus'];
  if (!cur || !plus) return;
  const flip = i % 2 === 1;
  const A = flip ? 'prod-plus' : 'prod-current';
  const B = flip ? 'prod-current' : 'prod-plus';
  const text = (c) => c.text ?? c.finalText ?? '';
  keymap[task] = { A, B };
  writeFileSync(
    here(`${judgeDir}/${task}.json`),
    JSON.stringify(
      { id: task, prompt: (cur.prompt || plus.prompt), checks: cur.checks || plus.checks || [], candidates: [{ anonId: 'A', text: text(byTask[task][A]) }, { anonId: 'B', text: text(byTask[task][B]) }] },
      null, 2,
    ),
  );
});
writeFileSync(here(`${judgeDir}/keymap.json`), JSON.stringify(keymap, null, 2));
console.log(`prep-ab: ${Object.keys(keymap).length} tarefas (${resDir} -> ${judgeDir})`);
