// Runs the lever matrix: every config x every task -> Gemini -> results/run.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generate } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const configs = JSON.parse(readFileSync(here('configs.json'), 'utf8'));
const tasks = JSON.parse(readFileSync(here('tasks.json'), 'utf8'));
const promptCache = {};
const loadPrompt = (name) =>
  (promptCache[name] ??= readFileSync(here(`prompts/${name}.txt`), 'utf8').trim());

mkdirSync(here('results'), { recursive: true });

// Incremental: keep existing results, only generate missing (config,task) pairs.
let existing = [];
try {
  existing = JSON.parse(readFileSync(here('results/run.json'), 'utf8'));
} catch {
  existing = [];
}
const present = new Set(existing.map((r) => `${r.config}__${r.task}`));

const CONCURRENCY = 4;
const jobs = [];
for (const cfg of configs) {
  for (const task of tasks) {
    if (present.has(`${cfg.id}__${task.id}`)) continue;
    jobs.push({ cfg, task });
  }
}
console.log(`${existing.length} existentes, ${jobs.length} novas gerações.`);

async function runJob({ cfg, task }, attempt = 1) {
  const r = await generate({
    model: cfg.model,
    systemInstruction: loadPrompt(cfg.prompt),
    prompt: task.prompt,
    temperature: cfg.temperature,
    maxOutputTokens: cfg.maxOutputTokens,
    thinkingBudget: cfg.thinkingBudget,
    thinkingLevel: cfg.thinkingLevel,
  });
  if (!r.ok && attempt < 3) {
    await new Promise((res) => setTimeout(res, 1500 * attempt));
    return runJob({ cfg, task }, attempt + 1);
  }
  return {
    config: cfg.id,
    model: cfg.model,
    task: task.id,
    category: task.category,
    prompt: task.prompt,
    checks: task.checks,
    ok: r.ok,
    ms: r.ms,
    finishReason: r.finishReason,
    usage: r.usage,
    error: r.error,
    text: r.text ?? '',
  };
}

const results = [];
let idx = 0;
let done = 0;
async function worker() {
  while (idx < jobs.length) {
    const my = jobs[idx++];
    const out = await runJob(my);
    results.push(out);
    done++;
    process.stdout.write(
      `[${done}/${jobs.length}] ${out.config} / ${out.task} -> ${out.ok ? 'ok' : 'ERR'} ` +
        `(${out.ms}ms, out=${out.usage?.output}, think=${out.usage?.thoughts})\n`,
    );
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const merged = [...existing, ...results];
merged.sort((a, b) => a.task.localeCompare(b.task) || a.config.localeCompare(b.config));
writeFileSync(here('results/run.json'), JSON.stringify(merged, null, 2));

const errs = results.filter((r) => !r.ok);
console.log(`\nDone. ${results.length} generations, ${errs.length} errors.`);
if (errs.length) console.log('Errors:', errs.map((e) => `${e.config}/${e.task}: ${e.error}`).join('\n'));
console.log('Wrote results/run.json');
