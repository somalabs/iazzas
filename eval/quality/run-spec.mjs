// Focused specialization runner: runs ONLY the baseline vs specialized config over a
// given task file (text, no tools). Default: executive-writing (tasks-exec.json).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const tasksFile = process.argv[2] || 'tasks-exec.json';
const outDir = process.argv[3] || 'results-spec';
const tasks = JSON.parse(readFileSync(here(tasksFile), 'utf8'));

const CONFIGS = [
  { id: 'prod-current', model: 'gemini-3.1-pro-preview', prompt: 'prod-current', thinkingLevel: 'high' },
  { id: 'prod-plus', model: 'gemini-3.1-pro-preview', prompt: 'prod-plus', thinkingLevel: 'high' },
];
const loadPrompt = (n) => readFileSync(here(`prompts/${n}.txt`), 'utf8').trim();

mkdirSync(here(outDir), { recursive: true });
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
      maxOutputTokens: 8192,
      thinkingLevel: cfg.thinkingLevel,
    });
    results.push({ config: cfg.id, task: t.id, category: t.category, prompt: t.prompt, checks: t.checks, ok: r.ok, text: r.text ?? '', error: r.error });
    process.stdout.write(`${cfg.id}/${t.id}: ${r.ok ? 'ok' : 'ERR ' + r.error} (${(r.text || '').length} chars)\n`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.task.localeCompare(b.task) || a.config.localeCompare(b.config));
writeFileSync(here(`${outDir}/run.json`), JSON.stringify(results, null, 2));
console.log(`\nDone. ${results.length} gerações -> ${outDir}/run.json`);
