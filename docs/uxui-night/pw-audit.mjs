/* Playwright audit harness — drives the iazzas UI (frontend :3090).
 * Usage: node docs/uxui-night/pw-audit.mjs <email> <outdir> [tag]
 * Logs in via the real UI, visits Agent Studio + Automações, screenshots,
 * and probes the agent-creation customization surface. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3090';
const [email, outdir, tag = 'a'] = process.argv.slice(2);
const PASS = 'Test1234!';
mkdirSync(outdir, { recursive: true });

const log = (...a) => console.log(`[${tag}]`, ...a);
const shot = async (page, name) => {
  await page.screenshot({ path: `${outdir}/${name}.png`, fullPage: true });
  log('shot', name);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message.slice(0, 200)));

  // --- Login via UI ---
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', PASS);
  await shot(page, '00-login');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  log('after login url:', page.url());
  await shot(page, '01-after-login');

  // --- Agent Studio (Flows) ---
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  log('agent-studio url:', page.url());
  await shot(page, '10-agent-studio');

  // Try to surface the Agent node inspector: drag/click palette if present.
  const paletteAgent = page.locator('text=/Agente|Agent/i').first();
  if (await paletteAgent.count()) {
    await paletteAgent.click({ trial: false }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, '11-agent-studio-interact');
  }

  // --- Native agent builder reachability (sidebar in chat) ---
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, '20-chat-new');
  // Look for an agent builder / Agents side panel entry point
  const agentEntry = page.locator(
    '[aria-label*="gent" i], [data-testid*="agent" i], button:has-text("Agente"), button:has-text("Agent")',
  );
  log('agent entry-point candidates:', await agentEntry.count());

  // --- Automações ---
  await page.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  log('automacoes url:', page.url());
  await shot(page, '30-automacoes');

  log('console errors:', JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})().catch((e) => { console.error('PW ERR', e); process.exit(1); });
