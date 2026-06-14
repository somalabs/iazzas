// Aggregates the iazzas-panel-miro workflow output (judge-miro/panel.json) into a
// scorecard. Maps blind A/B back to v11/v12 via keymap.json, averages each
// dimension across the 3 judges x 10 tasks per config, and flags loose-text fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const panel = JSON.parse(readFileSync(here('judge-miro/panel.json'), 'utf8'));
const keymap = JSON.parse(readFileSync(here('judge-miro/keymap.json'), 'utf8'));

const DIMS = ['fidelidade', 'estrutura', 'completude', 'clareza', 'overall'];
const CONFIGS = [...new Set(Object.values(keymap).flatMap((m) => [m.A, m.B]))];
const agg = {};
for (const c of CONFIGS) agg[c] = { ...Object.fromEntries(DIMS.map((d) => [d, []])), loose: 0, n: 0 };
const perTask = {};

for (const task of panel) {
  const map = keymap[task.taskId];
  if (!map) continue;
  perTask[task.taskId] = {};
  for (const slot of ['A', 'B']) {
    const cfg = map[slot];
    const scores = task.judges.map((j) => j[slot]).filter(Boolean);
    if (!scores.length) continue;
    const mean = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
    for (const d of DIMS) agg[cfg][d].push(...scores.map((s) => s[d]).filter((v) => typeof v === 'number'));
    agg[cfg].loose += scores.filter((s) => s.loose_text).length;
    agg[cfg].n += scores.length;
    perTask[task.taskId][cfg] = mean(scores.map((s) => s.overall));
  }
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const f = (n) => n.toFixed(2);

const [cA, cB] = CONFIGS;
let md = '# Scorecard — Painel Miro (qualidade dos diagramas/boards)\n\n';
md += `Painel cego de 3 juízes Claude vs gold nível-Claude, ${panel.length} tarefas. Comparando ${cA} vs ${cB}.\n\n`;
md += '| Config | Fidelidade | Estrutura | Completude | Clareza | **Overall** | Falhas texto-solto |\n|---|--:|--:|--:|--:|--:|--:|\n';
for (const c of CONFIGS) {
  const a = agg[c];
  md += `| ${c} | ${f(mean(a.fidelidade))} | ${f(mean(a.estrutura))} | ${f(mean(a.completude))} | ${f(mean(a.clareza))} | **${f(mean(a.overall))}** | ${a.loose}/${a.n} |\n`;
}
md += `\n## Overall por tarefa (${cA} → ${cB})\n\n| Tarefa | ${cA} | ${cB} | Δ |\n|---|--:|--:|--:|\n`;
for (const [id, r] of Object.entries(perTask)) {
  const d = (r[cB] ?? 0) - (r[cA] ?? 0);
  md += `| ${id} | ${r[cA] != null ? f(r[cA]) : '-'} | ${r[cB] != null ? f(r[cB]) : '-'} | ${d >= 0 ? '+' : ''}${f(d)} |\n`;
}
writeFileSync(here('SCORECARD-MIRO.md'), md);
console.log(md);
