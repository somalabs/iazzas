// Combines 3 configs (v11 / fs2-critique / twopass) into a clean head-to-head judge set.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const tasks = JSON.parse(readFileSync(here('tasks-exec.json'), 'utf8'));

const sources = [
  { file: 'results-spec-v11/run.json', config: 'g31pro-v11', label: 'v11' },
  { file: 'results-tourney/run.json', config: 'tour-fs2-critique', label: 'fs2-critique' },
  { file: 'results-2pass/run.json', config: 'twopass', label: 'twopass' },
];
const byTaskByLabel = {};
for (const s of sources) {
  const rows = JSON.parse(readFileSync(here(s.file), 'utf8')).filter((r) => r.config === s.config);
  for (const r of rows) {
    byTaskByLabel[r.task] ??= {};
    byTaskByLabel[r.task][s.label] = r.text;
  }
}
mkdirSync(here('judge-h2h'), { recursive: true });
const LABELS = ['A', 'B', 'C'];
const shuffle = (arr, seed) => { const s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0); return arr.map((v, i) => ({ v, k: (s * 31 + i * 17) % 101 })).sort((a, b) => a.k - b.k).map((x) => x.v); };
const keymap = {};
for (const t of tasks) {
  const entries = shuffle(Object.entries(byTaskByLabel[t.id] || {}), t.id);
  writeFileSync(here(`judge-h2h/${t.id}.json`), JSON.stringify({ id: t.id, prompt: t.prompt, checks: t.checks, candidates: entries.map(([, text], i) => ({ anonId: LABELS[i], text })) }, null, 2));
  keymap[t.id] = Object.fromEntries(entries.map(([label], i) => [LABELS[i], label]));
  const g = here(`judge-spec/${t.id}.gold.md`);
  if (existsSync(g)) copyFileSync(g, here(`judge-h2h/${t.id}.gold.md`));
}
writeFileSync(here('judge-h2h/keymap.json'), JSON.stringify(keymap, null, 2));
console.log('prep-h2h pronto:', Object.keys(keymap).length, 'tarefas');
