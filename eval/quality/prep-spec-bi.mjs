// Focused BI prep: only g31pro-v4 vs g31pro-v5 from results-tools, anonymized, with gabarito.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const results = JSON.parse(readFileSync(here('results-tools/run.json'), 'utf8')).filter(
  (r) => r.config === 'g31pro-v4' || r.config === 'g31pro-v5',
);
mkdirSync(here('judge-spec-bi'), { recursive: true });

const EXPECTED = {
  'bt01-vendas-loja': 'Hoje é jun/2026; set/2025 é passado e há dados. Consultar e trazer top 5 lojas com os números retornados. Recusar por "data futura" é erro grave.',
  'bt02-markup-off': 'Comparar markup E sinalizar que o markup da Animale (2.61) está inflado pelos 34% de volume em fase OFF (custo amortizado). Ideal recomendar olhar a fase ON.',
  'bt03-sss-farm': 'SSS comparable: apresentar os 3 meses retornados e explicar que só conta lojas presentes nos dois períodos. Não inventar.',
  'bt04-quebra-ver25': 'Top 3 produtos por quebra (quebra_valor) com os valores retornados. Direto, sem redefinir a métrica.',
};
const LABELS = ['A', 'B', 'C', 'D'];
function shuffle(arr, seed) {
  const s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return arr.map((v, i) => ({ v, k: (s * 31 + i * 13) % 97 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}
const byTask = {};
for (const r of results) (byTask[r.task] ??= []).push(r);
const keymap = {};
const taskIds = [];
for (const [taskId, rows] of Object.entries(byTask)) {
  const sh = shuffle(rows, taskId);
  writeFileSync(
    here(`judge-spec-bi/${taskId}.json`),
    JSON.stringify({ id: taskId, prompt: rows[0].prompt, expected: EXPECTED[taskId], candidates: sh.map((r, i) => ({ anonId: LABELS[i], toolSeq: r.toolSeq, sql: r.sqlQueries, finalText: r.finalText })) }, null, 2),
  );
  keymap[taskId] = Object.fromEntries(sh.map((r, i) => [LABELS[i], r.config]));
  taskIds.push(taskId);
}
writeFileSync(here('judge-spec-bi/keymap.json'), JSON.stringify(keymap, null, 2));
console.log('prep-spec-bi:', taskIds.join(', '));
