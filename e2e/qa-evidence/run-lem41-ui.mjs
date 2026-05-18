// LEM-41 — probe UI focado: AgentInspector dropdown + RunsDrawer per-node status (Task 13 inegociável).
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
const email = `qa.l41ui.${ts}@example.com`;
const password = 'QaL41ui!pw';
const log = (...a) => console.log('[l41ui]', ...a);
const O = {};

const validGraph = (agentId) => ({
  nodes: [
    { id: 't1', type: 'trigger', position: { x: 240, y: 60 }, data: {} },
    { id: 'a1', type: 'agent', position: { x: 240, y: 240 }, data: { agentId } },
    { id: 'o1', type: 'output', position: { x: 240, y: 420 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 't1', target: 'a1' },
    { id: 'e2', source: 'a1', target: 'o1' },
  ],
});

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  await mongoose.connection.db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
  });
  const api = context.request;
  await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA L41UI', username: `qal41ui${ts}`, email, password, confirm_password: password },
  });
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const token = (await login.json().catch(() => ({})))?.token;
  const H = { Authorization: `Bearer ${token}` };

  const ag = await api.post(`${BASE}/api/agents`, {
    headers: H,
    data: { name: 'Agente Privado QA L41', provider: 'google', model: 'gemini-1.5-flash', instructions: 'curto' },
  });
  const agentId = (await ag.json().catch(() => ({})))?.id;
  log('agent', ag.status(), agentId);
  const cf = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: 'Flow Probe L41', ...validGraph(agentId) },
  });
  const flowId = (await cf.json().catch(() => ({})))?.flow?._id;
  log('flow', cf.status(), flowId);
  const rn = await api.post(`${BASE}/api/flows/${flowId}/run`, { headers: H, data: { input: 'oi qa' } });
  log('run', rn.status(), (await rn.text()).slice(0, 120));
  await new Promise((r) => setTimeout(r, 3000));

  const page = await context.newPage();
  const pe = [];
  page.on('pageerror', (e) => pe.push(String(e)));
  const flowsResp = [];
  page.on('response', (r) => {
    if (/\/api\/flows/.test(r.url())) flowsResp.push(`${r.request().method()} ${r.url().replace(BASE, '')} ${r.status()}`);
  });
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  O.flowsResp = flowsResp;
  O.nodeCount = await page.locator('.react-flow__node').count();
  log('flowsResp', JSON.stringify(flowsResp), 'nodeCount', O.nodeCount);
  await page.screenshot({ path: `${EV}/studio-l41ui-loaded.png` });
  if (O.nodeCount === 0) {
    log('NO NODES — flow did not load into canvas');
    O.bodyText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
    log('body', O.bodyText);
  }

  // click the Agente node body
  const agentNode = page.locator('.react-flow__node').filter({ hasText: /Agente/ }).first();
  await agentNode.click({ position: { x: 60, y: 20 }, timeout: 8000 }).catch((e) => log('agent click fail', String(e).slice(0, 100)));
  await page.waitForTimeout(1500);
  O.selectedCount = await page.locator('.react-flow__node.selected').count();
  const sel = page.locator('select[id^="agent-id-"]');
  O.selectExists = await sel.count();
  if (O.selectExists) {
    O.dropdownOptions = await sel.locator('option').allTextContents();
    O.selectedValue = await sel.inputValue();
  }
  log('selectedCount', O.selectedCount, 'selectExists', O.selectExists);
  log('dropdownOptions', JSON.stringify(O.dropdownOptions), 'value', O.selectedValue);
  await page.screenshot({ path: `${EV}/studio-l41ui-agent-inspector.png` });

  // Histórico drawer + per-node status
  await page.getByRole('button', { name: /Histórico/i }).first().click();
  await page.waitForTimeout(3000);
  const drawer = page.locator('[role=complementary][aria-label]');
  O.drawerVisible = await drawer.count();
  // expand first run card
  const card = drawer.locator('button').first();
  await card.click().catch(() => {});
  await page.waitForTimeout(1500);
  O.drawerText = (await drawer.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
  O.drawerHasPerNode = /Trigger|Agente|Sa[ií]da/.test(O.drawerText) &&
    /sucesso|conclu|falh|erro|success|failed|completed|executando|running/i.test(O.drawerText);
  log('drawerVisible', O.drawerVisible, 'hasPerNode', O.drawerHasPerNode);
  log('drawerText', O.drawerText);
  await page.screenshot({ path: `${EV}/studio-l41ui-runs-drawer.png`, fullPage: false });

  O.pageErrors = pe;
  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===UI_RESULT===');
  console.log(JSON.stringify(O, null, 2));
  console.log('===END===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
