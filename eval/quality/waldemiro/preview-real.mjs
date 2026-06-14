// Renders the REAL moodboard as it was built on the Miro board: same coordinates,
// but with the actual product photos embedded (base64) so it can be eyeballed
// locally. Reads farm-ops.json (coords) + /tmp/wm/<ref>.jpg (downloaded+resized).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { buildLayout } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const COLOR_HEX = {
  light_green: '#cef0c8', cyan: '#bfe8ec', light_pink: '#f5cde3', pink: '#ef9ecb',
  green: '#5fb988', red: '#f1736b', light_yellow: '#fff3b0',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dims = (f) => {
  const out = execSync(`sips -g pixelWidth -g pixelHeight "${f}"`).toString();
  return { w: +out.match(/pixelWidth: (\d+)/)[1], h: +out.match(/pixelHeight: (\d+)/)[1] };
};

const TITULO = process.env.WM_TITULO || 'Moodboard FARM — Coleção Verão / Alto Verão 26';
const LEGENDA = process.env.WM_LEGENDA || 'Indicadores por produto: unidades vendidas · receita (R$)   |   fonte: BigQuery silver_linx';
const PRODUCTS_FILE = process.argv[2] || here('farm-products.json');
const PHOTO_DIR = process.argv[3] || '/tmp/wm';
const products = JSON.parse(readFileSync(PRODUCTS_FILE, 'utf8'));
const layout = buildLayout(products, { frame: true, titulo: TITULO, legenda: LEGENDA });
const { linhasDict, colunasDict, products: placed, config: C } = layout;

const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
const grow = (x, y, w, h) => { box.minX = Math.min(box.minX, x - w / 2); box.maxX = Math.max(box.maxX, x + w / 2); box.minY = Math.min(box.minY, y - h / 2); box.maxY = Math.max(box.maxY, y + h / 2); };
const els = [];

for (const p of placed) {
  const f = `${PHOTO_DIR}/${p.refCor}.jpg`;
  let w = C.imgWidth, h = C.alturaImg;
  if (existsSync(f)) {
    const d = dims(f);
    w = d.w; h = d.h;
    const b64 = readFileSync(f).toString('base64');
    grow(p.x, p.yImg, w, h);
    els.push(`<image x="${p.x - w / 2}" y="${p.yImg - h / 2}" width="${w}" height="${h}" href="data:image/jpeg;base64,${b64}"/>`);
  } else {
    grow(p.x, p.yImg, w, h);
    els.push(`<rect x="${p.x - w / 2}" y="${p.yImg - h / 2}" width="${w}" height="${h}" fill="#e8e8e8" stroke="#bbb"/>`);
  }
  els.push(`<text x="${p.x}" y="${p.yLeg}" font-size="15" fill="#444" text-anchor="middle" font-family="sans-serif">${esc(p.refCor)}</text>`);
  if (p.sub) els.push(`<text x="${p.x}" y="${p.ySub + 22}" font-size="22" fill="#111" text-anchor="middle" font-family="sans-serif" font-weight="600">${esc(p.sub)}</text>`);
  if (p.indicadores) els.push(`<text x="${p.x}" y="${p.yInd + 24}" font-size="18" fill="#0a7d4b" text-anchor="middle" font-family="sans-serif" font-weight="600">${esc(p.indicadores)}</text>`);
  if (p.postit) {
    grow(p.postX, p.postY, 120, 120);
    els.push(`<rect x="${p.postX - 60}" y="${p.postY - 60}" width="120" height="120" fill="${COLOR_HEX.light_yellow}" stroke="#e0c200"/>`);
    els.push(`<text x="${p.postX}" y="${p.postY + 8}" font-size="26" fill="#7a6500" text-anchor="middle" font-family="sans-serif" font-weight="bold">${esc(p.postit)}</text>`);
  }
}
const label = (d, color) => {
  grow(d.horizSticker, d.vertSticker, 400, 400);
  els.push(`<rect x="${d.horizSticker - 200}" y="${d.vertSticker - 200}" width="400" height="400" rx="14" fill="${color}" stroke="#0002"/>`);
  els.push(`<text x="${d.horizSticker}" y="${d.vertSticker + 14}" font-size="46" fill="#222" text-anchor="middle" font-family="sans-serif" font-weight="bold">${esc(d.sticker)}</text>`);
};
const RC = ['#cef0c8', '#bfe8ec', '#f5cde3', '#ef9ecb'];
const CC = ['#5fb988', '#f1736b'];
Object.values(linhasDict).forEach((r, k) => label(r, RC[k % RC.length]));
Object.values(colunasDict).forEach((c, k) => label(c, CC[k % CC.length]));

// enclosing frame (Miro-style titled container) around the content
const fpad = 120;
const fx0 = box.minX - fpad, fy0 = box.minY - fpad, fx1 = box.maxX + fpad, fy1 = box.maxY + fpad;
els.unshift(`<rect x="${fx0}" y="${fy0}" width="${fx1 - fx0}" height="${fy1 - fy0}" rx="24" fill="#fbfbfa" stroke="#d6d2cc" stroke-width="3"/>`);
els.push(`<text x="${fx0 + 24}" y="${fy0 - 34}" font-size="60" fill="#1a1a1a" font-family="sans-serif" font-weight="bold">${esc(TITULO)}</text>`);
els.push(`<text x="${fx0 + 28}" y="${fy0 + 64}" font-size="30" fill="#777" font-family="sans-serif">${esc(LEGENDA)}</text>`);
box.minY = fy0 - 130; // include the title above the frame

const pad = 90;
const w = box.maxX - box.minX + pad * 2;
const h = box.maxY - box.minY + pad * 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX - pad} ${box.minY - pad} ${w} ${h}" width="${Math.round(w / 2.2)}" height="${Math.round(h / 2.2)}">
<rect x="${box.minX - pad}" y="${box.minY - pad}" width="${w}" height="${h}" fill="#fbfbfa"/>
${els.join('\n')}
</svg>`;
writeFileSync(here('board-real.svg'), svg);
console.log('board-real.svg escrito');
