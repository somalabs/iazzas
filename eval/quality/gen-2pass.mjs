// 2-pass executive writing: draft (few-shot prompt) -> refine (separate "elite editor" call).
// Tests whether a real two-call pipeline breaks the single-pass ceiling.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const tasks = JSON.parse(readFileSync(here('tasks-exec.json'), 'utf8'));
const draftSys = readFileSync(here('prompts/tour-fs2.txt'), 'utf8').trim();

const EDITOR = `Você é um editor executivo de elite. Recebe a tarefa original e um rascunho, e entrega a versão FINAL no padrão-ouro de escrita executiva:
- Conclusão/decisão na 1ª linha (BLUF); em e-mail de aprovação, o "ask" abre o texto.
- Respeite o limite de palavras à risca (conte).
- Recomendação = verbo de ação concreto; nunca "analisar/avaliar/monitorar".
- Zero clichê/jargão ("aproveitar a oportunidade", "de forma sustentável", "sinceras desculpas", "paciência e confiança", "alavancar", "sinergia", "robusto", "contraponto").
- Comunicado de mudança: inclua 1 linha de reasseguração/continuidade.
- Comunicado a cliente: assuma responsabilidade direta, sem culpar terceiros, sem clichê de SAC.
- Ao reescrever/condensar: preserve os fatos e termos da fonte.
Entregue SOMENTE o texto final, sem comentários.`;

async function gen2(task) {
  const d = await generate({ model: 'gemini-3.1-pro-preview', systemInstruction: draftSys, prompt: task.prompt, maxOutputTokens: 8192, thinkingLevel: 'high' });
  const refinePrompt = `Tarefa original:\n${task.prompt}\n\nRascunho a melhorar:\n${d.text}\n\nEntregue a versão final no padrão-ouro.`;
  const r = await generate({ model: 'gemini-3.1-pro-preview', systemInstruction: EDITOR, prompt: refinePrompt, maxOutputTokens: 8192, thinkingLevel: 'high' });
  return r.text || d.text;
}

const results = [];
for (const t of tasks) {
  let text = '', n = 0;
  do { text = await gen2(t); n++; } while ((!text || text.length < 5) && n < 3);
  results.push({ config: 'twopass', task: t.id, text, ok: !!text });
  process.stdout.write(`twopass/${t.id}: ${text.length}c\n`);
}
mkdirSync(here('results-2pass'), { recursive: true });
writeFileSync(here('results-2pass/run.json'), JSON.stringify(results, null, 2));
console.log('done -> results-2pass/run.json');
