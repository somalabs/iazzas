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
  // No forced locale — validate the real default rendering (en bundle now carries PT-BR values per product decision)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  await ctx.addInitScript(() => {
    localStorage.setItem('navVisible', 'true');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. Studio desktop
  await page.goto(`${BASE}/d/studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  let body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  log('studio body head:', JSON.stringify(body.slice(0, 200)));
  await shot(page, 'studio-r3-desktop-initial');

  if (/Welcome back|Email address|Sign in/i.test(body)) {
    log('!! NOT AUTHENTICATED - on login page');
    await browser.close();
    process.exit(2);
  }

  // 2. UC selector — go to pattern (UC2 -> Nano Banana 2)
  await shot(page, 'studio-r3-desktop-usecases');
  const uc2 = page.locator('button').filter({ hasText: /Estampa|Pattern/i }).first();
  if (await uc2.count()) {
    await uc2.click().catch(() => {});
    await page.waitForTimeout(1200);
  }

  // 3. Advanced mode — DEFECT 1 (F13) + DEFECT 2 (jargon)
  const adv = page.locator('button, [role="switch"], label').filter({ hasText: /Advanced|Avan/i }).first();
  if (await adv.count()) {
    await adv.click().catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, 'studio-r3-advanced-mode');
    const advText = await page.evaluate(() => document.body.innerText);
    const leak = /stream tech|tech stream|será ativado pelo stream|wired by tech|TODO\(tech\)/i.test(advText);
    const sel = page.locator('#studio-model-override');
    const selCount = await sel.count();
    const disabled = selCount ? await sel.isDisabled().catch(() => null) : null;
    const optionCount = selCount ? await sel.locator('option').count() : 0;
    const valBefore = selCount ? await sel.inputValue() : null;
    // Exercise F13: pick a concrete model option
    let valAfter = null, changed = null;
    if (selCount && !disabled && optionCount > 1) {
      const optVals = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value));
      const target = optVals.find((v) => v && v.length);
      if (target) {
        await sel.selectOption(target);
        await page.waitForTimeout(400);
        valAfter = await sel.inputValue();
        changed = valAfter === target && valAfter !== valBefore;
      }
      await shot(page, 'studio-r3-advanced-model-selected');
    }
    log('DEFECT2 leak text present:', leak);
    log('DEFECT1 select count:', selCount, '| disabled:', disabled, '| options:', optionCount,
        '| valBefore:', valBefore, '| valAfter:', valAfter, '| changed:', changed);
  } else {
    log('Advanced toggle not found');
  }

  // 4. Generate flow — DEFECT 3 (error toast + error card visual + retry)
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
    await shot(page, 'studio-r3-before-generate');
    await genBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, 'studio-r3-generate-pending');
    await page.waitForTimeout(9000);
    const after = await page.evaluate(() => ({
      toasts: Array.from(document.querySelectorAll('[role="alert"],[role="status"],.toast,[data-sonner-toast],[class*="oast"]')).map((e) => e.textContent?.trim()).filter(Boolean),
      body: document.body.innerText.slice(0, 600),
      errorCardCount: document.querySelectorAll('[class*="red-"]').length,
      retryBtns: Array.from(document.querySelectorAll('button[aria-label],button[title]')).filter((b) => /Tentar novamente|retry/i.test(b.getAttribute('aria-label') + ' ' + b.getAttribute('title'))).length,
    }));
    await shot(page, 'studio-r3-generate-after');
    log('DEFECT3 toasts:', JSON.stringify(after.toasts));
    log('DEFECT3 redElements:', after.errorCardCount, '| retryBtns:', after.retryBtns);
    // Retry exercise
    const retry = page.locator('button[aria-label*="Tentar"], button[title*="Tentar"]').first();
    if (await retry.count()) {
      await retry.click().catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, 'studio-r3-after-retry');
      log('DEFECT3 retry clicked OK');
    } else {
      log('DEFECT3 no retry button found');
    }
  } else {
    log('Generate button not found');
  }

  // 5. Regression: chat
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const chatComposer = await page.locator('textarea, [contenteditable="true"]').count();
  log('chat composer elements:', chatComposer);
  await shot(page, 'studio-r3-regression-chat');

  // 6. Mobile — DEFECT 4 (drawer must start CLOSED and stay closed)
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mctx.addCookies(cookies);
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/d/studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(3000);
  const readPanel = () => mp.evaluate(() => {
    const p = document.getElementById('studio-panel');
    if (!p) return { state: 'no-panel' };
    const rect = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const overlay = document.querySelector('.fixed.inset-0.z-40');
    return {
      className: p.className.replace(/\s+/g, ' '),
      x: Math.round(rect.x), width: Math.round(rect.width),
      transform: cs.transform,
      visibleOnScreen: rect.x >= 0 && rect.x < 390,
      overlayPresent: !!overlay,
    };
  });
  const m1 = await readPanel();
  await mp.screenshot({ path: `${EV}/studio-r3-mobile-initial.png` });
  log('shot studio-r3-mobile-initial');
  log('MOBILE panel @load:', JSON.stringify(m1));
  // Confirm it is not just the first-render state: wait longer + force a resize re-render
  await mp.waitForTimeout(3000);
  await mp.setViewportSize({ width: 391, height: 844 });
  await mp.waitForTimeout(1500);
  const m2 = await readPanel();
  await mp.screenshot({ path: `${EV}/studio-r3-mobile-after-resettle.png` });
  log('MOBILE panel @resettle:', JSON.stringify(m2));
  const mBody = await mp.evaluate(() => document.body.innerText.slice(0, 200));
  log('mobile body head:', JSON.stringify(mBody.slice(0, 140)));

  await browser.close();
  log('pageerrors:', errors.length, JSON.stringify(errors.slice(0, 3)));
  log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
