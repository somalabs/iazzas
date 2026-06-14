// Aggregates judge/scores.json (workflow output) + judge/keymap.json into a scorecard.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const scores = JSON.parse(readFileSync(here('judge/scores.json'), 'utf8'));
const keymap = JSON.parse(readFileSync(here('judge/keymap.json'), 'utf8'));
const configs = JSON.parse(readFileSync(here('configs.json'), 'utf8'));
const configLabel = Object.fromEntries(configs.map((c) => [c.id, c.label]));

const DIMS = ['correcao', 'profundidade', 'rigor_dados', 'instrucao_formato', 'estrutura', 'overall'];
const agg = {}; // config -> dim -> [values]
const dist = {}; // config -> {igual,perto,medio,longe}
const wins = {}; // config -> count of per-task overall wins

for (const c of configs) {
  agg[c.id] = Object.fromEntries(DIMS.map((d) => [d, []]));
  dist[c.id] = { igual: 0, perto: 0, medio: 0, longe: 0 };
  wins[c.id] = 0;
}

for (const task of scores) {
  const map = keymap[task.taskId];
  if (!map) continue;
  let bestOverall = -1;
  let bestCfg = null;
  for (const s of task.scores) {
    const cfg = map[s.anonId];
    if (!cfg) continue;
    for (const d of DIMS) if (typeof s[d] === 'number') agg[cfg][d].push(s[d]);
    if (s.distancia_referencia && dist[cfg][s.distancia_referencia] != null) dist[cfg][s.distancia_referencia]++;
    if (s.overall > bestOverall) { bestOverall = s.overall; bestCfg = cfg; }
  }
  if (bestCfg) wins[bestCfg]++;
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const f = (n) => n.toFixed(1);

const order = ['flash-current', 'flash-plus-tuned', 'pro-current', 'pro-plus', 'pro-plus-tuned', 'pro-v2', 'g31pro-v2', 'g31pro-v3', 'g35flash-v3', 'g31pro-v4'];
const baseline = 'flash-current';
const baseOverall = mean(agg[baseline].overall);

let md = '# Scorecard — Lever Lab (Stage 1)\n\n';
md += `Baseline = **flash-current** (o que os usuários recebem hoje). Notas 0-10, juiz Claude (Opus), candidatos anonimizados, ${scores.length} tarefas.\n\n`;
md += '| Config | Correção | Profund. | Rigor dados | Instr/Formato | Estrutura | **Overall** | Δ vs base | Wins | Dist. p/ ref (igual/perto/médio/longe) |\n';
md += '|---|--:|--:|--:|--:|--:|--:|--:|--:|---|\n';
for (const c of order) {
  if (!agg[c]) continue;
  const o = mean(agg[c].overall);
  const d = dist[c];
  md += `| ${c} | ${f(mean(agg[c].correcao))} | ${f(mean(agg[c].profundidade))} | ${f(mean(agg[c].rigor_dados))} | ${f(mean(agg[c].instrucao_formato))} | ${f(mean(agg[c].estrutura))} | **${f(o)}** | ${o >= baseOverall ? '+' : ''}${f(o - baseOverall)} | ${wins[c]} | ${d.igual}/${d.perto}/${d.medio}/${d.longe} |\n`;
}
md += '\n## Leitura por alavanca\n';
const M = (c) => mean(agg[c].overall);
md += `- **Troca de modelo (Flash→Pro), prompt atual:** ${f(M('flash-current'))} → ${f(M('pro-current'))} (Δ ${f(M('pro-current') - M('flash-current'))})\n`;
md += `- **Prompt melhorado no Pro:** ${f(M('pro-current'))} → ${f(M('pro-plus'))} (Δ ${f(M('pro-plus') - M('pro-current'))})\n`;
md += `- **Params calibrados (temp 0.4 / maxOut 32k) no Pro+prompt:** ${f(M('pro-plus'))} → ${f(M('pro-plus-tuned'))} (Δ ${f(M('pro-plus-tuned') - M('pro-plus'))})\n`;
md += `- **Upgrade barato (manter Flash + prompt+params):** ${f(M('flash-current'))} → ${f(M('flash-plus-tuned'))} (Δ ${f(M('flash-plus-tuned') - M('flash-current'))})\n`;
md += `- **Tudo (pro-plus-tuned) vs hoje:** ${f(M('flash-current'))} → ${f(M('pro-plus-tuned'))} (Δ ${f(M('pro-plus-tuned') - M('flash-current'))})\n`;

writeFileSync(here('SCORECARD.md'), md);
console.log(md);

// machine summary
const summary = order.map((c) => ({ config: c, overall: +f(mean(agg[c].overall)), wins: wins[c] }));
writeFileSync(here('judge/summary.json'), JSON.stringify(summary, null, 2));
