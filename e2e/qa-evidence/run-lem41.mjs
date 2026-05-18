// LEM-41 / LEM-33 — QA gate rodada 2: re-valida defeitos #1 RBAC, #2 dropdown, #3 validação-no-save + regressão.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
const email = `qa.lem41.${ts}@example.com`;
const password = 'QaLem41!pw';
const log = (...a) => console.log('[lem41]', ...a);
const R = { rbacUser: {}, rbacAdmin: {}, saveValidation: [], ui: {}, regression: {} };
const pageErrors = [];

const validGraph = (agentId) => ({
  nodes: [
    { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
    { id: 'a1', type: 'agent', position: { x: 0, y: 100 }, data: { agentId } },
    { id: 'o1', type: 'output', position: { x: 0, y: 200 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 't1', target: 'a1' },
    { id: 'e2', source: 'a1', target: 'o1' },
  ],
});

const invalidGraphs = {
  no_trigger: {
    nodes: [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: {} },
      { id: 'o1', type: 'output', position: { x: 0, y: 100 }, data: {} },
    ],
    edges: [{ id: 'e1', source: 'a1', target: 'o1' }],
  },
  no_output: {
    nodes: [
      { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 'a1', type: 'agent', position: { x: 0, y: 100 }, data: {} },
    ],
    edges: [{ id: 'e1', source: 't1', target: 'a1' }],
  },
  multiple_triggers: {
    nodes: [
      { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 't2', type: 'trigger', position: { x: 100, y: 0 }, data: {} },
      { id: 'o1', type: 'output', position: { x: 0, y: 100 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'o1' },
      { id: 'e2', source: 't2', target: 'o1' },
    ],
  },
  cycle: {
    nodes: [
      { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 'a1', type: 'agent', position: { x: 0, y: 100 }, data: {} },
      { id: 'a2', type: 'agent', position: { x: 0, y: 200 }, data: {} },
      { id: 'o1', type: 'output', position: { x: 0, y: 300 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1' },
      { id: 'e2', source: 'a1', target: 'a2' },
      { id: 'e3', source: 'a2', target: 'a1' },
      { id: 'e4', source: 'a2', target: 'o1' },
    ],
  },
  path_without_output: {
    nodes: [
      { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 'a1', type: 'agent', position: { x: 0, y: 100 }, data: {} },
      { id: 'o1', type: 'output', position: { x: 200, y: 200 }, data: {} },
    ],
    edges: [{ id: 'e1', source: 't1', target: 'a1' }],
  },
};

async function clearBans() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
    const r = await mongoose.connection.db
      .collection('logs')
      .deleteMany({ key: { $regex: '^(BANS:|ban)' } });
    log('cleared ban keys:', r.deletedCount);
  } catch (e) {
    log('ban clear skipped:', e.message);
  }
}

async function setRole(mail, role) {
  const r = await mongoose.connection.db
    .collection('users')
    .updateOne({ email: mail }, { $set: { role } });
  log(`set role ${role} for ${mail}:`, r.modifiedCount);
}

async function rbacSuite(api, token, label) {
  const H = { Authorization: `Bearer ${token}` };
  const out = {};
  // create agent for this user
  const agentRes = await api.post(`${BASE}/api/agents`, {
    headers: H,
    data: { name: `QA L41 Agent ${label}`, provider: 'google', model: 'gemini-1.5-flash', instructions: 'Responda curto.' },
  });
  const agentJson = await agentRes.json().catch(() => ({}));
  const agentId = agentJson?.id || agentJson?._id;
  out.createAgent = agentRes.status();
  log(`[${label}] create agent`, agentRes.status(), agentId);

  const create = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `QA L41 Flow ${label}`, ...validGraph(agentId) },
  });
  out.POST_flows = create.status();
  const createJson = await create.json().catch(() => ({}));
  const flowId = createJson?.flow?._id;
  log(`[${label}] POST /api/flows`, create.status(), flowId);

  const list = await api.get(`${BASE}/api/flows`, { headers: H });
  out.GET_flows = list.status();
  const getOne = await api.get(`${BASE}/api/flows/${flowId}`, { headers: H });
  out.GET_flows_id = getOne.status();
  const getRuns = await api.get(`${BASE}/api/flows/${flowId}/runs`, { headers: H });
  out.GET_flows_id_runs = getRuns.status();
  const put = await api.put(`${BASE}/api/flows/${flowId}`, {
    headers: H,
    data: { name: `QA L41 Flow ${label} v2`, ...validGraph(agentId) },
  });
  out.PUT_flows_id = put.status();
  const run = await api.post(`${BASE}/api/flows/${flowId}/run`, {
    headers: H,
    data: { input: 'teste de QA rodada 2' },
  });
  out.POST_run = run.status();
  const runBody = await run.text().catch(() => '');
  out.POST_run_body = runBody.slice(0, 300);
  log(`[${label}] GET=${out.GET_flows} GET/:id=${out.GET_flows_id} GET/:id/runs=${out.GET_flows_id_runs} PUT=${out.PUT_flows_id} RUN=${out.POST_run}`);
  log(`[${label}] run body:`, out.POST_run_body);

  // runs after run
  await new Promise((r) => setTimeout(r, 2500));
  const runsAfter = await api.get(`${BASE}/api/flows/${flowId}/runs`, { headers: H });
  const runsJson = await runsAfter.json().catch(() => ({}));
  out.runsCount = runsJson?.runs?.length ?? 0;
  out.firstRunNodeRuns = runsJson?.runs?.[0]?.nodeRuns ?? null;
  log(`[${label}] runs after run:`, out.runsCount, 'nodeRuns:', JSON.stringify(out.firstRunNodeRuns)?.slice(0, 300));
  return { out, flowId, agentId, token };
}

