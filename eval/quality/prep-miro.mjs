// Builds blind per-task judge files for the Miro panel, comparing two configs.
// Usage: node prep-miro.mjs <cfgA-id> <cfgB-id>   (defaults: g31pro-v11 g31pro-v12miro)
// Reads results-miro/run.json directly. Each candidate = the emitted DSL (or, on the
// loose-text failure, the text answer flagged). A/B order alternates by index to
// balance position bias; the real config mapping is kept in keymap.json (short tags).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const [cfgA = 'g31pro-v11', cfgB = 'g31pro-v12miro'] = process.argv.slice(2);
const tagOf = (id) => id.replace(/^g31pro-/, '').replace(/miro$/, '');
const tagA = tagOf(cfgA);
const tagB = tagOf(cfgB);

const runs = JSON.parse(readFileSync(here('results-miro/run.json'), 'utf8'));
const tasks = JSON.parse(readFileSync(here('tasks-miro.json'), 'utf8'));
const get = (cfg, id) => runs.find((r) => r.config === cfg && r.task === id);
const dslOf = (r) => {
  const c = (r.trajectory || []).find((t) => t.tool === 'diagram_create' || t.tool === 'layout_create');
  return c ? c.args.diagram_dsl || c.args.dsl || '' : '';
};
const candText = (r) => {
  const dsl = dslOf(r);
  return dsl && dsl.trim()
    ? `[ferramenta: ${(r.toolSeq || []).join('>')}]\n${dsl}`
    : `[NÃO criou diagrama — respondeu em texto; ferramentas: ${(r.toolSeq || []).join('>') || '(nenhuma)'}]\n${(r.finalText || '').slice(0, 1200)}`;
};

const keymap = {};
for (const [i, t] of tasks.entries()) {
  const flip = i % 2 === 1;
  const slotA = flip ? tagB : tagA;
  const slotB = flip ? tagA : tagB;
  const cfgForSlotA = flip ? cfgB : cfgA;
  const cfgForSlotB = flip ? cfgA : cfgB;
  const candidates = [
    { anonId: 'A', text: candText(get(cfgForSlotA, t.id)) },
    { anonId: 'B', text: candText(get(cfgForSlotB, t.id)) },
  ];
  keymap[t.id] = { A: slotA, B: slotB };
  writeFileSync(
    here(`judge-miro/${t.id}.json`),
    JSON.stringify({ id: t.id, family: t.family, prompt: t.prompt, checks: t.checks, candidates }, null, 2),
  );
}
writeFileSync(here('judge-miro/keymap.json'), JSON.stringify(keymap, null, 2));
console.log(`prep-miro: ${tasks.length} tarefas, comparando ${tagA} (${cfgA}) vs ${tagB} (${cfgB}).`);
