// Aggregates the iazzas-prod-ab workflow output into a prod-current vs prod-plus
// scorecard by dimension. Maps blind A/B -> config via each dimension's keymap.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const panel = JSON.parse(readFileSync(here('judge-ab/panel.json'), 'utf8'));
const DIR_OF = { Exec: 'judge-ab-exec', Geral: 'judge-ab-geral', Miro: 'judge-ab-miro', BI: 'judge-ab-bi' };
const keymaps = Object.fromEntries(Object.entries(DIR_OF).map(([dim, d]) => [dim, JSON.parse(readFileSync(here(`${d}/keymap.json`), 'utf8'))]));

const acc = {}; // dim -> { 'prod-current':[], 'prod-plus':[] }
const wins = {}; // dim -> { plus, current, tie }
for (const row of panel) {
  const km = keymaps[row.dim]?.[row.task];
  if (!km) continue;
  acc[row.dim] ??= { 'prod-current': [], 'prod-plus': [] };
  wins[row.dim] ??= { 'prod-plus': 0, 'prod-current': 0, empate: 0 };
  for (const j of row.judges) {
    acc[row.dim][km.A]?.push(j.A?.nota);
    acc[row.dim][km.B]?.push(j.B?.nota);
    const w = j.vencedor === 'A' ? km.A : j.vencedor === 'B' ? km.B : 'empate';
    wins[row.dim][w] = (wins[row.dim][w] || 0) + 1;
  }
}
const mean = (a) => { const v = a.filter((x) => typeof x === 'number'); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
const f = (n) => n.toFixed(2);

let md = '# Scorecard — prod-current vs prod-plus (impacto dos módulos sobre a persona de prod)\n\n';
md += 'Painel cego A/B, juízes Claude. prod-current = prompt de produção hoje. prod-plus = prod + módulos (BI + escrita executiva + Miro). Mesmo modelo (Gemini 3.1 Pro). BI julgado vs gabarito numérico exato.\n\n';
md += '| Dimensão | prod-current | prod-plus | Δ | prod-plus vence/empata/perde |\n|---|--:|--:|--:|--:|\n';
for (const dim of ['Geral', 'Exec', 'Miro', 'BI']) {
  if (!acc[dim]) continue;
  const c = mean(acc[dim]['prod-current']), p = mean(acc[dim]['prod-plus']);
  const w = wins[dim];
  md += `| ${dim} | ${f(c)} | ${f(p)} | ${p >= c ? '+' : ''}${f(p - c)} | ${w['prod-plus']}/${w.empate}/${w['prod-current']} |\n`;
}
writeFileSync(here('SCORECARD-PROD-AB.md'), md);
console.log(md);
