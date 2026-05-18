// LEM-43 — gate rodada final. #4 (degradação graciosa do reload pós-fix LEM-42) + não-regressão #1 RBAC e #3 save-validation.
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const ts = Date.now();
const email = `qa.lem43.${ts}@example.com`;
const password = 'QaLem43!pw';
const log = (...a) => console.log('[l43]', ...a);
const O = { pageErrors: [] };

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/LibreChat');
  const db = mongoose.connection.db;
  await db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1440, height: 900 },
  });
  const api = context.request; // APIRequestContext do BrowserContext -> UA de Chromium (não conta non_browser)

  // register fresh user (browser UA)
  const reg = await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA L43', username: `qal43${ts}`, email, password, confirm_password: password },
  });
  log('register', reg.status());
  let login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  log('login', login.status());
  let token = (await login.json().catch(() => ({})))?.token;
  if (!token) throw new Error('no token; login ' + login.status() + ' ' + (await login.text()).slice(0, 200));
  const auth = (t) => ({ headers: { Authorization: `Bearer ${t}` } });

  // private agent for the tenant
  const ag = await api.post(`${BASE}/api/agents`, {
    ...auth(token),
    data: { name: 'QA L43 Agent', provider: 'google', model: 'gemini-1.5-flash', instructions: 'curto' },
  });
  const agentId = (await ag.json().catch(() => ({})))?.id;
  log('agent', ag.status(), agentId);

  // ---------- #4: POST com data:{} e data AUSENTE em trigger/output ----------
  const cf = await api.post(`${BASE}/api/flows`, {
    ...auth(token),
    data: {
      name: 'L43 empty-data POST',
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 240, y: 60 }, data: {} },          // data vazio
        { id: 'a1', type: 'agent', position: { x: 240, y: 240 }, data: { agentId } },
        { id: 'o1', type: 'output', position: { x: 240, y: 420 } },                     // data AUSENTE
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'o1' }],
    },
  });
  O.postStatus = cf.status();
  const flowId = (await cf.json().catch(() => ({})))?.flow?._id;
  O.flowId = flowId;
  const persistedPost = await db.collection('agentflows').findOne({ _id: new mongoose.Types.ObjectId(flowId) });
  O.postPersistedNodes = persistedPost?.nodes;
  O.postAllNodesHaveData = Array.isArray(persistedPost?.nodes) &&
    persistedPost.nodes.every((n) => n && typeof n.data === 'object' && n.data !== null);
  log('POST', O.postStatus, 'allNodesHaveData?', O.postAllNodesHaveData, JSON.stringify(O.postPersistedNodes));

  // ---------- #4: PUT também normaliza (data:{} / ausente) ----------
  const pf = await api.put(`${BASE}/api/flows/${flowId}`, {
    ...auth(token),
    data: {
      name: 'L43 empty-data PUT',
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 200, y: 50 } },                    // data AUSENTE
        { id: 'a1', type: 'agent', position: { x: 200, y: 230 }, data: { agentId } },
        { id: 'o1', type: 'output', position: { x: 200, y: 410 }, data: {} },           // data vazio
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'o1' }],
    },
  });
  O.putStatus = pf.status();
  const persistedPut = await db.collection('agentflows').findOne({ _id: new mongoose.Types.ObjectId(flowId) });
  O.putPersistedNodes = persistedPut?.nodes;
  O.putAllNodesHaveData = Array.isArray(persistedPut?.nodes) &&
    persistedPut.nodes.every((n) => n && typeof n.data === 'object' && n.data !== null);
  log('PUT', O.putStatus, 'allNodesHaveData?', O.putAllNodesHaveData, JSON.stringify(O.putPersistedNodes));

  // ---------- #4: recarregar Studio — não pode crashar ----------
  const page = await context.newPage();
  page.on('pageerror', (e) => { O.pageErrors.push('reload:' + String(e)); log('PAGEERROR', String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') log('console.error', m.text().slice(0, 160)); });
  await page.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  const reloadBody = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  O.reloadNodeCount = await page.locator('.react-flow__node').count();
  O.reloadCrash = /Oops! Something Unexpected|Cannot read properties|reading 'label'/i.test(reloadBody);
  O.reloadBodySnippet = reloadBody.slice(0, 240);
  log('reload nodeCount', O.reloadNodeCount, 'crash?', O.reloadCrash);
  await page.screenshot({ path: `${EV}/studio-l43-reload-empty-data.png` });

  // ---------- #4: criar flow novo após o cenário (API) continua OK ----------
  const cf2 = await api.post(`${BASE}/api/flows`, {
    ...auth(token),
    data: {
      name: 'L43 new-after-scenario',
      nodes: [
        { id: 't1', type: 'trigger', position: { x: 240, y: 60 }, data: { label: 'go' } },
        { id: 'a1', type: 'agent', position: { x: 240, y: 240 }, data: { agentId } },
        { id: 'o1', type: 'output', position: { x: 240, y: 420 }, data: { label: 'end' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'o1' }],
    },
  });
  O.createAfterStatus = cf2.status();
  log('create-after', O.createAfterStatus);

  // ---------- #1 RBAC: USER ----------
  async function rbac(label, tok) {
    const r = {};
    const list = await api.get(`${BASE}/api/flows`, auth(tok));
    r.list = list.status();
    const id = (await list.json().catch(() => ({})))?.flows?.[0]?._id || flowId;
    r.getId = (await api.get(`${BASE}/api/flows/${id}`, auth(tok))).status();
    r.getRuns = (await api.get(`${BASE}/api/flows/${id}/runs`, auth(tok))).status();
    const put = await api.put(`${BASE}/api/flows/${id}`, {
      ...auth(tok),
      data: {
        name: `RBAC ${label}`,
        nodes: [
          { id: 't1', type: 'trigger', position: { x: 1, y: 1 }, data: {} },
          { id: 'a1', type: 'agent', position: { x: 1, y: 2 }, data: { agentId } },
          { id: 'o1', type: 'output', position: { x: 1, y: 3 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'o1' }],
      },
    });
    r.put = put.status();
    const run = await api.post(`${BASE}/api/flows/${id}/run`, { ...auth(tok), data: { input: 'rbac probe' } });
    r.run = run.status();
    return r;
  }
  O.rbacUser = await rbac('USER', token);
  log('RBAC USER', JSON.stringify(O.rbacUser));

  // promote to ADMIN + re-login
  await db.collection('users').updateOne({ email }, { $set: { role: 'ADMIN' } });
  login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  token = (await login.json().catch(() => ({})))?.token;
  O.rbacAdmin = await rbac('ADMIN', token);
  log('RBAC ADMIN', JSON.stringify(O.rbacAdmin));

  // ---------- #3 save-validation API: 6 grafos inválidos + PUT inválido -> 422 sem leak ----------
  const N = (id, type) => ({ id, type, position: { x: 1, y: 1 }, data: {} });
  const cases = {
    no_trigger: { nodes: [N('a1', 'agent'), N('o1', 'output')], edges: [{ id: 'e', source: 'a1', target: 'o1' }] },
    no_output: { nodes: [N('t1', 'trigger'), N('a1', 'agent')], edges: [{ id: 'e', source: 't1', target: 'a1' }] },
    multiple_triggers: { nodes: [N('t1', 'trigger'), N('t2', 'trigger'), N('o1', 'output')], edges: [{ id: 'e1', source: 't1', target: 'o1' }, { id: 'e2', source: 't2', target: 'o1' }] },
    cycle: { nodes: [N('t1', 'trigger'), N('a1', 'agent'), N('a2', 'agent'), N('o1', 'output')], edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 'a1', target: 'a2' }, { id: 'e3', source: 'a2', target: 'a1' }, { id: 'e4', source: 'a2', target: 'o1' }] },
    path_without_output: { nodes: [N('t1', 'trigger'), N('a1', 'agent'), N('a2', 'agent'), N('o1', 'output')], edges: [{ id: 'e1', source: 't1', target: 'a1' }, { id: 'e2', source: 't1', target: 'a2' }, { id: 'e3', source: 'a1', target: 'o1' }] },
  };
  O.saveValidation = {};
  for (const [code, g] of Object.entries(cases)) {
    const resp = await api.post(`${BASE}/api/flows`, { ...auth(token), data: { name: `inv ${code}`, ...g } });
    const body = await resp.text();
    O.saveValidation[code] = {
      status: resp.status(),
      isInvalidFlowGraph: /Invalid flow graph/.test(body),
      hasDetailsCode: /"code"\s*:/.test(body) || /details/.test(body),
      leak: /(mongodb:\/\/|Bearer |password|secret|127\.0\.0\.1:27017|\/repos\/)/i.test(body),
      bodySnippet: body.replace(/\s+/g, ' ').slice(0, 200),
    };
  }
  const putInv = await api.put(`${BASE}/api/flows/${flowId}`, { ...auth(token), data: { name: 'inv put', ...cases.no_trigger } });
  O.saveValidation.put_no_trigger = { status: putInv.status(), body: (await putInv.text()).replace(/\s+/g, ' ').slice(0, 160) };
  log('saveValidation', JSON.stringify(O.saveValidation));

  O.pageErrorCount = O.pageErrors.length;
  await browser.close();
  await mongoose.disconnect().catch(() => {});
  console.log('\n===L43_RESULT===');
  console.log(JSON.stringify(O, null, 2));
  console.log('===END===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
