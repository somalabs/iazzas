// Blind A/B prep for the HTML-deliverable panel: prod-current vs prod-html.
// Records, per task, whether each side delivered HTML + the rendered PNG path,
// so judges can SEE the artifact. A/B alternates by index. keymap kept local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const runs = JSON.parse(readFileSync(here('results-html/run.json'), 'utf8'));
const judgeDir = 'judge-html';
mkdirSync(here(judgeDir), { recursive: true });

const byTask = {};
for (const r of runs) (byTask[r.task] ??= {})[r.config] = r;
const side = (r) => {
  const png = here(`results-html/${r.config}/${r.task}.png`);
  const html = here(`results-html/${r.config}/${r.task}.html`);
  return { config: r.config, hasHtml: r.hasHtml, refused: r.refused, htmlLen: r.htmlLen, png: r.hasHtml && existsSync(png) ? png : null, html: r.hasHtml && existsSync(html) ? html : null };
};

const keymap = {};
Object.keys(byTask).forEach((task, i) => {
  const cur = byTask[task]['prod-current'];
  const plus = byTask[task]['prod-html'];
  if (!cur || !plus) return;
  const flip = i % 2 === 1;
  const A = flip ? 'prod-html' : 'prod-current';
  const B = flip ? 'prod-current' : 'prod-html';
  const pick = (k) => (k === 'prod-current' ? cur : plus);
  keymap[task] = { A, B };
  writeFileSync(
    here(`${judgeDir}/${task}.json`),
    JSON.stringify({ id: task, type: cur.type, kind: cur.kind, prompt: cur.prompt, checks: cur.checks, A: side(pick(A)), B: side(pick(B)) }, null, 2),
  );
});
writeFileSync(here(`${judgeDir}/keymap.json`), JSON.stringify(keymap, null, 2));
console.log(`prep-html-ab: ${Object.keys(keymap).length} tarefas`);
