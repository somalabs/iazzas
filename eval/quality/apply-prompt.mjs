// Replaces the promptPrefix block(s) in librechat.yaml with the v2-prod prompt,
// auto-extracting the exact existing block (whitespace-safe). Writes in place.
// Backup must already exist. Reports replacement count; aborts if not exactly 2.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YAML = resolve(__dirname, '../../librechat.yaml');
const promptName = process.argv[2] || 'iazzas-v11';
const v2 = readFileSync(resolve(__dirname, `prompts/${promptName}.txt`), 'utf8').replace(/\n+$/, '');
console.log('aplicando prompt:', promptName);

const raw = readFileSync(YAML, 'utf8');
const lines = raw.split('\n');

// Find first promptPrefix block content (lines indented >=10 spaces or blank), capture exactly.
const idx = lines.findIndex((l) => /^\s*promptPrefix:\s*\|/.test(l));
if (idx === -1) throw new Error('promptPrefix não encontrado');
let end = idx + 1;
const block = [];
while (end < lines.length && (lines[end].trim() === '' || /^ {10}/.test(lines[end]))) {
  block.push(lines[end]);
  end++;
}
// Trim trailing blank lines from captured block (keep them in the file as separators).
while (block.length && block[block.length - 1].trim() === '') block.pop();
const OLD = block.join('\n');

// Build NEW: v2-prod indented 10 spaces (blank lines stay empty).
const NEW = v2
  .split('\n')
  .map((l) => (l.trim() === '' ? '' : '          ' + l))
  .join('\n');

const count = raw.split(OLD).length - 1;
console.log('ocorrências do bloco atual:', count);
if (count !== 2) {
  console.error('ABORT: esperava 2 ocorrências idênticas (flash+pro). Não vou escrever.');
  process.exit(1);
}
const out = raw.split(OLD).join(NEW);
writeFileSync(YAML, out);
console.log('promptPrefix substituído nos 2 specs. Bytes:', raw.length, '->', out.length);
