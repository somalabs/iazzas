// Waldemiro deterministic builder (the "tool" core). Takes a product source —
// a products.json OR a filled standard spreadsheet (.xlsx/.csv) — and produces the
// Miro operations to build the moodboard: a layout_create DSL (labels, captions,
// indicators, post-its, header) + image_create calls (photos, with redirects
// pre-resolved to final CDN URLs). The model/agent layer only curates the product
// list; this engine owns the layout math so coordinates are never guessed.
//
// Usage:
//   node build.mjs --in farm-products.json --titulo "..." --legenda "..." --out farm-ops.json
//   node build.mjs --in modelo-waldemiro.xlsx --out ops.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';
import { buildLayout, toMiroOps, validate } from './gen.mjs';
import { readSheet } from './sheet.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  return a;
}

function loadProducts(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.json') return JSON.parse(readFileSync(path, 'utf8'));
  if (['.xlsx', '.xls', '.csv'].includes(ext)) return readSheet(path);
  throw new Error(`fonte não suportada: ${ext} (use .json, .xlsx, .xls ou .csv)`);
}

async function resolveImageUrls(images) {
  for (const im of images) {
    try {
      const r = await fetch(im.url, { redirect: 'follow' });
      im.finalUrl = r.ok ? r.url : im.url;
      im.photoOk = r.ok && (r.headers.get('content-type') || '').startsWith('image');
    } catch {
      im.finalUrl = im.url;
      im.photoOk = false;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inPath = args.in;
  if (!inPath) {
    console.error('uso: node build.mjs --in <products.json|planilha.xlsx> [--titulo "..."] [--legenda "..."] [--brand 2] [--out ops.json]');
    process.exit(1);
  }
  const products = loadProducts(resolve(process.cwd(), inPath));
  const opts = { titulo: args.titulo, legenda: args.legenda };
  if (args.brand) opts.brand = Number(args.brand);

  const layout = buildLayout(products, opts);
  const v = validate(layout);
  const ops = toMiroOps(layout);
  await resolveImageUrls(ops.images);

  const missing = ops.images.filter((im) => im.photoOk === false).map((im) => im.ref);
  const out = {
    summary: { produtos: products.length, grade_colunas: layout.largura, linhas: layout.ordemLinhas, colunas: layout.ordemColunas, fotos_faltando: missing },
    validate: v,
    layoutDsl: ops.layoutDsl,
    images: ops.images.map((im) => ({ ref: im.ref, x: im.x, y: im.y, width: im.width, url: im.finalUrl, photoOk: im.photoOk })),
  };
  const outPath = args.out || here('ops.json');
  writeFileSync(resolve(process.cwd(), outPath), JSON.stringify(out, null, 2));
  console.error(`${products.length} produtos · grade ${layout.largura} col · validação ${v.ok ? 'OK' : 'FALHAS: ' + v.issues.join('; ')}`);
  if (missing.length) console.error(`⚠ fotos não resolvidas: ${missing.join(', ')}`);
  console.error(`ops -> ${outPath} (${ops.images.length} fotos, ${ops.layoutDsl.split('\n').length} itens de layout)`);
}

main();
