/**
 * LEM-49 — Re-QA Automações (Épico 2 / LEM-34) pós-fix RBAC (LEM-48).
 * Rodada 2/3. Exercita S1–S6 (antes bloqueados pelo 403 universal) + reconfirma S7.
 * Roda contra o app vivo em http://127.0.0.1:3080.
 * Auth via context.request (UA de browser → não dispara non_browser ban).
 * S6 usa role custom NOVA (cache-miss garantido) p/ provar o gate nos dois sentidos
 * sem brigar com o cache in-memory de CacheKeys.ROLES.
 */
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EVID = new URL('.', import.meta.url).pathname;
const MONGO = 'mongodb://127.0.0.1:27017/LibreChat';
const TS = Date.now();
const log = (...a) => console.log('[L49]', ...a);

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

async function clearBans(db) {
  try {
    await db.collection('logs').deleteMany({ key: { $regex: '^(BANS:|ban)' } });
  } catch (e) {
    log('clearBans noop', e.message);
  }
}

async function main() {
  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  await clearBans(db);

  const results = {};
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/storageState.json',
    viewport: { width: 1366, height: 900 },
  });
  const api = context.request;

  // ---- auth: register fresh USER-role user (browser-UA request) ----
  const email = `qa.lem49.${TS}@example.com`;
  const password = 'QaLem49!pw';
  const reg = await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA L49', username: `qal49${TS}`, email, password, confirm_password: password },
  });
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const loginJson = await login.json().catch(() => ({}));
  const token = loginJson?.token;
  const userId = loginJson?.user?.id || loginJson?.user?._id;
  const userRole = loginJson?.user?.role;
  const H = { Authorization: `Bearer ${token}` };
  results.auth = {
    register: reg.status(),
    login: login.status(),
    hasToken: !!token,
    userId,
    role: userRole,
  };
  log('auth', JSON.stringify(results.auth));

  // ---- flows (Épico 1) ----
  const fOk = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `Flow QA L49 ${TS}`, ...flowGraph('Relatorio QA L49 gerado as ' + new Date().toISOString()) },
  });
  const fOkJson = await fOk.json().catch(() => ({}));
  const flowId = fOkJson?.flow?._id;
  const fAppr = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `Flow Aprovacao L49 ${TS}`, ...approvalGraph() },
  });
  const fApprJson = await fAppr.json().catch(() => ({}));
  const approvalFlowId = fApprJson?.flow?._id;
  results.flows = { ok: fOk.status(), approval: fAppr.status(), flowId, approvalFlowId };
  log('flows', JSON.stringify(results.flows));

  // ================= S1 — acesso + criação (sem 403) =================
  const listResp = await api.get(`${BASE}/api/automacoes`, { headers: H });
  const listBody = await listResp.text();
  results.s1_list = { status: listResp.status(), body: listBody.slice(0, 200) };
  log('S1 GET /api/automacoes', listResp.status());

  let automationId;
  if (flowId) {
    const createResp = await api.post(`${BASE}/api/automacoes`, {
      headers: H,
      data: {
        flowId,
        name: 'Relatorio diario QA L49',
        cron: '0 8 * * *',
        timezone: 'America/Sao_Paulo',
        triggerInput: 'gerar relatorio',
      },
    });
    const cj = await createResp.json().catch(() => ({}));
    automationId = cj?.automation?._id;
    results.s1_create = {
      status: createResp.status(),
      id: automationId,
      enabled: cj?.automation?.enabled,
      nextRunAt: cj?.automation?.nextRunAt,
      outputTargets: cj?.automation?.outputTargets,
      body: JSON.stringify(cj).slice(0, 300),
    };
    log('S1 POST /api/automacoes', createResp.status(), automationId);
  }

  // S1b — cron inválido → 400 cronInvalid
  const badCron = await api.post(`${BASE}/api/automacoes`, {
    headers: H,
    data: { flowId, name: 'cron ruim', cron: 'not a cron', timezone: 'America/Sao_Paulo' },
  });
  results.s1_cron_invalid = { status: badCron.status(), body: (await badCron.text()).slice(0, 200) };

  // ================= S2 — run com sucesso =================
  if (automationId) {
    const runResp = await api.post(`${BASE}/api/automacoes/${automationId}/run`, { headers: H, data: {} });
    const rj = await runResp.json().catch(() => ({}));
    const runId = rj?.runId;
    let runsState = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const rr = await api.get(`${BASE}/api/automacoes/${automationId}/runs`, { headers: H });
      const rrj = await rr.json().catch(() => ({}));
      const runs = rrj?.runs || [];
      runsState = runs[0];
      if (runsState && ['success', 'failed', 'skipped'].includes(runsState.status)) break;
    }
    results.s2_run = {
      triggerStatus: runResp.status(),
      runId,
      finalRunStatus: runsState?.status,
      hasOutput: !!(runsState?.output || runsState?.result),
    };
    log('S2 run', JSON.stringify(results.s2_run));

    // ================= S3 — conversa + notificação =================
    await new Promise((r) => setTimeout(r, 2500));
    const convs = await db
      .collection('conversations')
      .find({ user: String(userId) })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()
      .catch(() => []);
    const notifs = await db
      .collection('notifications')
      .find({ userId: String(userId) })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()
      .catch(() => []);
    const notifsAny = notifs.length
      ? notifs
      : await db.collection('notifications').find({}).sort({ _id: -1 }).limit(5).toArray().catch(() => []);
    const autoDoc = await db
      .collection('automations')
      .findOne({ _id: new mongoose.Types.ObjectId(automationId) })
      .catch(() => null);
    results.s3_destinations = {
      conversations: convs.map((c) => ({ title: c.title })),
      notifications: notifsAny.map((n) => ({ type: n.type, title: n.title, userId: n.userId })),
      automationLastStatus: autoDoc?.lastStatus,
      automationLastRunAt: autoDoc?.lastRunAt,
    };
    log('S3 destinations', JSON.stringify(results.s3_destinations).slice(0, 500));

    // ================= S4 — toggle enable/disable =================
    const off = await api.patch(`${BASE}/api/automacoes/${automationId}/enabled`, {
      headers: H,
      data: { enabled: false },
    });
    const offJ = await off.json().catch(() => ({}));
    const disabledRun = await api.post(`${BASE}/api/automacoes/${automationId}/run`, { headers: H, data: {} });
    const drBody = await disabledRun.text();
    const on = await api.patch(`${BASE}/api/automacoes/${automationId}/enabled`, {
      headers: H,
      data: { enabled: true },
    });
    const onJ = await on.json().catch(() => ({}));
    results.s4_toggle = {
      disableStatus: off.status(),
      disabledFlag: offJ?.automation?.enabled,
      runWhileDisabled: { status: disabledRun.status(), body: drBody.slice(0, 150) },
      enableStatus: on.status(),
      enabledFlag: onJ?.automation?.enabled,
    };
    log('S4 toggle', JSON.stringify(results.s4_toggle));
  }

  // ================= S5 — bloqueio human_approval =================
  if (approvalFlowId) {
    const apprResp = await api.post(`${BASE}/api/automacoes`, {
      headers: H,
      data: { flowId: approvalFlowId, name: 'Bloqueada aprovacao L49', cron: '0 9 * * 1', timezone: 'America/Sao_Paulo' },
    });
    const aj = await apprResp.json().catch(() => ({}));
    results.s5_approval_block = { status: apprResp.status(), error: aj?.error, message: aj?.message };
    log('S5 approval block', JSON.stringify(results.s5_approval_block));
  }

  // ================= S6 — gate de permissão REAL (degradar role) =================
  // Cria uma role custom NOVA sem AUTOMATIONS (cache-miss garantido em getRoleByName),
  // troca a role do user no Mongo (jwtStrategy recarrega user a cada req) e prova 403.
  {
    const usersCol = db.collection('users');
    const userObjId = new mongoose.Types.ObjectId(userId);
    const userDoc = await usersCol.findOne({ _id: userObjId });
    const baseRole = await db.collection('roles').findOne({ name: userDoc?.role || 'USER' });
    const degradedName = `QA_NOAUTO_${TS}`;
    const degradedPerms = JSON.parse(JSON.stringify(baseRole?.permissions || {}));
    degradedPerms.AUTOMATIONS = { USE: false, CREATE: false };
    await db.collection('roles').insertOne({
      name: degradedName,
      permissions: degradedPerms,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await usersCol.updateOne({ _id: userObjId }, { $set: { role: degradedName } });

    const degradedList = await api.get(`${BASE}/api/automacoes`, { headers: H });
    const degradedCreate = await api.post(`${BASE}/api/automacoes`, {
      headers: H,
      data: { flowId, name: 'nao deve passar', cron: '0 10 * * *', timezone: 'America/Sao_Paulo' },
    });
    // controle: rota não-gated continua acessível (prova que não é auth global quebrada)
    const controlFlows = await api.get(`${BASE}/api/flows`, { headers: H });

    results.s6_gate = {
      degradedRole: degradedName,
      listStatus: degradedList.status(),
      createStatus: degradedCreate.status(),
      listBody: (await degradedList.text()).slice(0, 150),
      controlNonGatedStatus: controlFlows.status(),
    };
    log('S6 gate (degraded)', JSON.stringify(results.s6_gate));

    // restore role para o user (higiene; ambiente é efêmero de qualquer modo)
    await usersCol.updateOne({ _id: userObjId }, { $set: { role: userDoc?.role || 'USER' } });
  }

  // ================= UI — /d/automacoes (S1 visual) =================
  const consoleErrors = [];
  const pageErrors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  await page.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${EVID}automacoes-l49-desktop-lista.png`, fullPage: true });
  const bodyText = await page.evaluate(() => document.body.innerText);
  results.ui = {
    url: page.url(),
    redirectedToChat: /\/c\/new/.test(page.url()),
    hasPageTitle: /Automa/i.test(bodyText),
    oops: /Oops!|Cannot read properties|Something Unexpected/i.test(bodyText),
    jargon: /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(bodyText),
    snippet: bodyText.slice(0, 350),
  };
  log('UI /d/automacoes', JSON.stringify(results.ui).slice(0, 400));

  const createBtn = page.locator('button', { hasText: /Nova automação/i }).first();
  if (await createBtn.count()) {
    await createBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${EVID}automacoes-l49-desktop-editor.png`, fullPage: true });
  }

  const mob = await context.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(5000);
  await mob.screenshot({ path: `${EVID}automacoes-l49-mobile-lista.png`, fullPage: true });

  // ================= S7 — regressão =================
  const regErrors = [];
  const reg1 = await context.newPage();
  reg1.on('pageerror', (e) => regErrors.push(`/c/new: ${e}`));
  await reg1.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await reg1.waitForTimeout(6000);
  await reg1.screenshot({ path: `${EVID}automacoes-l49-regression-chat.png` });
  const reg1Text = await reg1.evaluate(() => document.body.innerText);

  const reg2 = await context.newPage();
  reg2.on('pageerror', (e) => regErrors.push(`/d/agent-studio: ${e}`));
  await reg2.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await reg2.waitForTimeout(6000);
  await reg2.screenshot({ path: `${EVID}automacoes-l49-regression-studio.png`, fullPage: true });
  const reg2Text = await reg2.evaluate(() => document.body.innerText);

  results.s7_regression = {
    chatPageErrors: regErrors.filter((e) => e.startsWith('/c/new')),
    studioPageErrors: regErrors.filter((e) => e.startsWith('/d/agent-studio')),
    chatOops: /Oops!|Cannot read properties/i.test(reg1Text),
    studioOops: /Oops!|Cannot read properties/i.test(reg2Text),
    chatJargon: /stream tech|tech stream|wired by tech|TODO\(tech/i.test(reg1Text),
    studioJargon: /stream tech|tech stream|wired by tech|TODO\(tech/i.test(reg2Text),
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
