// LEM-38 — mobile + regressão /c/new + zero pageerror
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
const email = 'qa.lem38.1779071840290@example.com';
const pw = 'QaLem38!pw';
const log = (...a) => console.log('[reg]', ...a);
const errs = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 1440, height: 900 } });
const api = ctx.request;
log('reuse existing user');
const lg = await api.post(`${BASE}/api/auth/login`, { data: { email, password: pw } });
log('login', lg.status());

const page = await ctx.newPage();
page.on('pageerror', (e) => { errs.push(String(e)); log('PAGEERROR', String(e)); });

// regression: /c/new loads + composer responds
await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const composer = page.locator('textarea, form [contenteditable=true]').first();
log('chat composer count', await composer.count());
await page.screenshot({ path: `${EV}/studio-flow-regression-chat.png` });
try {
  await composer.fill('ping de regressão QA');
  await page.waitForTimeout(500);
  await composer.press('Enter');
  await page.waitForTimeout(6000);
} catch (e) { log('compose err', String(e).slice(0, 120)); }
await page.screenshot({ path: `${EV}/studio-flow-regression-chat-sent.png` });
const bodyTxt = await page.locator('body').innerText().catch(() => '');
log('jargon leak?', /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(bodyTxt));
log('msg rendered?', /regress/i.test(bodyTxt));

// agent builder side panel intact (open right panel via nav)
await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const builderPresent = await page.locator('[data-testid*="nav"], nav, aside').count();
log('layout regions present', builderPresent);

// mobile studio
const mctx = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 390, height: 844 }, isMobile: true });
await mctx.addCookies(await ctx.cookies());
const mp = await mctx.newPage();
mp.on('pageerror', (e) => { errs.push('mobile:' + String(e)); log('PAGEERROR(mobile)', String(e)); });
await mp.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
await mp.waitForTimeout(5500);
await mp.screenshot({ path: `${EV}/studio-flow-mobile-canvas.png` });
log('mobile studio shot');
await mp.getByRole('button', { name: /Histórico/i }).first().click().catch(() => {});
await mp.waitForTimeout(2000);
await mp.screenshot({ path: `${EV}/studio-flow-mobile-runs.png` });
await mp.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
await mp.waitForTimeout(4000);
await mp.screenshot({ path: `${EV}/studio-flow-mobile-chat.png` });
log('mobile chat shot');

log('=== PAGEERRORS', errs.length, JSON.stringify(errs).slice(0, 500));
await browser.close();
log('DONE');
