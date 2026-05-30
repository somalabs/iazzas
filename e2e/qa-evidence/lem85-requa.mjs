import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3080';
const OUT = 'e2e/qa-evidence';
const EMAIL = 'qa.lem85@example.com';
const PW = 'Qa!Lem85Strong1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureAuth(ctx) {
  // register (ignore if exists), then login with 429 retry — via ctx.request (browser UA)
  try {
    await ctx.request.post(`${BASE}/api/auth/register`, {
      data: { name: 'QA Lem85', username: 'qalem85', email: EMAIL, password: PW, confirm_password: PW },
    });
  } catch {}
  for (let i = 0; i < 8; i++) {
    const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: EMAIL, password: PW } });
    if (r.status() === 200) return true;
    if (r.status() === 429) { console.log('login 429, retry'); await sleep(6000); continue; }
    console.log('login status', r.status());
    await sleep(1500);
  }
  return false;
}

async function bodyText(page) {
  return (await page.evaluate(() => document.body.innerText)).slice(0, 4000);
}

async function checkErrors(page, label) {
  const t = await page.evaluate(() => document.body.innerText);
  const bad = /Oops!|Cannot read properties|reading '|something went wrong/i.test(t);
  console.log(`  [${label}] errorBoundary=${bad}`);
  return bad;
}

const run = async () => {
  const browser = await chromium.launch();
  const findings = {};

  for (const vp of [{ name: 'desktop', w: 1366, h: 900 }, { name: 'mobile', w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const ok = await ensureAuth(ctx);
    console.log(`[${vp.name}] auth=${ok}`);
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // ---- /d/agentes (Defeito 1) ----
    await page.goto(`${BASE}/d/agentes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/lem85-${vp.name}-agentes.png`, fullPage: true });
    const agentesTxt = await bodyText(page);
    const hasExploreBtn = /Explorar marketplace/i.test(agentesTxt);
    const hasMktCopy = /marketplace/i.test(agentesTxt);
    const isLogin = /Welcome back|Email address|Sign up|Bem-vindo/i.test(agentesTxt);
    const agentesErr = await checkErrors(page, `${vp.name} agentes`);
    console.log(`  [agentes] login-screen=${isLogin} exploreBtn=${hasExploreBtn} mktWord=${hasMktCopy}`);

    // ---- /d/automacoes (Defeito 2) ----
    await page.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/lem85-${vp.name}-automacoes.png`, fullPage: true });
    const autoTxt = await bodyText(page);
    const hasStudioAgentes = /Studio de Agentes/i.test(autoTxt);
    const autoErr = await checkErrors(page, `${vp.name} automacoes`);
    console.log(`  [automacoes] "Studio de Agentes" visible=${hasStudioAgentes}`);

    findings[vp.name] = { auth: ok, isLogin, hasExploreBtn, hasMktCopy, agentesErr, hasStudioAgentes, autoErr, pageErrors };
    await ctx.close();
  }

  console.log('\n===SUMMARY===');
  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