async function main() {
  await clearBans();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
  });
  const api = context.request;

  const reg = await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA LEM41', username: `qalem41${ts}`, email, password, confirm_password: password },
  });
  log('register', reg.status());
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  log('login', login.status());
  const token = (await login.json().catch(() => ({})))?.token;
  if (!token) throw new Error('no token: ' + reg.status() + '/' + login.status());

  // ---- Phase A: RBAC as USER ----
  const userRun = await rbacSuite(api, token, 'USER');
  R.rbacUser = userRun.out;

  // ---- Phase B: RBAC as ADMIN ----
  await setRole(email, 'ADMIN');
  const login2 = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const token2 = (await login2.json().catch(() => ({})))?.token;
  log('admin re-login', login2.status());
  R.rbacAdmin = (await rbacSuite(api, token2 || token, 'ADMIN')).out;

  // ---- Phase C: #3 validation on save (API) ----
  const H = { Authorization: `Bearer ${token2 || token}` };
  for (const [name, graph] of Object.entries(invalidGraphs)) {
    const res = await api.post(`${BASE}/api/flows`, {
      headers: H,
      data: { name: `QA L41 invalid ${name}`, ...graph },
    });
    const body = await res.text().catch(() => '');
    const json = (() => { try { return JSON.parse(body); } catch { return {}; } })();
    const codes = Array.isArray(json?.details) ? json.details.map((d) => d.code) : [];
    const leak = /secret|mongodb:\/\/|password|FLOW_HTTP|process\.env|\/repos\/|api[_-]?key/i.test(body);
    R.saveValidation.push({ name, status: res.status(), codes, leak, body: body.slice(0, 200) });
    log(`save-invalid ${name}: ${res.status()} codes=${JSON.stringify(codes)} leak=${leak}`);
  }
  // PUT invalid on the user's flow
  const putInvalid = await api.put(`${BASE}/api/flows/${userRun.flowId}`, {
    headers: H,
    data: { name: 'QA L41 put invalid', ...invalidGraphs.cycle },
  });
  R.saveValidation.push({ name: 'PUT_cycle', status: putInvalid.status(), body: (await putInvalid.text()).slice(0, 200) });
  log('PUT invalid (cycle):', putInvalid.status());

  // ---- Phase D: UI flow ----
  const page = await context.newPage();
  page.on('pageerror', (e) => { pageErrors.push('desktop:' + String(e)); log('PAGEERROR', String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') log('console.error', m.text().slice(0, 160)); });
  const net = [];
  page.on('response', async (r) => {
    if (/\/api\/flows/.test(r.url())) {
      net.push({ m: r.request().method(), u: r.url().replace(BASE, ''), s: r.status() });
    }
  });

  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${EV}/studio-l41-loaded.png` });
  const nodeCountLoaded = await page.locator('.react-flow__node').count();
  const bodyTxt = await page.locator('body').innerText().catch(() => '');
  R.ui.flowReloaded = nodeCountLoaded > 0;
  R.ui.nodeCountLoaded = nodeCountLoaded;
  log('flow reloaded — nodes on canvas:', nodeCountLoaded);

  // select agent node, inspect dropdown
  let agentOptions = [];
  const nodes = page.locator('.react-flow__node');
  const nc = await nodes.count();
  for (let i = 0; i < nc; i++) {
    const t = await nodes.nth(i).getAttribute('data-id');
    await nodes.nth(i).click();
    await page.waitForTimeout(600);
    const sel = page.locator('select[id^="agent-id-"]');
    if (await sel.count()) {
      agentOptions = await sel.locator('option').allTextContents();
      log('agent node', t, 'dropdown options:', JSON.stringify(agentOptions));
      break;
    }
  }
  R.ui.agentDropdownOptions = agentOptions;
  R.ui.agentDropdownHasAgents = agentOptions.filter((o) => !/Selecione|placeholder/i.test(o)).length > 0;
  await page.screenshot({ path: `${EV}/studio-l41-agent-dropdown.png` });

  // open history drawer -> per-node status
  await page.getByRole('button', { name: /Histórico/i }).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  const drawer = page.locator('[role=complementary]');
  await drawer.locator('button').first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const drawerText = await drawer.innerText().catch(() => '');
  R.ui.runsDrawerText = drawerText.replace(/\s+/g, ' ').slice(0, 500);
  R.ui.runsDrawerHasNodeStatus = /Trigger|Agente|Sa[ií]da|success|failed|running|conclu|erro/i.test(drawerText);
  log('runs drawer:', R.ui.runsDrawerText);
  await page.screenshot({ path: `${EV}/studio-l41-runs-drawer.png` });

  // #3 UI: build invalid graph (two triggers) -> Save must be blocked + PT-BR banner
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
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
  await dropNode('trigger', 250, 140);
  await dropNode('trigger', 520, 140);
  await dropNode('output', 380, 360);
  await page.waitForTimeout(1000);
  const saveBtn = page.getByRole('button', { name: /Salvar/i }).first();
  R.ui.saveDisabledOnInvalid = await saveBtn.isDisabled().catch(() => null);
  const banner = await page.locator('[role=alert], .text-red-500, [class*="red"]').allTextContents().catch(() => []);
  R.ui.invalidBanner = banner.map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
  R.ui.saveBtnTitle = await saveBtn.getAttribute('title').catch(() => null);
  log('save disabled on invalid?', R.ui.saveDisabledOnInvalid, 'title:', R.ui.saveBtnTitle);
  log('invalid banner:', JSON.stringify(R.ui.invalidBanner));
  await page.screenshot({ path: `${EV}/studio-l41-invalid-save-blocked.png` });

  // jargon scan
  R.ui.jargon = /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(
    await page.locator('body').innerText().catch(() => ''),
  );

  // ---- Phase E: regression /c/new ----
  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  R.regression.composer = await page.locator('textarea, [contenteditable=true]').first().count();
  R.regression.sidePanel = await page.locator('nav, [data-testid="nav"]').first().count();
  await page.screenshot({ path: `${EV}/studio-l41-regression-chat.png` });
  // send a message -> graceful provider error expected
  try {
    const c = page.locator('textarea, [contenteditable=true]').first();
    await c.fill('teste de regressão QA');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${EV}/studio-l41-regression-chat-sent.png` });
  } catch (e) { log('chat send err', String(e).slice(0, 120)); }

  // mobile
  const cookies = await context.cookies();
  const mctx = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mctx.addCookies(cookies);
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => { pageErrors.push('mobile:' + String(e)); log('PAGEERROR(mobile)', String(e)); });
  await mp.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(5000);
  await mp.screenshot({ path: `${EV}/studio-l41-mobile-studio.png` });
  await mp.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(5000);
  await mp.screenshot({ path: `${EV}/studio-l41-mobile-chat.png` });
  await mctx.close();

  R.regression.pageErrors = pageErrors;
  R.regression.pageErrorCount = pageErrors.length;
  R.net = net.filter((n) => /\/api\/flows/.test(n.u)).slice(0, 30);

  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===RESULT_JSON===');
  console.log(JSON.stringify(R, null, 2));
  console.log('===END_RESULT===');
  log('DONE');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
