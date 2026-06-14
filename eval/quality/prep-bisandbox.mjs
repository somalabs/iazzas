// Prepares judge inputs for the BI sandbox (real SQL). One config (g31pro-v6) judged
// against the EXACT computed gabarito (numbers derived from the seeded DuckDB).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const resDir = process.argv[2] || 'results-bisandbox';
const judgeDir = process.argv[3] || 'judge-bisandbox';
const runs = JSON.parse(readFileSync(here(`${resDir}/run.json`), 'utf8'));
const gab = JSON.parse(readFileSync(here(`${resDir}/gabarito.json`), 'utf8'));
mkdirSync(here(judgeDir), { recursive: true });

const DESC = {
  'sb03-sss-farm': 'SSS comparable da Farm: variação % mês a mês usando SOMENTE lojas presentes nos dois períodos (mesmo mês de 2026 vs 2025). Lojas novas (que só existem em 2026) devem ser excluídas. Apresentar os meses dos últimos 3 meses (mar/abr/mai 2026). (Gabarito numérico não pré-computado; verifique coerência e a regra comparable.)',
};
const taskIds = [];
for (const r of runs) {
  const gabarito = gab[r.task] ? { valores_corretos: gab[r.task] } : { nota: DESC[r.task] || 'sem gabarito numérico' };
  writeFileSync(
    here(`${judgeDir}/${r.task}.json`),
    JSON.stringify({ id: r.task, prompt: r.prompt, gabarito, candidate: { toolSeq: r.toolSeq, sql: r.sqlQueries, finalText: r.finalText } }, null, 2),
  );
  taskIds.push(r.task);
}
writeFileSync(here(`${judgeDir}/taskids.json`), JSON.stringify(taskIds));
console.log('prep-bisandbox:', taskIds.join(', '));
