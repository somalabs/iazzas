// Blind A/B prep for the BI sandbox: prod-current vs prod-plus, judged against the
// EXACT computed gabarito. Reads results-bi-prodcurrent/ and results-bi-prodplus/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const cur = JSON.parse(readFileSync(here('results-bi-prodcurrent/run.json'), 'utf8'));
const plus = JSON.parse(readFileSync(here('results-bi-prodplus/run.json'), 'utf8'));
const gab = JSON.parse(readFileSync(here('results-bi-prodcurrent/gabarito.json'), 'utf8'));
const judgeDir = 'judge-ab-bi';
mkdirSync(here(judgeDir), { recursive: true });

const byTaskCur = Object.fromEntries(cur.map((r) => [r.task, r]));
const byTaskPlus = Object.fromEntries(plus.map((r) => [r.task, r]));
const keymap = {};
const cand = (r) => ({ sql: r.sqlQueries || r.sql || [], finalText: r.finalText || '' });
Object.keys(byTaskCur).forEach((task, i) => {
  const c = byTaskCur[task], p = byTaskPlus[task];
  if (!c || !p) return;
  const flip = i % 2 === 1;
  const A = flip ? 'prod-plus' : 'prod-current';
  const B = flip ? 'prod-current' : 'prod-plus';
  const pick = (k) => (k === 'prod-current' ? c : p);
  keymap[task] = { A, B };
  writeFileSync(
    here(`${judgeDir}/${task}.json`),
    JSON.stringify({ id: task, prompt: c.prompt, gabarito: gab[task] ? { valores_corretos: gab[task] } : { nota: 'sem gabarito numérico exato — avalie coerência e regra (ex.: SSS comparable)' }, candidates: [{ anonId: 'A', ...cand(pick(A)) }, { anonId: 'B', ...cand(pick(B)) }] }, null, 2),
  );
});
writeFileSync(here(`${judgeDir}/keymap.json`), JSON.stringify(keymap, null, 2));
console.log(`prep-bi-ab: ${Object.keys(keymap).length} tarefas BI`);
