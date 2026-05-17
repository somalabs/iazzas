import { chromium, request as pwRequest } from 'playwright';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const log = (...a) => console.log('[qa]', ...a);

const u = Date.now();
const USER = { name: 'QA Bot', username: `qa${u}`, email: `qa${u}@example.com`, password: 'QaPass!2345', confirm_password: 'QaPass!2345' };

async function authCookies() {
  const api = await pwRequest.newContext({ baseURL: BASE });
  const reg = await api.post('/api/auth/register', { data: USER });
  log('register status', reg.status());
  const login = await api.post('/api/auth/login', { data: { email: USER.email, password: USER.password } });
  log('login status', login.status());
  const state = await api.storageState();
  await api.dispose();
  return state.cookies;
}

async function shot(page, name) {
  await page.screenshot({ path: `${EV}/${name}.png`, fullPage: false });
  log('shot', name);
}

(async () => {
  const cookies = await authCookies();
  log('cookies captured', cookies.map((c) => c.name).join(',') || 'NONE');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(
    cookies,
  );
  await ctx.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en-US@posix');
    localStorage.setItem('navVisible', 'true');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. Studio desktop
  await page.goto(`${BASE}/d/studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  let body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  log('studio body head:', JSON.stringify(body.slice(0, 160)));
  await shot(page, 'studio-desktop-initial');

  if (/Welcome back|Email address|Sign in/i.test(body)) {
    log('!! NOT AUTHENTICATED - on login page');
    await browser.close();
    process.exit(2);
  }

  // 2. UC selector + forms
  const ucChips = await page.locator('button, [role="tab"]').filter({ hasText: /Variantes|Estampa|Modelo|Refer|Sketch|Color|Pattern/i }).count();
  log('UC-ish chips found:', ucChips);
  await shot(page, 'studio-desktop-usecases');

  // Try clicking the 2nd use case (pattern -> Nano Banana 2)
  const uc2 = page.locator('button').filter({ hasText: /Estampa|Pattern/i }).first();
  if (await uc2.count()) {
    await uc2.click().catch(() => {});
    await page.waitForTimeout(1200);
    await shot(page, 'studio-desktop-uc2-pattern');
  }

  // 3. Advanced mode (defects 1 & 2)
  const adv = page.locator('button, [role="switch"], label').filter({ hasText: /Advanced|Avan/i }).first();
  if (await adv.count()) {
    await adv.click().catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, 'studio-desktop-advanced');
    const advText = await page.evaluate(() => document.body.innerText);
    const leak = /stream tech|tech stream|será ativado pelo stream/i.test(advText);
    const sel = page.locator('select').first();
    const selCount = await sel.count();
    const disabled = selCount ? await sel.isDisabled().catch(() => null) : null;
    log('ADV leak text present:', leak, '| select count:', selCount, '| select disabled:', disabled);
  } else {
    log('Advanced toggle not found');
  }

  // 4. Generate flow (defect 3) — fill prompt, click generate
  const ta = page.locator('textarea, [contenteditable="true"]').first();
  if (await ta.count()) {
    await ta.click().catch(() => {});
    await ta.fill('vestido midi preto, variantes de cor').catch(async () => {
      await page.keyboard.type('vestido midi preto');
    });
  }
  await page.waitForTimeout(500);
  const genBtn = page.locator('button').filter({ hasText: /Generate|Gerar/i }).first();
  if (await genBtn.count()) {
    await shot(page, 'studio-desktop-before-generate');
    await genBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, 'studio-desktop-generate-pending');
    await page.waitForTimeout(7000);
    await shot(page, 'studio-desktop-generate-after');
    const after = await page.evaluate(() => ({
      toasts: Array.from(document.querySelectorAll('[role="alert"],[role="status"],.toast,[data-sonner-toast],[class*="oast"]')).map((e) => e.textContent?.trim()).filter(Boolean),
      body: document.body.innerText.slice(0, 600),
    }));
    log('AFTER GENERATE toasts:', JSON.stringify(after.toasts));
  } else {
    log('Generate button not found');
  }

  // 5. Regression: chat
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const chatComposer = await page.locator('textarea, [contenteditable="true"]').count();
  log('chat composer elements:', chatComposer);
  await shot(page, 'regression-chat-new');

  // 6. Mobile (defect 4) — drawer default state
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mctx.addCookies(cookies);
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/d/studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(4500);
  await mp.screenshot({ path: `${EV}/studio-mobile-initial.png` });
  log('shot studio-mobile-initial');
  const panelState = await mp.evaluate(() => {
    const p = document.getElementById('studio-panel');
    if (!p) return 'no-panel';
    const cls = p.className;
    const rect = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    return { className: cls, x: rect.x, width: rect.width, transform: cs.transform };
  });
  log('MOBILE panel state:', JSON.stringify(panelState));
  const mBody = await mp.evaluate(() => document.body.innerText.slice(0, 200));
  log('mobile body head:', JSON.stringify(mBody.slice(0, 140)));

  await browser.close();
  log('pageerrors:', errors.length, JSON.stringify(errors.slice(0, 3)));
  log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
