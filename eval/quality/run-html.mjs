// HTML deliverable lab: generates each task with prod-current vs prod-html, extracts
// the HTML artifact (or detects a refusal), and saves a .html per (config,task) plus
// a run.json. HTML reports/decks are long -> high maxOutputTokens.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const tasks = JSON.parse(readFileSync(here('tasks-html.json'), 'utf8'));
const loadPrompt = (n) => readFileSync(here(`prompts/${n}.txt`), 'utf8').trim();

const CONFIGS = [
  { id: 'prod-current', model: 'gemini-3.1-pro-preview', prompt: 'prod-current' },
  { id: 'prod-html', model: 'gemini-3.1-pro-preview', prompt: 'prod-html' },
];

// Extract a self-contained HTML document from the model output.
function extractHtml(text) {
  if (!text) return { html: '', refused: false, hasHtml: false };
  const refused = /<cannot_answer/i.test(text) || /\bnão consigo gerar\b/i.test(text);
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  if (fence && /<(?:!doctype|html|body|section|div|style)/i.test(fence[1])) {
    return { html: fence[1].trim(), refused, hasHtml: true };
  }
  const doc = text.match(/<!doctype html[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  if (doc) return { html: doc[0], refused, hasHtml: true };
  // a bare fragment (sections/divs/style) still counts as HTML the artifact would render
  if (/<section[\s\S]*<\/section>/i.test(text) || /<div[\s\S]*<\/div>/i.test(text)) {
    const frag = text.replace(/```html?/gi, '').replace(/```/g, '').trim();
    return { html: frag, refused, hasHtml: true };
  }
  return { html: '', refused, hasHtml: false };
}

mkdirSync(here('results-html'), { recursive: true });
const jobs = [];
for (const cfg of CONFIGS) for (const t of tasks) jobs.push({ cfg, t });

const results = [];
let idx = 0;
async function worker() {
  while (idx < jobs.length) {
    const { cfg, t } = jobs[idx++];
    const r = await generate({
      model: cfg.model,
      systemInstruction: loadPrompt(cfg.prompt),
      prompt: t.prompt,
      maxOutputTokens: 32768,
      thinkingLevel: 'high',
    });
    const ex = extractHtml(r.text);
    const dir = here(`results-html/${cfg.id}`);
    mkdirSync(dir, { recursive: true });
    if (ex.hasHtml) writeFileSync(`${dir}/${t.id}.html`, ex.html);
    results.push({ config: cfg.id, task: t.id, type: t.type, kind: t.kind, prompt: t.prompt, checks: t.checks, ok: r.ok, error: r.error, hasHtml: ex.hasHtml, refused: ex.refused, htmlLen: ex.html.length, textLen: (r.text || '').length });
    process.stdout.write(`${cfg.id}/${t.id}: ${ex.hasHtml ? 'HTML ' + ex.html.length + 'c' : (ex.refused ? 'RECUSOU' : 'sem-html')}${r.error ? ' ERR ' + r.error : ''}\n`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.task.localeCompare(b.task) || a.config.localeCompare(b.config));
writeFileSync(here('results-html/run.json'), JSON.stringify(results, null, 2));
const refusedCount = results.filter((r) => !r.hasHtml).length;
console.log(`\nDone. ${results.length} gerações, ${refusedCount} sem HTML. -> results-html/run.json`);
