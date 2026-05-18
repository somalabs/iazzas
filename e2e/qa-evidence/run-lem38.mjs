// LEM-38 / LEM-33 — QA gate Agent Studio (Task 13)
// Auth própria + DnD 3 nós + conexões + save + run + RunsDrawer + robustez + regressão.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
const email = `qa.lem38.${ts}@example.com`;
const password = 'QaLem38!pw';

const log = (...a) => console.log('[lem38]', ...a);
const pageErrors = [];

async function shot(page, name) {
  await page.screenshot({ path: `${EV}/${name}.png`, fullPage: false });
  log('shot', name);
}

async function main() {
  // ---- browser first: ALL http via context.request (carries Chromium UA -> not NON_BROWSER) ----
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
  });
  const ctxApi = context.request;

  const reg = await ctxApi.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA LEM38', username: `qalem38${ts}`, email, password, confirm_password: password },
  });
  log('register', reg.status());
  if (reg.status() === 403) throw new Error('BANNED at register: ' + (await reg.text()).slice(0, 160));
  const login = await ctxApi.post(`${BASE}/api/auth/login`, { data: { email, password } });
  log('login', login.status());
  if (login.status() === 403) throw new Error('BANNED at login: ' + (await login.text()).slice(0, 160));
  const loginJson = await login.json().catch(() => ({}));
  const token = loginJson?.token;
  if (!token) throw new Error('no bearer token from login: ' + JSON.stringify(loginJson).slice(0, 200));

  const agentRes = await ctxApi.post(`${BASE}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'QA Flow Agent', provider: 'google', model: 'gemini-1.5-flash', instructions: 'Responda curto.' },
  });
  log('create agent', agentRes.status());
  const agentJson = await agentRes.json().catch(() => ({}));
  log('agent id', agentJson?.id || agentJson?._id || JSON.stringify(agentJson).slice(0, 160));

  const page = await context.newPage();
  page.on('pageerror', (e) => {
    pageErrors.push(String(e));
    log('PAGEERROR', String(e));
  });
  page.on('console', (m) => {
    if (m.type() === 'error') log('console.error', m.text().slice(0, 200));
  });

  // capture key network responses
  const net = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/\/api\/flows/.test(u)) {
      let body = '';
      try { body = (await r.text()).slice(0, 600); } catch {}
      net.push({ method: r.request().method(), url: u.replace(BASE, ''), status: r.status(), body });
      log('NET', r.request().method(), u.replace(BASE, ''), r.status());
    }
  });

  // ---- Phase 1: open studio ----
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  await shot(page, 'studio-flow-desktop-empty');

  const hasCanvas = await page.locator('.react-flow').count();
  log('react-flow present?', hasCanvas);

  // ---- DnD helper: shared DataTransfer dispatched as real drop on the pane ----
  async function dropNode(nodeType, clientX, clientY) {
    await page.evaluate(
      ([type, x, y]) => {
        const pane = document.querySelector('.react-flow__pane') || document.querySelector('.react-flow');
        const dt = new DataTransfer();
        dt.setData('application/reactflow', type);
        const rect = pane.getBoundingClientRect();
        const cx = rect.left + x;
        const cy = rect.top + y;
        pane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, dataTransfer: dt }));
        pane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, dataTransfer: dt }));
      },
      [nodeType, clientX, clientY],
    );
    await page.waitForTimeout(500);
  }

  await dropNode('trigger', 360, 140);
  await dropNode('agent', 360, 340);
  await dropNode('output', 360, 540);
  await page.waitForTimeout(800);
  const nodeCount = await page.locator('.react-flow__node').count();
  log('nodes on canvas:', nodeCount);
  await shot(page, 'studio-flow-desktop-nodes');

  // ---- connect handles via mouse drag (source bottom -> target top) ----
  async function connect(sourceNodeIdx, targetNodeIdx) {
    const src = page.locator('.react-flow__node').nth(sourceNodeIdx).locator('.react-flow__handle.source');
    const tgt = page.locator('.react-flow__node').nth(targetNodeIdx).locator('.react-flow__handle.target');
    const sb = await src.boundingBox();
    const tb = await tgt.boundingBox();
    if (!sb || !tb) { log('handle bbox missing', sourceNodeIdx, targetNodeIdx, !!sb, !!tb); return; }
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 + 20, { steps: 5 });
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 });
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await connect(0, 1);
  await connect(1, 2);
  await page.waitForTimeout(500);
  const edgeCount = await page.locator('.react-flow__edge').count();
  log('edges on canvas:', edgeCount);
  await shot(page, 'studio-flow-desktop-built');

  // ---- select agent node, pick agent ----
  await page.locator('.react-flow__node').nth(1).click();
  await page.waitForTimeout(800);
  const agentSelect = page.locator('select#agent-id-' + (await page.locator('.react-flow__node').nth(1).getAttribute('data-id')));
  // fallback: any select inside inspector
  const sel = (await agentSelect.count()) ? agentSelect : page.locator('aside select, [role=complementary] select, select').first();
  try {
    const opts = await sel.locator('option').allTextContents();
    log('agent select options:', JSON.stringify(opts));
    await sel.selectOption({ label: 'QA Flow Agent' }).catch(async () => {
      await sel.selectOption({ index: 1 });
    });
    log('agent selected');
  } catch (e) {
    log('agent select failed:', String(e).slice(0, 160));
  }
  await page.waitForTimeout(400);

  // ---- name + save ----
  const nameInput = page.locator('header input[type=text]').first();
  await nameInput.fill('QA Flow LEM38');
  const saveBtn = page.getByRole('button', { name: /Salvar/i }).first();
  await saveBtn.click();
  await page.waitForTimeout(3500);
  await shot(page, 'studio-flow-desktop-saved');
  const toastAfterSave = await page.locator('[role=alert], [data-sonner-toast], .toast').allTextContents().catch(() => []);
  log('save toasts:', JSON.stringify(toastAfterSave));

  // ---- run ----
  try {
    const runBtn = page.getByRole('button', { name: /Executar/i }).first();
    const runDisabled = await runBtn.getAttribute('aria-disabled');
    log('run aria-disabled:', runDisabled);
    await runBtn.click({ timeout: 5000 });
    await page.waitForTimeout(900);
    const dlg = page.locator('[role=dialog]');
    const runInput = dlg.locator('textarea').first();
    if (await runInput.count()) {
      await runInput.fill('Olá, isto é um teste de QA do flow.');
      await shot(page, 'studio-flow-desktop-run-modal');
      await dlg.getByRole('button', { name: /Executar/i }).click({ timeout: 5000 });
      await page.waitForTimeout(3500);
    } else {
      log('run modal textarea not found');
    }
  } catch (e) {
    log('run step error:', String(e).slice(0, 160));
  }

  // open history drawer + reload to refetch runs
  const histBtn = page.getByRole('button', { name: /Histórico/i }).first();
  await histBtn.click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'studio-flow-desktop-runs-initial');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: /Histórico/i }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  // expand first run card
  const runCard = page.locator('[role=complementary] button, [aria-label*="Histórico"] button').first();
  await runCard.click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'studio-flow-desktop-runs');
  const drawerText = await page.locator('[role=complementary]').innerText().catch(() => '');
  log('runs drawer text:', drawerText.replace(/\s+/g, ' ').slice(0, 400));

  // ---- Phase 2: robustness — invalid graphs ----
  // remove trigger node -> expect banner
  await page.locator('.react-flow__node').first().hover();
  await page.waitForTimeout(300);
  const delBtn = page.locator('.react-flow__node').first().getByRole('button', { name: /Remover/i });
  await delBtn.click().catch(() => {});
  await page.waitForTimeout(1000);
  const banner = await page.locator('[role=alert]').allTextContents().catch(() => []);
  log('invalid (no trigger) banner:', JSON.stringify(banner));
  await shot(page, 'studio-flow-invalid-no-trigger');

  // try to run invalid flow: capture error + ensure no secret/internal leak
  const runErrTexts = [];
  page.on('response', async (r) => {
    if (/\/api\/flows\/.+\/run/.test(r.url())) {
      try { runErrTexts.push({ status: r.status(), body: (await r.text()).slice(0, 500) }); } catch {}
    }
  });
  // re-add two triggers to test multiple-trigger path via run
  await dropNode('trigger', 200, 120);
  await dropNode('trigger', 520, 120);
  await page.waitForTimeout(800);
  await shot(page, 'studio-flow-invalid-two-triggers');
  // save then run to surface backend graph validation
  await page.getByRole('button', { name: /Salvar/i }).first().click();
  await page.waitForTimeout(3000);
  const runBtn2 = page.getByRole('button', { name: /Executar/i }).first();
  await runBtn2.click();
  await page.waitForTimeout(800);
  const ta2 = page.locator('textarea').first();
  if (await ta2.count()) {
    await ta2.fill('teste invalido');
    await page.getByRole('button', { name: /Executar/i }).last().click();
    await page.waitForTimeout(3000);
  }
  const errToasts = await page.locator('[role=alert], [data-sonner-toast]').allTextContents().catch(() => []);
  log('invalid-run toasts:', JSON.stringify(errToasts));
  log('run error responses:', JSON.stringify(runErrTexts));
  await shot(page, 'studio-flow-invalid-run-feedback');

  // ---- Phase 3: mobile ----
  const authCookies = await context.cookies();
  const mctx = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mctx.addCookies(authCookies);
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => { pageErrors.push('mobile:' + String(e)); log('PAGEERROR(mobile)', String(e)); });
  await mp.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(5000);
  await mp.screenshot({ path: `${EV}/studio-flow-mobile-canvas.png` });
  log('shot studio-flow-mobile-canvas');
  await mp.getByRole('button', { name: /Histórico/i }).first().click().catch(() => {});
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: `${EV}/studio-flow-mobile-runs.png` });
  log('shot studio-flow-mobile-runs');
  await mctx.close();

  // ---- Phase 4: regression /c/new ----
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const composer = page.locator('textarea, [contenteditable=true]').first();
  const composerOk = await composer.count();
  log('chat composer present?', composerOk);
  await shot(page, 'studio-flow-regression-chat');
  // agent builder side panel sanity (open side panel if toggle exists)
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const jargon = /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(bodyText);
  log('jargon leak in chat body?', jargon);

  log('=== PAGEERRORS ===', pageErrors.length, JSON.stringify(pageErrors).slice(0, 600));
  log('=== NET (flows) ===', JSON.stringify(net, null, 0).slice(0, 1500));

  await browser.close();
  log('DONE');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
