/**
 * LEM-51 — Re-QA Automações (Épico 2 / LEM-34) pós-fix de design LEM-50.
 * Rodada 3/3. Escopo estreito: reconfirmar os 2 defeitos do laudo LEM-49
 *   MAIOR #1 — editor utilizável no mobile (drill-in, autoria ponta a ponta)
 *   MENOR #2 — placeholder próprio do painel (não a string de estado-vazio)
 * + não-regressão (desktop split-pane íntegro; S7 chat/agent-studio).
 * App vivo http://127.0.0.1:3080. Auth via context.request (UA browser → sem non_browser ban).
 */
import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EVID = new URL('.', import.meta.url).pathname;
const MONGO = 'mongodb://127.0.0.1:27017/LibreChat';
const TS = Date.now();
const log = (...a) => console.log('[L34r3]', ...a);

const flowGraph = (label) => ({
  nodes: [
    { id: 't', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Início' } },
    { id: 'o', type: 'output', position: { x: 300, y: 0 }, data: { label: 'Saída', template: label } },
  ],
  edges: [{ id: 'e1', source: 't', target: 'o' }],
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

  // ---- auth: fresh USER-role user (browser-UA request) ----
  const email = `qa.l34r3.${TS}@example.com`;
  const password = 'QaL34r3!pw';
  const reg = await api.post(`${BASE}/api/auth/register`, {
    data: { name: 'QA L34r3', username: `qal34r3${TS}`, email, password, confirm_password: password },
  });
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const loginJson = await login.json().catch(() => ({}));
  const token = loginJson?.token;
  const userId = loginJson?.user?.id || loginJson?.user?._id;
  const H = { Authorization: `Bearer ${token}` };
  results.auth = { register: reg.status(), login: login.status(), hasToken: !!token, role: loginJson?.user?.role };
  log('auth', JSON.stringify(results.auth));

  // ---- seed: 1 flow + 1 automação (lista não-vazia p/ teste do placeholder) ----
  const fOk = await api.post(`${BASE}/api/flows`, {
    headers: H,
    data: { name: `Flow L34r3 ${TS}`, ...flowGraph('Relatorio L34r3') },
  });
  const flowId = (await fOk.json().catch(() => ({})))?.flow?._id;
  const seedAuto = await api.post(`${BASE}/api/automacoes`, {
    headers: H,
    data: { flowId, name: `Seed L34r3 ${TS}`, cron: '0 8 * * *', timezone: 'America/Sao_Paulo' },
  });
  const seedJson = await seedAuto.json().catch(() => ({}));
  results.seed = { flow: fOk.status(), automation: seedAuto.status(), automationId: seedJson?.automation?._id };
  log('seed', JSON.stringify(results.seed));

  const EMPTY_STATE = 'Nenhuma automação ainda';
  const SELECT_OR_CREATE = 'Selecione uma automação ou crie uma nova';

  // ===================== A. DESKTOP — placeholder + split-pane íntegro =====================
  const consoleErrors = [];
  const pageErrors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${EVID}automacoes-l34r3-desktop-lista.png`, fullPage: true });

  const dMetrics = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Automações"]');
    const main = document.querySelector('main[aria-label="Editor de automação"]');
    return {
      url: location.href,
      asideW: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      mainW: main ? Math.round(main.getBoundingClientRect().width) : null,
      mainText: main ? main.innerText : null,
      bodyText: document.body.innerText.slice(0, 400),
    };
  });
  results.A_desktop = {
    url: dMetrics.url,
    redirectedToChat: /\/c\/new/.test(dMetrics.url),
    asideWidth: dMetrics.asideW,
    editorWidth: dMetrics.mainW,
    splitPaneIntact: dMetrics.asideW != null && dMetrics.asideW >= 280 && dMetrics.asideW <= 340 && dMetrics.mainW > 600,
    placeholderText: (dMetrics.mainText || '').trim().slice(0, 120),
    placeholderIsSelectOrCreate: (dMetrics.mainText || '').includes(SELECT_OR_CREATE),
    placeholderLeakedEmptyState: (dMetrics.mainText || '').includes(EMPTY_STATE),
    oops: /Oops!|Cannot read properties|Something Unexpected/i.test(dMetrics.bodyText),
    jargon: /stream tech|tech stream|wired by tech|TODO\(tech|será ativado pelo stream/i.test(dMetrics.bodyText),
  };
  log('A desktop', JSON.stringify(results.A_desktop));

  // desktop: abrir editor (Nova automação) → split-pane deve permanecer (lista + editor)
  const createBtnD = page.locator('button', { hasText: /Nova automação/i }).first();
  if (await createBtnD.count()) {
    await createBtnD.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${EVID}automacoes-l34r3-desktop-editor.png`, fullPage: true });
    const dEdit = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Automações"]');
      const main = document.querySelector('main[aria-label="Editor de automação"]');
      const tabs = document.querySelectorAll('[role="tab"]').length;
      return {
        listStillVisible: !!aside && aside.getBoundingClientRect().width > 0,
        editorVisible: !!main && main.getBoundingClientRect().width > 0,
        scheduleTabs: tabs,
      };
    });
    results.A_desktop_editor = dEdit;
    log('A desktop editor', JSON.stringify(dEdit));
  }

  // ===================== B. MOBILE — drill-in + autoria ponta a ponta =====================
  const mob = await context.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(`${BASE}/d/automacoes`, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(5500);
  await mob.screenshot({ path: `${EVID}automacoes-l34r3-mobile-lista.png`, fullPage: true });

  const mList = await mob.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Automações"]');
    const main = document.querySelector('main[aria-label="Editor de automação"]');
    return {
      asideW: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      editorRendered: !!main,
      rows: document.querySelectorAll('aside[aria-label="Automações"] .group').length,
      bodyText: document.body.innerText.slice(0, 300),
    };
  });
  results.B_mobile_list = {
    listFullWidth: mList.asideW != null && mList.asideW >= 360, // ~390 viewport, não 300 sliver
    asideWidth: mList.asideW,
    editorNotRenderedInListMode: mList.editorRendered === false,
    rowsVisible: mList.rows,
  };
  log('B mobile list', JSON.stringify(results.B_mobile_list));

  // B1 — criar automação no mobile (drill-in para editor full-screen)
  const createBtnM = mob.locator('button', { hasText: /Nova automação/i }).first();
  await createBtnM.click().catch(() => {});
  await mob.waitForTimeout(1800);
  await mob.screenshot({ path: `${EVID}automacoes-l34r3-mobile-editor-criar.png`, fullPage: true });

  const mEditor = await mob.evaluate(() => {
    const main = document.querySelector('main[aria-label="Editor de automação"]');
    const aside = document.querySelector('aside[aria-label="Automações"]');
    const nameInput = document.querySelector('input[id$="-name"]');
    const flowSelect = document.querySelector('select[id$="-flow"]');
    const backBtn = document.querySelector('header[role="banner"] button[aria-label]');
    return {
      editorW: main ? Math.round(main.getBoundingClientRect().width) : null,
      listHiddenInEditorMode: !aside,
      nameInputW: nameInput ? Math.round(nameInput.getBoundingClientRect().width) : null,
      flowSelectW: flowSelect ? Math.round(flowSelect.getBoundingClientRect().width) : null,
      backBtnAria: backBtn ? backBtn.getAttribute('aria-label') : null,
    };
  });
  results.B_mobile_editor = {
    editorWidth: mEditor.editorW,
    editorUsable: mEditor.editorW != null && mEditor.editorW >= 360, // NÃO o sliver ~110px do LEM-49
    listHiddenInEditorMode: mEditor.listHiddenInEditorMode,
    nameInputWidth: mEditor.nameInputW,
    inputsNotClipped: mEditor.nameInputW != null && mEditor.nameInputW >= 280,
    backBtnAria: mEditor.backBtnAria,
    backBtnIsBackToList: mEditor.backBtnAria === 'Voltar à lista',
  };
  log('B mobile editor', JSON.stringify(results.B_mobile_editor));

  // preencher e salvar no mobile
  const mobName = `Mobile L34r3 ${TS}`;
  await mob.fill('input[id$="-name"]', mobName).catch((e) => log('fill name err', e.message));
  await mob.selectOption('select[id$="-flow"]', { index: 1 }).catch((e) => log('select flow err', e.message));
  await mob.waitForTimeout(400);
  const saveBtnM = mob.locator('button', { hasText: /Salvar automação/i }).first();
  await saveBtnM.click().catch((e) => log('save click err', e.message));
  await mob.waitForTimeout(3500);
  await mob.screenshot({ path: `${EVID}automacoes-l34r3-mobile-pos-salvar.png`, fullPage: true });

  const afterCreate = await api.get(`${BASE}/api/automacoes`, { headers: H });
  const afterCreateJson = await afterCreate.json().catch(() => ({}));
  const allAutos = afterCreateJson?.automations || [];
  const createdMobile = allAutos.find((a) => a.name === mobName);
  const backToListAfterSave = await mob.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Automações"]');
    return { listVisible: !!aside, editorVisible: !!document.querySelector('main[aria-label="Editor de automação"]') };
  });
  results.B_mobile_create = {
    apiListStatus: afterCreate.status(),
    automationPersisted: !!createdMobile,
    automationId: createdMobile?._id,
    returnedToListAfterSave: backToListAfterSave.listVisible && !backToListAfterSave.editorVisible,
  };
  log('B mobile create', JSON.stringify(results.B_mobile_create));

  // B2 — editar automação existente no mobile (selecionar da lista → editor full-screen)
  await mob.waitForTimeout(1000);
  const firstRow = mob.locator('aside[aria-label="Automações"] .group').first();
  let editResult = { skipped: true };
  if (await firstRow.count()) {
    await firstRow.click().catch((e) => log('row click err', e.message));
    await mob.waitForTimeout(1800);
    await mob.screenshot({ path: `${EVID}automacoes-l34r3-mobile-editor-editar.png`, fullPage: true });
    const editName = `Editado L34r3 ${TS}`;
    const nameSel = 'input[id$="-name"]';
    const hadName = await mob.inputValue(nameSel).catch(() => '');
    await mob.fill(nameSel, editName).catch((e) => log('edit fill err', e.message));
    await mob.locator('button', { hasText: /Salvar automação/i }).first().click().catch((e) => log('edit save err', e.message));
    await mob.waitForTimeout(3500);
    const afterEdit = await api.get(`${BASE}/api/automacoes`, { headers: H });
    const afterEditJson = await afterEdit.json().catch(() => ({}));
    const edited = (afterEditJson?.automations || []).find((a) => a.name === editName);
    editResult = {
      skipped: false,
      editorOpenedWithExistingName: !!hadName && hadName.length > 0,
      editPersisted: !!edited,
      editedId: edited?._id,
    };
  }
  results.B_mobile_edit = editResult;
  log('B mobile edit', JSON.stringify(editResult));

  // ===================== C. S7 — não-regressão =====================
  const regErrors = [];
  const reg1 = await context.newPage();
  reg1.on('pageerror', (e) => regErrors.push(`/c/new: ${e}`));
  await reg1.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await reg1.waitForTimeout(6000);
  await reg1.screenshot({ path: `${EVID}automacoes-l34r3-regression-chat.png` });
  const reg1Text = await reg1.evaluate(() => document.body.innerText);

  const reg2 = await context.newPage();
  reg2.on('pageerror', (e) => regErrors.push(`/d/agent-studio: ${e}`));
  await reg2.goto(`${BASE}/d/agent-studio`, { waitUntil: 'domcontentloaded' });
  await reg2.waitForTimeout(6000);
  await reg2.screenshot({ path: `${EVID}automacoes-l34r3-regression-studio.png`, fullPage: true });
  const reg2Text = await reg2.evaluate(() => document.body.innerText);

  results.C_regression = {
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
