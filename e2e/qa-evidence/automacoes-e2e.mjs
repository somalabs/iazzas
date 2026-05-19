/**
 * LEM-47 — QA gate Playwright para Automações (Épico 2 / LEM-34).
 * Roda contra o app vivo em http://127.0.0.1:3080.
 * Autentica via context.request (UA de browser → não dispara non_browser ban).
 */
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EVID = new URL('.', import.meta.url).pathname;
const MONGO = 'mongodb://127.0.0.1:27017/LibreChat';
const TS = Date.now();
const log = (...a) => console.log('[L47]', ...a);

const flowGraph = (label) => ({
  nodes: [
    { id: 't', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Início' } },
    { id: 'o', type: 'output', position: { x: 300, y: 0 }, data: { label: 'Saída', template: label } },
  ],
  edges: [{ id: 'e1', source: 't', target: 'o' }],
});

const approvalGraph = () => ({
  nodes: [
    { id: 't', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Início' } },
    { id: 'h', type: 'human_approval', position: { x: 200, y: 0 }, data: { label: 'Aprovação' } },
    { id: 'o', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Saída', template: 'ok' } },
  ],
  edges: [
    { id: 'e1', source: 't', target: 'h' },
    { id: 'e2', source: 'h', target: 'o', sourceHandle: 'approved' },
  ],
});

async function clearBans() {
  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
  try {
    await mongoose.connection.db
      .collection('logs')
      .deleteMany({ key: { $regex: '^(BANS:|ban)' } });
  } catch (e) {
    log('clearBans noop', e.message);
  }
}

async function main() {
  await clearBans();
  const results = {};
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1366, height: 900 },
  });
  const api = context.request;

  // ---- auth: register fresh user via browser-UA request ----
  const email = `qa.lem47.${TS}@example.com`;
  const password = 'QaLem47!pw';
  const reg = await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA L47', username: `qal47${TS}`, email, password, confirm_password: password },
  });
  log('register', reg.status());
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  log('login', login.status());
  const loginJson = await login.json().catch(() => ({}));
  const token = loginJson?.token;
  const userId = loginJson?.user?.id || loginJson?.user?._id;
  const H = { Authorization: `Bearer ${token}` };
  results.auth = { register: reg.status(), login: login.status(), hasToken: !!token, userId };

  // ---- create flows (Épico 1) ----
  const fOk = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `Flow QA L47 ${TS}`, ...flowGraph('Relatorio QA gerado as ' + new Date().toISOString()) },
  });
  const fOkJson = await fOk.json().catch(() => ({}));
  const flowId = fOkJson?.flow?._id;
  log('createFlow ok', fOk.status(), 'flowId=', flowId);

  const fAppr = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `Flow Aprovacao L47 ${TS}`, ...approvalGraph() },
  });
  const fApprJson = await fAppr.json().catch(() => ({}));
  const approvalFlowId = fApprJson?.flow?._id;
  log('createFlow approval', fAppr.status(), 'flowId=', approvalFlowId);
  results.flows = { ok: fOk.status(), approval: fAppr.status(), flowId, approvalFlowId };

  // ---- 6 (RBAC base): GET list ----
  const listResp = await api.get(`${BASE}/api/automacoes`, { headers: H });
  const listBody = await listResp.text();
  log('GET /api/automacoes', listResp.status(), listBody.slice(0, 200));
  results.listAutomations = { status: listResp.status(), body: listBody.slice(0, 300) };

  // ---- 1: create automation (daily 08:00 America/Sao_Paulo) ----
  let automationId;
  if (flowId) {
    const createResp = await api.post(`${BASE}/api/automacoes`, {
      headers: H,
      data: {
        flowId,
        name: 'Relatorio diario QA L47',
        cron: '0 8 * * *',
        timezone: 'America/Sao_Paulo',
        triggerInput: 'gerar relatorio',
      },
    });
    const cj = await createResp.json().catch(() => ({}));
    automationId = cj?.automation?._id;
    log('POST /api/automacoes', createResp.status(), JSON.stringify(cj).slice(0, 250));
    results.createAutomation = { status: createResp.status(), body: JSON.stringify(cj).slice(0, 400) };
  }

  // ---- 2: run now → run success in history ----
  if (automationId) {
    const runResp = await api.post(`${BASE}/api/automacoes/${automationId}/run`, {
      headers: H,
      data: {},
    });
    const rj = await runResp.json().catch(() => ({}));
    log('POST run', runResp.status(), JSON.stringify(rj));
    const runId = rj?.runId;
    // poll runs history
    let runsState = null;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const rr = await api.get(`${BASE}/api/automacoes/${automationId}/runs`, { headers: H });
      const rrj = await rr.json().catch(() => ({}));
      const runs = rrj?.runs || [];
      runsState = runs[0];
      if (runsState && ['success', 'failed', 'skipped'].includes(runsState.status)) break;
    }
    log('run final state', runsState && { status: runsState.status, _id: runsState._id });
    results.runNow = {
      status: runResp.status(),
      runId,
      finalRunStatus: runsState?.status,
    };

    // ---- 3: verify destinations: conversation + notification ----
    await new Promise((r) => setTimeout(r, 1500));
    const convs = await mongoose.connection.db
      .collection('conversations')
      .find({ user: String(userId) })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()
      .catch(() => []);
    const notifs = await mongoose.connection.db
      .collection('notifications')
      .find({})
      .sort({ _id: -1 })
      .limit(5)
      .toArray()
      .catch(() => []);
    const automationDoc = await mongoose.connection.db
      .collection('automations')
      .findOne({ _id: new mongoose.Types.ObjectId(automationId) })
      .catch(() => null);
    results.destinations = {
      conversations: convs.map((c) => ({ title: c.title, user: c.user })),
      notifications: notifs.map((n) => ({ type: n.type, title: n.title, userId: n.userId })),
      automationLastStatus: automationDoc?.lastStatus,
    };
    log('destinations', JSON.stringify(results.destinations).slice(0, 600));

    // ---- 4: pause (toggle enabled=false) ----
    const tg = await api.patch(`${BASE}/api/automacoes/${automationId}/enabled`, {
      headers: H,
      data: { enabled: false },
    });
    const tgj = await tg.json().catch(() => ({}));
    log('PATCH enabled=false', tg.status(), JSON.stringify(tgj).slice(0, 150));
    results.toggle = { status: tg.status(), enabled: tgj?.automation?.enabled };
  }

  // ---- 5: automation for approval flow → 422 approvalNodeIncompatible ----
  if (approvalFlowId) {
    const apprResp = await api.post(`${BASE}/api/automacoes`, {
      headers: H,
      data: {
        flowId: approvalFlowId,
        name: 'Bloqueada aprovacao',
        cron: '0 9 * * 1',
        timezone: 'America/Sao_Paulo',
      },
    });
    const aj = await apprResp.json().catch(() => ({}));
    log('POST automacoes (approval flow)', apprResp.status(), JSON.stringify(aj));
    results.approvalBlock = { status: apprResp.status(), body: JSON.stringify(aj) };
  }

  // ---- UI navigation + screenshots ----
  const consoleErrors = [];
  const pageErrors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${EVID}automacoes-desktop-lista.png`, fullPage: true });
  const bodyText = await page.evaluate(() => document.body.innerText);
  results.ui = {
    url: page.url(),
    hasPageTitle: /Automa/i.test(bodyText),
    oops: /Oops!|Cannot read properties|Something Unexpected/i.test(bodyText),
    jargon: /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(bodyText),
    snippet: bodyText.slice(0, 400),
  };
  log('UI /d/automacoes', JSON.stringify(results.ui).slice(0, 500));

  // open create form
  const createBtn = page.locator('button', { hasText: /Nova automação/i }).first();
  if (await createBtn.count()) {
    await createBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${EVID}automacoes-desktop-editor.png`, fullPage: true });
  }

  // mobile viewport
  const mob = await context.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(5000);
  await mob.screenshot({ path: `${EVID}automacoes-mobile-lista.png`, fullPage: true });

  // ---- 7: regression — /c/new and /d/agent-studio, 0 pageerror ----
  const regErrors = [];
  const reg1 = await context.newPage();
  reg1.on('pageerror', (e) => regErrors.push(`/c/new: ${e}`));
  await reg1.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await reg1.waitForTimeout(6000);
  await reg1.screenshot({ path: `${EVID}automacoes-regression-chat.png` });
  const reg1Text = await reg1.evaluate(() => document.body.innerText);

  const reg2 = await context.newPage();
  reg2.on('pageerror', (e) => regErrors.push(`/d/agent-studio: ${e}`));
  await reg2.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await reg2.waitForTimeout(6000);
  await reg2.screenshot({ path: `${EVID}automacoes-regression-studio.png`, fullPage: true });
  const reg2Text = await reg2.evaluate(() => document.body.innerText);

  results.regression = {
    chatPageErrors: regErrors.filter((e) => e.startsWith('/c/new')),
    studioPageErrors: regErrors.filter((e) => e.startsWith('/d/agent-studio')),
    chatOops: /Oops!|Cannot read properties/i.test(reg1Text),
    studioOops: /Oops!|Cannot read properties/i.test(reg2Text),
    chatLoaded: reg1Text.length > 0,
    studioLoaded: reg2Text.length > 0,
  };

  results.consoleErrors = consoleErrors.slice(0, 10);
  results.pageErrors = pageErrors.slice(0, 10);

  console.log('\n==== RESULT JSON ====');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
