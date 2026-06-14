// Aggregates a 3-judge panel result. Averages over judges, maps anonId->config, reports
// per-config per-dim means + overall + mean inter-judge spread (agreement).
// Usage: node aggregate-panel.mjs <scoresFile> <keymapFile> <dimsCsv> <title>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const [scoresFile, keymapFile, dimsCsv, title] = process.argv.slice(2);
const data = JSON.parse(readFileSync(here(scoresFile), 'utf8'));
const keymap = JSON.parse(readFileSync(here(keymapFile), 'utf8'));
const DIMS = dimsCsv.split(',');

const perConfig = {}; // config -> dim -> [taskMeans]
const spreads = []; // per (task,config) overall std across judges

for (const task of data) {
  const map = keymap[task.taskId];
  if (!map || !Array.isArray(task.judges)) continue;
  // collect per candidate: judge values per dim
  const byCand = {}; // anonId -> dim -> [values across judges]
  for (const judge of task.judges) {
    if (!judge?.scores) continue;
    for (const s of judge.scores) {
      byCand[s.anonId] ??= {};
      for (const d of DIMS) { (byCand[s.anonId][d] ??= []).push(Number(s[d])); }
    }
  }
  for (const [anonId, dimVals] of Object.entries(byCand)) {
    const cfg = map[anonId];
    if (!cfg) continue;
    perConfig[cfg] ??= Object.fromEntries(DIMS.map((d) => [d, []]));
    for (const d of DIMS) {
      const arr = dimVals[d].filter((x) => !Number.isNaN(x));
      if (arr.length) perConfig[cfg][d].push(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    // overall spread across judges
    const ov = dimVals['overall'].filter((x) => !Number.isNaN(x));
    if (ov.length > 1) {
      const m = ov.reduce((a, b) => a + b, 0) / ov.length;
      spreads.push(Math.sqrt(ov.reduce((a, b) => a + (b - m) ** 2, 0) / ov.length));
    }
  }
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const f = (n) => n.toFixed(2);
console.log(`\n# ${title} — painel de 3 juízes (média)\n`);
console.log('| Config | ' + DIMS.map((d) => d).join(' | ') + ' |');
console.log('|---|' + DIMS.map(() => '--:').join('|') + '|');
for (const cfg of Object.keys(perConfig)) {
  console.log('| ' + cfg + ' | ' + DIMS.map((d) => f(mean(perConfig[cfg][d]))).join(' | ') + ' |');
}
console.log(`\nConcordância (spread médio do overall entre juízes): ±${f(mean(spreads))}`);
