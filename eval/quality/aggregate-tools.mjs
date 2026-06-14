// Aggregates judge-tools/scores.json + keymap.json into a BI scorecard.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const scores = JSON.parse(readFileSync(here('judge-tools/scores.json'), 'utf8'));
const keymap = JSON.parse(readFileSync(here('judge-tools/keymap.json'), 'utf8'));

const DIMS = ['correcao', 'rigor_dados', 'regras_negocio', 'instrucao_formato', 'estrutura', 'overall'];
const order = ['flash-current', 'flash-plus', 'pro-current', 'pro-plus', 'pro-v2', 'g31pro-v3', 'g35flash-v3', 'g31pro-v4'];
const agg = {};
for (const c of order) agg[c] = Object.fromEntries(DIMS.map((d) => [d, []]));

for (const task of scores) {
  const map = keymap[task.taskId];
  if (!map) continue;
  for (const s of task.scores) {
    const cfg = map[s.anonId];
    if (!cfg || !agg[cfg]) continue;
    for (const d of DIMS) if (typeof s[d] === 'number') agg[cfg][d].push(s[d]);
  }
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const f = (n) => n.toFixed(1);
const base = mean(agg['flash-current'].overall);

let md = '# Scorecard — Tool/BI Lab (Stage 2-lite)\n\n';
md += 'Trajetórias de function-calling reais (Gemini) sobre tool surface Azzas falsa (vendas_linx), 4 tarefas de BI. Juiz Claude (Opus) contra gabarito por tarefa.\n\n';
md += '| Config | Correção | Rigor dados | Regras negócio | Instr/Formato | Estrutura | **Overall** | Δ vs Flash hoje |\n';
md += '|---|--:|--:|--:|--:|--:|--:|--:|\n';
for (const c of order) {
  const o = mean(agg[c].overall);
  md += `| ${c} | ${f(mean(agg[c].correcao))} | ${f(mean(agg[c].rigor_dados))} | ${f(mean(agg[c].regras_negocio))} | ${f(mean(agg[c].instrucao_formato))} | ${f(mean(agg[c].estrutura))} | **${f(o)}** | ${o >= base ? '+' : ''}${f(o - base)} |\n`;
}
writeFileSync(here('SCORECARD-BI.md'), md);
console.log(md);
