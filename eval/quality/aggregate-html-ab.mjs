// Aggregates the iazzas-html-ab workflow output into a prod-current vs prod-html
// scorecard (entregabilidade, design, conteúdo, nota global, win rate).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const panel = JSON.parse(readFileSync(here('judge-html/panel.json'), 'utf8'));
const keymap = JSON.parse(readFileSync(here('judge-html/keymap.json'), 'utf8'));
const tasks = JSON.parse(readFileSync(here('tasks-html.json'), 'utf8'));
const typeOf = Object.fromEntries(tasks.map((t) => [t.id, t.type]));

const CFG = ['prod-current', 'prod-html'];
const acc = {};
for (const c of CFG) acc[c] = { nota: [], design: [], conteudo: [], entregou: [] };
const wins = { 'prod-html': 0, 'prod-current': 0, empate: 0 };
const perType = {}; // type -> config -> [nota]

for (const row of panel) {
  const km = keymap[row.task];
  if (!km) continue;
  const type = typeOf[row.task] || '?';
  perType[type] ??= { 'prod-current': [], 'prod-html': [] };
  for (const j of row.judges) {
    for (const slot of ['A', 'B']) {
      const cfg = km[slot];
      const s = j[slot];
      if (!s || !acc[cfg]) continue;
      acc[cfg].nota.push(s.nota);
      acc[cfg].design.push(s.design);
      acc[cfg].conteudo.push(s.conteudo);
      acc[cfg].entregou.push(s.entregou ? 1 : 0);
      perType[type][cfg].push(s.nota);
    }
    const w = j.vencedor === 'A' ? km.A : j.vencedor === 'B' ? km.B : 'empate';
    wins[w] = (wins[w] || 0) + 1;
  }
}
const mean = (a) => { const v = a.filter((x) => typeof x === 'number'); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
const f = (n) => n.toFixed(2);
const pct = (a) => `${Math.round(mean(a) * 100)}%`;

let md = '# Scorecard — relatórios/apresentações HTML (prod-current vs prod-html)\n\n';
md += 'Painel cego A/B, juízes Claude veem o PNG renderizado. prod-current = prompt de prod (com a recusa de "gerar arquivo"). prod-html = prod + carve-out (libera HTML via artifact) + módulo de qualidade HTML. Mesmo modelo (3.1 Pro).\n\n';
md += '| Config | Entregou HTML | Design | Conteúdo | **Nota global** |\n|---|--:|--:|--:|--:|\n';
for (const c of CFG) md += `| ${c} | ${pct(acc[c].entregou)} | ${f(mean(acc[c].design))} | ${f(mean(acc[c].conteudo))} | **${f(mean(acc[c].nota))}** |\n`;
md += `\n**Vencedor (prod-html / empate / prod-current):** ${wins['prod-html']} / ${wins.empate} / ${wins['prod-current']}\n`;
md += '\n## Por tipo (nota global)\n\n| Tipo | prod-current | prod-html | Δ |\n|---|--:|--:|--:|\n';
for (const [type, m] of Object.entries(perType)) {
  const c = mean(m['prod-current']), p = mean(m['prod-html']);
  md += `| ${type} | ${f(c)} | ${f(p)} | ${p >= c ? '+' : ''}${f(p - c)} |\n`;
}
writeFileSync(here('SCORECARD-HTML-AB.md'), md);
console.log(md);
