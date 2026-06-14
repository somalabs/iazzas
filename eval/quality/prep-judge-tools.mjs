// Prepares anonymized BI-trajectory judge inputs from results-tools/run.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const results = JSON.parse(readFileSync(here('results-tools/run.json'), 'utf8'));
mkdirSync(here('judge-tools'), { recursive: true });

// Hoje = 2026-06-13. Comportamento esperado por tarefa (gabarito para o juiz).
const EXPECTED = {
  'bt01-vendas-loja':
    'Hoje é 13/06/2026, então setembro/2025 é PASSADO e há dados. Deve consultar e trazer as top 5 lojas com OS NÚMEROS RETORNADOS pela tool. Recusar alegando "data futura" é ERRO FACTUAL GRAVE. Não chamar tool nenhuma e não entregar dado é falha.',
  'bt02-markup-off':
    'Deve comparar o markup das marcas E sinalizar que o markup da Animale (2.61) está INFLADO pelos 34% de volume em fase OFF (regra de negócio: OFF tem custo amortizado). Ideal sugerir olhar a fase ON. Não sinalizar a armadilha do OFF é o principal erro possível.',
  'bt03-sss-farm':
    'SSS comparable: deve apresentar os 3 meses retornados e idealmente explicar/confirmar que só conta lojas presentes nos DOIS períodos (comparable). Não inventar números fora do retornado.',
  'bt04-quebra-ver25':
    'Resposta direta: top 3 produtos por quebra com os valores RETORNADOS pela tool. Sem inventar, sem enrolação.',
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
function shuffle(arr, seedStr) {
  const seed = [...seedStr].reduce((a, c) => a + c.charCodeAt(0), 0);
  return arr.map((v, i) => ({ v, k: (seed * 31 + i * 17) % 101 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}

const byTask = {};
for (const r of results) (byTask[r.task] ??= []).push(r);
const keymap = {};
const taskIds = [];
for (const [taskId, rows] of Object.entries(byTask)) {
  const shuffled = shuffle(rows, taskId);
  const candidates = shuffled.map((r, i) => ({
    anonId: LABELS[i],
    toolSeq: r.toolSeq,
    sql: r.sqlQueries,
    finalText: r.finalText,
  }));
  keymap[taskId] = Object.fromEntries(shuffled.map((r, i) => [LABELS[i], r.config]));
  writeFileSync(
    here(`judge-tools/${taskId}.json`),
    JSON.stringify({ id: taskId, prompt: rows[0].prompt, expected: EXPECTED[taskId], candidates }, null, 2),
  );
  taskIds.push(taskId);
}
writeFileSync(here('judge-tools/keymap.json'), JSON.stringify(keymap, null, 2));
console.log('Prepared BI judge inputs:', taskIds.join(', '));
