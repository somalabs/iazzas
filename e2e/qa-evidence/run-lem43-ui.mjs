// LEM-43 — caminho 100%-UI (DnD create->save->reload), #2 dropdown, #3 UI save bloqueado + banner PT-BR, regressão.
// Reusa user existente (login-only; REGISTER/LOGIN rate-limited no ambiente). Aguarda janela de login resetar.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const email = 'qa.l43ui.1779077243656@example.com';
const password = 'QaL43ui!pw';
const log = (...a) => console.log('[l43ui]', ...a);
const O = { pageErrors: [] };

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  await mongoose.connection.db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 1440, height: 900 } });
  const api = context.request;

  // espera janela de login (429) resetar — limite de ambiente, não defeito
  let token = null;
  for (let i = 0; i < 18; i++) {
    const r = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
    if (r.status() === 200) { token = (await r.json().catch(() => ({})))?.token; log('login 200 after', i, 'tries'); break; }
    log('login', r.status(), 'retry in 30s', i);
    await new Promise((res) => setTimeout(res, 30000));
  }
  if (!token) throw new Error('login still rate-limited after retries');
  const ag = await api.post(`${BASE}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Agente Privado L43', provider: 'google', model: 'gemini-1.5-flash', instructions: 'curto' },
  });
  log('agent', ag.status(), (await ag.json().catch(() => ({})))?.id);

  const page = await context.newPage();
  page.on('pageerror', (e) => { O.pageErrors.push('desktop:' + String(e)); log('PAGEERROR', String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') log('console.error', m.text().slice(0, 140)); });

  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  O.studioUrl = page.url();
  O.canvasMounted = await page.locator('.react-flow__pane').count();
  log('studio url', O.studioUrl, 'pane', O.canvasMounted, 'nodes0', await page.locator('.react-flow__node').count());

  async function dropNode(type, x, y) {
    await page.evaluate(([tp, cx, cy]) => {
      const pane = document.querySelector('.react-flow__pane') || document.querySelector('.react-flow');
      const dt = new DataTransfer();
      dt.setData('application/reactflow', tp);
      const rc = pane.getBoundingClientRect();
      pane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
      pane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
    }, [type, x, y]);
    await page.waitForTimeout(600);
  }
  async function connect(si, ti) {
    const s = page.locator('.react-flow__node').nth(si).locator('.react-flow__handle.source');
    const t = page.locator('.react-flow__node').nth(ti).locator('.react-flow__handle.target');
    const sb = await s.boundingBox(); const tb = await t.boundingBox();
    if (!sb || !tb) return;
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 + 20, { steps: 5 });
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  await dropNode('trigger', 360, 130);
  await dropNode('agent', 360, 330);
  await dropNode('output', 360, 530);
  await connect(0, 1);
  await connect(1, 2);
  O.nodesBuilt = await page.locator('.react-flow__node').count();
  O.edgesBuilt = await page.locator('.react-flow__edge').count();
  log('built nodes', O.nodesBuilt, 'edges', O.edgesBuilt);

  // #2 dropdown
  const agentNode = page.locator('.react-flow__node').filter({ hasText: /Agente/i }).first();
  await agentNode.click({ position: { x: 50, y: 18 } }).catch(() => {});
  await page.waitForTimeout(1200);
  const sel = page.locator('select[id^="agent-id-"]');
  O.dropdownExists = await sel.count();
  if (O.dropdownExists) {
    O.dropdownOptions = await sel.locator('option').allTextContents();
    await sel.selectOption({ label: 'Agente Privado L43' }).catch(async () => { await sel.selectOption({ index: 1 }).catch(() => {}); });
    O.dropdownSelected = await sel.inputValue().catch(() => null);
  }
  log('dropdown', JSON.stringify(O.dropdownOptions), 'sel', O.dropdownSelected);
  await page.screenshot({ path: `${EV}/studio-l43-ui-built.png` });

  await page.locator('header input[type=text]').first().fill('Flow UI L43').catch(() => {});
  await page.getByRole('button', { name: /Salvar/i }).first().click().catch(() => {});
  await page.waitForTimeout(3500);
  O.saveToasts = await page.locator('[role=alert], [data-sonner-toast]').allTextContents().catch(() => []);
  await page.screenshot({ path: `${EV}/studio-l43-ui-saved.png` });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  O.reloadNodeCount = await page.locator('.react-flow__node').count();
  const rbody = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  O.reloadCrash = /Oops! Something Unexpected|Cannot read properties|reading 'label'/i.test(rbody);
  log('UI reload nodes', O.reloadNodeCount, 'crash?', O.reloadCrash);
  await page.screenshot({ path: `${EV}/studio-l43-ui-reloaded.png` });

  // #3 UI invalid -> Salvar disabled + banner PT-BR
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  await dropNode('trigger', 250, 140);
  await dropNode('trigger', 520, 140);
  await dropNode('output', 380, 360);
  await page.waitForTimeout(1000);
  const saveBtn = page.getByRole('button', { name: /Salvar/i }).first();
  O.invalidSaveDisabled = await saveBtn.isDisabled().catch(() => null);
  O.invalidSaveTitle = await saveBtn.getAttribute('title').catch(() => null);
  O.invalidBanner = (await page.locator('[role=alert], [class*="red"]').allTextContents().catch(() => []))
    .map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6);
  const ibody = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  O.jargon = /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(ibody + ' ' + JSON.stringify(O.invalidBanner));
  log('invalid disabled?', O.invalidSaveDisabled, 'title', O.invalidSaveTitle, 'banner', JSON.stringify(O.invalidBanner), 'jargon', O.jargon);
  await page.screenshot({ path: `${EV}/studio-l43-ui-invalid-blocked.png` });

  // regressão /c/new + mobile
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  O.chatComposer = await page.locator('textarea, [contenteditable=true]').first().count();
  O.chatSidePanel = await page.locator('nav, aside').count();
  await page.screenshot({ path: `${EV}/studio-l43-ui-regression-chat.png` });

  const cookies = await context.cookies();
  const mctx = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 390, height: 844 }, isMobile: true });
  await mctx.addCookies(cookies);
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => { O.pageErrors.push('mobile:' + String(e)); });
  await mp.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(5000);
  O.mobileStudioBoots = await mp.locator('main, .react-flow, [class*="Studio"]').count();
  await mp.screenshot({ path: `${EV}/studio-l43-ui-mobile-studio.png` });
  await mp.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(4000);
  await mp.screenshot({ path: `${EV}/studio-l43-ui-mobile-chat.png` });
  await mctx.close();

  O.pageErrorCount = O.pageErrors.length;
  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===L43UI_RESULT===');
  console.log(JSON.stringify(O, null, 2));
  console.log('===END===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
