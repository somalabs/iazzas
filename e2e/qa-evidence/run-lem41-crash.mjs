// LEM-41 — evidência do crash: flow persistido via API (nós sem `data`) derruba todo o Studio no reload.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const email = 'qa.lem41.1779074030546@example.com';
const password = 'QaLem41!pw';
const log = (...a) => console.log('[crash]', ...a);

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  await mongoose.connection.db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: 'e2e/storageState.json', viewport: { width: 1440, height: 900 } });
  const api = context.request;
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const token = (await login.json())?.token;
  const ag = await api.post(`${BASE}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Crash Agent', provider: 'google', model: 'gemini-1.5-flash', instructions: 'x' },
  });
  const agentId = (await ag.json())?.id;
  // valid graph but trigger/output carry empty data {} — exactly what Mongoose minimize strips
  const cf = await api.post(`${BASE}/api/flows`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'Flow API empty-data',
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 240, y: 60 }, data: {} },
        { id: 'a1', type: 'agent', position: { x: 240, y: 240 }, data: { agentId } },
        { id: 'o1', type: 'output', position: { x: 240, y: 420 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'o1' }],
    },
  });
  const flowId = (await cf.json())?.flow?._id;
  log('flow created', cf.status(), flowId);
  const persisted = await mongoose.connection.db.collection('agentflows').findOne({ _id: new mongoose.Types.ObjectId(flowId) });
  log('persisted nodes:', JSON.stringify(persisted.nodes));

  const page = await context.newPage();
  const pe = [];
  page.on('pageerror', (e) => pe.push(String(e)));
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
  const nodeCount = await page.locator('.react-flow__node').count();
  await page.screenshot({ path: `${EV}/studio-l41-crash-on-reload.png` });
  log('nodeCount', nodeCount, 'pageErrors', pe.length);
  log('body', body);
  console.log('\n===CRASH_RESULT===');
  console.log(JSON.stringify({ flowId, persistedNodes: persisted.nodes, nodeCount, pageErrors: pe, body }, null, 2));
  console.log('===END===');
  await browser.close();
  await mongoose.disconnect().catch(() => {});
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
