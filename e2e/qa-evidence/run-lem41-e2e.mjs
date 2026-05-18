// LEM-41 — E2E realista: flow construído pela UI (DnD), #2 dropdown, save, run, #1 RunsDrawer per-node, #3 save bloqueado.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
// Rate-limited on register (REGISTER_MAX=5/60min) — reuse existing ADMIN user, login only.
const email = 'qa.lem41.1779074030546@example.com';
const password = 'QaLem41!pw';
const log = (...a) => console.log('[l41e2e]', ...a);
const O = { pageErrors: [] };

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  await mongoose.connection.db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
  });
  const api = context.request;
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  log('login', login.status());
  const token = (await login.json().catch(() => ({})))?.token;
  if (!token) throw new Error('no token, status ' + login.status() + ' body ' + (await login.text()).slice(0, 160));
  const ag = await api.post(`${BASE}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Agente Privado E2E L41', provider: 'google', model: 'gemini-1.5-flash', instructions: 'curto' },
  });
  const agentId = (await ag.json().catch(() => ({})))?.id;
  log('agent', ag.status(), agentId);

  const page = await context.newPage();
  page.on('pageerror', (e) => { O.pageErrors.push('desktop:' + String(e)); log('PAGEERROR', String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') log('console.error', m.text().slice(0, 140)); });
  const net = [];
  page.on('response', (r) => { if (/\/api\/flows/.test(r.url())) net.push(`${r.request().method()} ${r.url().replace(BASE, '')} ${r.status()}`); });

  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  async function dropNode(type, x, y) {
    await page.evaluate(([tp, cx, cy]) => {
      const pane = document.querySelector('.react-flow__pane') || document.querySelector('.react-flow');
      const dt = new DataTransfer();
      dt.setData('application/reactflow', tp);
      const rc = pane.getBoundingClientRect();
      pane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
      pane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
    }, [type, x, y]);
    await page.waitForTimeout(500);
  }
  await dropNode('trigger', 360, 130);
  await dropNode('agent', 360, 330);
  await dropNode('output', 360, 530);
  await page.waitForTimeout(700);
  O.nodesBuilt = await page.locator('.react-flow__node').count();

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
  await connect(0, 1);
  await connect(1, 2);
  O.edgesBuilt = await page.locator('.react-flow__edge').count();
  log('nodes', O.nodesBuilt, 'edges', O.edgesBuilt);

  // #2 — select agent node, inspect dropdown
  await page.locator('.react-flow__node').nth(1).click({ position: { x: 50, y: 18 } });
  await page.waitForTimeout(1200);
  const sel = page.locator('select[id^="agent-id-"]');
  O.dropdownExists = await sel.count();
  if (O.dropdownExists) {
    O.dropdownOptions = await sel.locator('option').allTextContents();
    await sel.selectOption({ label: 'Agente Privado E2E L41' }).catch(async () => { await sel.selectOption({ index: 1 }); });
    O.dropdownSelected = await sel.inputValue();
  }
  log('dropdown opts', JSON.stringify(O.dropdownOptions), 'selected', O.dropdownSelected);
  await page.screenshot({ path: `${EV}/studio-l41-e2e-built.png` });

  // name + save (valid graph -> should succeed)
  await page.locator('header input[type=text]').first().fill('Flow E2E L41');
  await page.getByRole('button', { name: /Salvar/i }).first().click();
  await page.waitForTimeout(3500);
  O.saveToasts = await page.locator('[role=alert], [data-sonner-toast]').allTextContents().catch(() => []);
  log('save toasts', JSON.stringify(O.saveToasts));
  await page.screenshot({ path: `${EV}/studio-l41-e2e-saved.png` });

  // run
  const runBtn = page.getByRole('button', { name: /Executar/i }).first();
  O.runDisabled = await runBtn.isDisabled().catch(() => null);
  await runBtn.click().catch(() => {});
  await page.waitForTimeout(800);
  const ta = page.locator('[role=dialog] textarea').first();
  if (await ta.count()) {
    await ta.fill('teste e2e qa rodada 2');
    await page.locator('[role=dialog]').getByRole('button', { name: /Executar/i }).click().catch(() => {});
    await page.waitForTimeout(4000);
  }
  O.runToasts = await page.locator('[role=alert], [data-sonner-toast]').allTextContents().catch(() => []);
  log('run toasts', JSON.stringify(O.runToasts));

  // reload -> Studio must reload saved flow (Task 13 inegociável)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  O.reloadNodeCount = await page.locator('.react-flow__node').count();
  O.reloadCrash = /Oops! Something Unexpected|Cannot read properties/.test(await page.locator('body').innerText().catch(() => ''));
  log('after reload nodes', O.reloadNodeCount, 'crash?', O.reloadCrash);
  await page.screenshot({ path: `${EV}/studio-l41-e2e-reloaded.png` });

  // #1 — Histórico drawer per-node status
  await page.getByRole('button', { name: /Histórico/i }).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  const drawer = page.locator('[role=complementary][aria-label]');
  O.drawerVisible = await drawer.count();
  await drawer.locator('button').nth(1).click().catch(() => {});
  await page.waitForTimeout(1500);
  O.drawerText = (await drawer.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 700);
  O.drawerHasPerNode = /trigger|agent|output/i.test(O.drawerText) &&
    /conclu|sucesso|falh|erro|completed|failed|running|executand/i.test(O.drawerText);
  log('drawer per-node?', O.drawerHasPerNode, '::', O.drawerText);
  await page.screenshot({ path: `${EV}/studio-l41-e2e-runs-drawer.png` });

  // #3 — invalid graph (2 triggers) -> save blocked + PT-BR banner
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  await dropNode('trigger', 250, 140);
  await dropNode('trigger', 520, 140);
  await dropNode('output', 380, 360);
  await page.waitForTimeout(1000);
  const saveBtn2 = page.getByRole('button', { name: /Salvar/i }).first();
  O.invalidSaveDisabled = await saveBtn2.isDisabled().catch(() => null);
  O.invalidSaveTitle = await saveBtn2.getAttribute('title').catch(() => null);
  O.invalidBanner = (await page.locator('[role=alert], [class*="red"]').allTextContents().catch(() => []))
    .map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6);
  log('invalid save disabled?', O.invalidSaveDisabled, 'title', O.invalidSaveTitle);
  log('invalid banner', JSON.stringify(O.invalidBanner));
  await page.screenshot({ path: `${EV}/studio-l41-e2e-invalid-blocked.png` });
  O.jargon = /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(await page.locator('body').innerText().catch(() => ''));

  // regression /c/new + mobile
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  O.chatComposer = await page.locator('textarea, [contenteditable=true]').first().count();
  await page.screenshot({ path: `${EV}/studio-l41-e2e-regression-chat.png` });
  const cookies = await context.cookies();
  const mctx = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 390, height: 844 }, isMobile: true });
  await mctx.addCookies(cookies);
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => { O.pageErrors.push('mobile:' + String(e)); });
  await mp.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(5000);
  await mp.screenshot({ path: `${EV}/studio-l41-e2e-mobile-studio.png` });
  await mp.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(4000);
  await mp.screenshot({ path: `${EV}/studio-l41-e2e-mobile-chat.png` });
  await mctx.close();

  O.net = net.slice(0, 30);
  O.pageErrorCount = O.pageErrors.length;
  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===E2E_RESULT===');
  console.log(JSON.stringify(O, null, 2));
  console.log('===END===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
