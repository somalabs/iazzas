// Renders a Waldemiro layout to a standalone SVG so the board can be eyeballed and
// iterated WITHOUT a live Miro board. Photos = placeholder rects with the ref label;
// row/col labels = colored sticky squares; legend/subtitle = text; post-its = small
// yellow squares. Coordinates are the same board-absolute values the Miro ops use.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildLayout, toMiroOps } from './gen.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);

const COLOR_HEX = {
  light_green: '#cef0c8', cyan: '#bfe8ec', light_pink: '#f5cde3', pink: '#ef9ecb',
  violet: '#d0c3f5', green: '#5fb988', red: '#f1736b', light_blue: '#9ec8ef',
  dark_blue: '#3b6ab5', orange: '#f0a64b', light_yellow: '#fff3b0', yellow: '#fbe26a',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderSvg(layout) {
  const { linhasDict, colunasDict, products, config: C } = layout;
  const els = [];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (x, y, w, h) => {
    box.minX = Math.min(box.minX, x - w / 2); box.maxX = Math.max(box.maxX, x + w / 2);
    box.minY = Math.min(box.minY, y - h / 2); box.maxY = Math.max(box.maxY, y + h / 2);
  };

  // photos + legend + subtitle + post-it
  for (const p of products) {
    grow(p.x, p.yImg, C.imgWidth, C.alturaImg);
    els.push(`<rect x="${p.x - C.imgWidth / 2}" y="${p.yImg - C.alturaImg / 2}" width="${C.imgWidth}" height="${C.alturaImg}" fill="#e8e8e8" stroke="#bbb" stroke-width="2"/>`);
    els.push(`<text x="${p.x}" y="${p.yImg}" font-size="20" fill="#999" text-anchor="middle" font-family="sans-serif">${esc(p.refCor)}</text>`);
    els.push(`<text x="${p.x}" y="${p.yLeg}" font-size="16" fill="#333" text-anchor="middle" font-family="sans-serif" font-weight="bold">${esc(p.refCor)}</text>`);
    if (p.sub) els.push(`<text x="${p.x}" y="${p.ySub + 20}" font-size="20" fill="#111" text-anchor="middle" font-family="sans-serif">${esc(p.sub)}</text>`);
    if (p.postit) {
      grow(p.postX, p.postY, 120, 120);
      els.push(`<rect x="${p.postX - 60}" y="${p.postY - 60}" width="120" height="120" fill="${COLOR_HEX.light_yellow}" stroke="#e0c200"/>`);
      els.push(`<text x="${p.postX}" y="${p.postY + 6}" font-size="22" fill="#7a6500" text-anchor="middle" font-family="sans-serif" font-weight="bold">${esc(p.postit)}</text>`);
    }
  }
  // row + column label stickies
  const label = (d, k, seed) => {
    grow(d.horizSticker, d.vertSticker, 400, 400);
    const color = COLOR_HEX[layout.config.labelColors[(k + seed) % layout.config.labelColors.length]] || '#ddd';
    els.push(`<rect x="${d.horizSticker - 200}" y="${d.vertSticker - 200}" width="400" height="400" rx="12" fill="${color}" stroke="#0002"/>`);
    els.push(`<text x="${d.horizSticker}" y="${d.vertSticker + 10}" font-size="44" fill="#222" text-anchor="middle" font-family="sans-serif" font-weight="bold">${esc(d.sticker)}</text>`);
  };
  Object.values(linhasDict).forEach((r, k) => label(r, k, 0));
  Object.values(colunasDict).forEach((c, k) => label(c, k, 5));

  const pad = 120;
  const w = box.maxX - box.minX + pad * 2;
  const h = box.maxY - box.minY + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX - pad} ${box.minY - pad} ${w} ${h}" width="${Math.round(w / 2)}" height="${Math.round(h / 2)}">
<rect x="${box.minX - pad}" y="${box.minY - pad}" width="${w}" height="${h}" fill="#fbfbfa"/>
${els.join('\n')}
</svg>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] || here('sample-products.json');
  const products = JSON.parse(readFileSync(file, 'utf8'));
  const layout = buildLayout(products);
  const svg = renderSvg(layout);
  const out = process.argv[3] || here('board-preview.svg');
  writeFileSync(out, svg);
  const ops = toMiroOps(layout);
  console.log(`preview -> ${out} | ${products.length} produtos, grade ${layout.largura} col, ${ops.images.length} fotos`);
}
