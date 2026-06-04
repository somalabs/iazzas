/**
 * Captura o app inteiro em modo escuro (e light p/ comparação) nas telas-chave.
 *   node e2e/shoot-dark.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = 'http://localhost:3090';
const OUT = path.join(process.cwd(), 'e2e', 'qa-evidence', 'darkmode');
const log = (...a) => console.log(...a);

const ROUTES = [
  ['chat', '/c/new', '#prompt-textarea'],
  ['agentes', '/d/agents', 'body'],
  ['studio', '/d/studio', 'body'],
  ['automacoes', '/d/flows', 'body'],
];

async function shoot(ctx, theme) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log('[PAGEERROR]', theme, e.message));
  // forçar tema antes de qualquer render
  await p.addInitScript((t) => {
    try { localStorage.setItem('color-theme', t); } catch {}
  }, theme);
  for (const [name, route, sel] of ROUTES) {
    try {
      await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector(sel, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(1800);
      const cls = await p.evaluate(() => document.documentElement.className);
      const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      await p.screenshot({ path: path.join(OUT, `${theme}-${name}.png`), fullPage: false });
      log(`${theme}/${name}: html.class="${cls}" body.bg=${bg}`);
    } catch (e) {
      log(`${theme}/${name} FAIL`, e.message);
    }
  }
  await p.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({
    baseURL: BASE,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const login = await ctx.request.post(`${BASE}/api/auth/login`, {
    data: { email: 'abitlemos@gmail.com', password: '12345678' },
  });
  log('login status:', login.status());

  await shoot(ctx, 'dark');
  await shoot(ctx, 'light');

  await b.close();
  log('done ->', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
