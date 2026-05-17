import { chromium, request as pwRequest } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://127.0.0.1:3080';
const EV = 'e2e/qa-evidence';
const MONGO = 'mongodb://127.0.0.1:27017/LibreChat';
const log = (...a) => console.log('[qa-r4]', ...a);

const u = Date.now();
const USER = {
  name: 'QA R4',
  username: `qar4${u}`,
  email: `qar4${u}@example.com`,
  password: 'QaPass!2345',
  confirm_password: 'QaPass!2345',
};

const results = {};

async function authContext() {
  let api = await pwRequest.newContext({ baseURL: BASE });
  const reg = await api.post('/api/auth/register', { data: USER });
  log('register status', reg.status());
  const login = await api.post('/api/auth/login', { data: { email: USER.email, password: USER.password } });
  log('login status', login.status());
  let token = null;
  try {
    const lj = await login.json();
    token = lj.token || lj.accessToken || null;
  } catch {
    /* ignore */
  }
  log('access token captured:', token ? 'yes' : 'NO');
  const state = await api.storageState();
  await api.dispose();
  api = await pwRequest.newContext({
    baseURL: BASE,
    storageState: state,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return api;
}

async function seedCreations(userId) {
  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
  const col = mongoose.connection.db.collection('studiocreations');
  const oid = new mongoose.Types.ObjectId(userId);
  const docs = [];
  for (let i = 0; i < 5; i++) {
    const _id = new mongoose.Types.ObjectId();
    docs.push({
      _id,
      userId: oid,
      useCase: 'color_variants',
      prompt: `R4 seed creation #${i + 1}`,
      model: 'flux-kontext',
      aspectRatio: '4:5',
      resolution: '2K',
      imageCount: 1,
      images: [{ id: `img-${i}`, url: `/img/${i}.png`, thumbnailUrl: `/img/${i}.png` }],
      referenceCount: 0,
      collectionName: null,
      status: 'done',
      createdAt: new Date(Date.now() + i * 1000),
      updatedAt: new Date(Date.now() + i * 1000),
    });
    await new Promise((r) => setTimeout(r, 5));
  }
  await col.insertMany(docs);
  const total = await col.countDocuments({ userId: oid });
  log('seeded creations for user', userId, 'total now', total);
  await mongoose.disconnect();
  return docs.length;
}

async function shot(page, name) {
  await page.screenshot({ path: `${EV}/${name}.png`, fullPage: false });
  log('shot', name);
}

(async () => {
  const api = await authContext();

  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ email: USER.email }, { projection: { _id: 1 } });
  await mongoose.disconnect();
  if (!user) {
    log('FATAL: registered user not found in mongo');
    process.exit(2);
  }
  const userId = String(user._id);
  log('user id', userId);
  await seedCreations(userId);

  // --- ITEM 3: cursor pagination beyond page 1 ---
  const p1 = await api.get('/api/studio/creations?limit=2');
  const p1b = await p1.json();
  results.page1 = { status: p1.status(), count: p1b.items?.length, nextCursor: p1b.nextCursor, ids: (p1b.items || []).map((x) => x.id) };
  log('PAGE1', JSON.stringify(results.page1));

  let p2b = {};
  if (p1b.nextCursor) {
    const p2 = await api.get(`/api/studio/creations?limit=2&cursor=${p1b.nextCursor}`);
    p2b = await p2.json();
    results.page2 = { status: p2.status(), count: p2b.items?.length, nextCursor: p2b.nextCursor, ids: (p2b.items || []).map((x) => x.id) };
    log('PAGE2', JSON.stringify(results.page2));
  }
  const overlap = (results.page1?.ids || []).filter((id) => (results.page2?.ids || []).includes(id));
  results.paginationDisjoint = overlap.length === 0 && (results.page2?.count || 0) > 0;
  log('pagination disjoint pages (no overlap, page2 has items):', results.paginationDisjoint, 'overlap:', JSON.stringify(overlap));

  // walk to a 3rd page to prove cursor keeps advancing
  if (p2b.nextCursor) {
    const p3 = await api.get(`/api/studio/creations?limit=2&cursor=${p2b.nextCursor}`);
    const p3b = await p3.json();
    results.page3 = { status: p3.status(), count: p3b.items?.length, ids: (p3b.items || []).map((x) => x.id) };
    log('PAGE3', JSON.stringify(results.page3));
  }

  // --- ITEM 3b: invalid cursor -> 400 (not 500) ---
  const badCur = await api.get('/api/studio/creations?cursor=not-a-valid-objectid');
  results.invalidCursor = { status: badCur.status(), body: await badCur.text() };
  log('INVALID CURSOR', JSON.stringify(results.invalidCursor));

  // --- ITEM 4: invalid body (unknown useCase) -> 422, not 500 ---
  const badBody = await api.post('/api/studio/generate', {
    data: { useCase: 'totally_unknown_uc', imageCount: 1, aspectRatio: '4:5', resolution: '2K' },
  });
  results.invalidUseCase = { status: badBody.status(), body: await badBody.text() };
  log('INVALID USECASE', JSON.stringify(results.invalidUseCase));

  // extra: malformed imageCount -> 422
  const badCount = await api.post('/api/studio/generate', {
    data: { useCase: 'color_variants', imageCount: 99, aspectRatio: '4:5', resolution: '2K' },
  });
  results.invalidCount = { status: badCount.status(), body: await badCount.text() };
  log('INVALID COUNT', JSON.stringify(results.invalidCount));

  // --- ITEM 2 sanity: permission gate present (unauth request blocked) ---
  const anon = await pwRequest.newContext({ baseURL: BASE });
  const anonGen = await anon.post('/api/studio/generate', {
    data: { useCase: 'color_variants', imageCount: 1, aspectRatio: '4:5', resolution: '2K' },
  });
  results.unauthGenerate = { status: anonGen.status() };
  log('UNAUTH GENERATE status', anonGen.status());
  await anon.dispose();

  // --- ITEM 5: regression via browser ---
  const state = await api.storageState();
  await api.dispose();

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(state.cookies);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/d/studio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  let body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  results.studioAuthed = !/Welcome back|Email address|Sign in/i.test(body);
  log('studio authed:', results.studioAuthed, '| head:', JSON.stringify(body.slice(0, 120)));
  await shot(page, 'studio-r4-desktop');

  // open Creations panel to confirm seeded history renders
  const creationsBtn = page.locator('button, [role="tab"]').filter({ hasText: /Cria|Creation/i }).first();
  if (await creationsBtn.count()) {
    await creationsBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await shot(page, 'studio-r4-creations');
  const seenSeed = await page.evaluate(() => /R4 seed creation/i.test(document.body.innerText));
  results.seedVisibleInUI = seenSeed;
  log('seed creations visible in UI list:', seenSeed);

  await page.goto(`${BASE}/c/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const composer = await page.locator('form textarea, [contenteditable="true"], textarea').count();
  results.chatComposer = composer > 0;
  log('chat composer present:', results.chatComposer, 'count', composer);
  await shot(page, 'studio-r4-regression-chat');

  results.pageErrors = errors;
  log('PAGE ERRORS:', errors.length ? JSON.stringify(errors) : 'NONE');

  await browser.close();
  console.log('===RESULTS===');
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
