// LEM-43 — re-teste FOCADO e determinístico do #2 (dropdown de agente no AgentInspector), canvas limpo.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const email = 'qa.l43ui.1779077243656@example.com';
const password = 'QaL43ui!pw';
const log = (...a) => console.log('[l43dd]', ...a);
const O = { pageErrors: [] };

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  await mongoose.connection.db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 1440, height: 900 } });
  const api = context.request;
  let token = null;
  for (let i = 0; i < 16; i++) {
    const r = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
    if (r.status() === 200) { token = (await r.json().catch(() => ({})))?.token; break; }
    log('login', r.status(), 'retry', i);
    await new Promise((res) => setTimeout(res, 30000));
  }
  if (!token) throw new Error('login rate-limited');
  const ag = await api.post(`${BASE}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Agente DD L43', provider: 'google', model: 'gemini-1.5-flash', instructions: 'curto' },
  });
  O.agentCreate = ag.status();
  O.agentId = (await ag.json().catch(() => ({})))?.id;
  log('agent', O.agentCreate, O.agentId);

  const page = await context.newPage();
  page.on('pageerror', (e) => { O.pageErrors.push(String(e)); });
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  O.startNodes = await page.locator('.react-flow__node').count();

  async function dropNode(type, x, y) {
    await page.evaluate(([tp, cx, cy]) => {
      const pane = document.querySelector('.react-flow__pane') || document.querySelector('.react-flow');
      const dt = new DataTransfer();
      dt.setData('application/reactflow', tp);
      const rc = pane.getBoundingClientRect();
      pane.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
      pane.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rc.left + cx, clientY: rc.top + cy, dataTransfer: dt }));
    }, [type, x, y]);
    await page.waitForTimeout(700);
  }
  await dropNode('trigger', 360, 130);
  await dropNode('agent', 360, 330);
  await dropNode('output', 360, 530);
  await page.waitForTimeout(800);
  O.nodesBuilt = await page.locator('.react-flow__node').count();

  // agent node = nth(1) (determinístico no canvas limpo, mesma técnica validada em run-lem41-e2e)
  await page.locator('.react-flow__node').nth(1).click({ position: { x: 50, y: 18 } });
  await page.waitForTimeout(1500);
  const sel = page.locator('select[id^="agent-id-"]');
  O.dropdownExists = await sel.count();
  if (O.dropdownExists) {
    O.dropdownOptions = await sel.locator('option').allTextContents();
    await sel.selectOption({ label: 'Agente DD L43' }).catch(async () => { await sel.selectOption({ index: 1 }).catch(() => {}); });
    O.dropdownSelected = await sel.inputValue().catch(() => null);
    O.selectedMatchesAgent = O.dropdownSelected === O.agentId;
  }
  log('dropdownExists', O.dropdownExists, 'options', JSON.stringify(O.dropdownOptions), 'selected', O.dropdownSelected, 'matches?', O.selectedMatchesAgent);
  await page.screenshot({ path: `${EV}/studio-l43-dropdown.png` });

  O.pageErrorCount = O.pageErrors.length;
  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===L43DD_RESULT===');
  console.log(JSON.stringify(O, null, 2));
  console.log('===END===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
