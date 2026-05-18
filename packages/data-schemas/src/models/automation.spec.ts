import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '~/models';

let Automation: mongoose.Model<unknown>;
let Notification: mongoose.Model<unknown>;
let AgentFlow: mongoose.Model<unknown>;
let AgentFlowRun: mongoose.Model<unknown>;
let mongoServer: MongoMemoryServer;
let modelsToCleanup: string[] = [];

describe('Automation / Notification models', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const models = createModels(mongoose);
    modelsToCleanup = Object.keys(models);
    Object.assign(mongoose.models, models);

    Automation = mongoose.models.Automation as mongoose.Model<unknown>;
    Notification = mongoose.models.Notification as mongoose.Model<unknown>;
    AgentFlow = mongoose.models.AgentFlow as mongoose.Model<unknown>;
    AgentFlowRun = mongoose.models.AgentFlowRun as mongoose.Model<unknown>;

    await Automation.init();
    await Notification.init();
    await AgentFlowRun.init();
  });

  afterAll(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    for (const modelName of modelsToCleanup) {
      delete mongoose.models[modelName];
    }
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Automation.deleteMany({});
    await Notification.deleteMany({});
    await AgentFlow.deleteMany({});
    await AgentFlowRun.deleteMany({});
  });

  it('registers both models', () => {
    expect(Automation).toBeDefined();
    expect(Notification).toBeDefined();
  });

  it('applies canonical defaults (timezone, enabled, outputTargets) and timestamps', async () => {
    const flow = await AgentFlow.create({ tenantId: 't1', name: 'F', nodes: [], edges: [] });
    const automation = await Automation.create({
      tenantId: 't1',
      flowId: (flow as { _id: mongoose.Types.ObjectId })._id,
      name: 'Daily report',
      cron: '0 9 * * 1',
      createdBy: 'u1',
    });
    const doc = automation.toObject() as Record<string, unknown>;
    expect(doc.timezone).toBe('America/Sao_Paulo');
    expect(doc.enabled).toBe(true);
    expect(doc.outputTargets).toEqual(['conversation', 'notification']);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid lastStatus (enum)', async () => {
    const flow = await AgentFlow.create({ tenantId: 't1', name: 'F', nodes: [], edges: [] });
    await expect(
      Automation.create({
        tenantId: 't1',
        flowId: (flow as { _id: mongoose.Types.ObjectId })._id,
        name: 'Bad',
        cron: '0 9 * * 1',
        createdBy: 'u1',
        lastStatus: 'bogus',
      }),
    ).rejects.toBeTruthy();
  });

  it('creates the scheduling and flow indexes', async () => {
    const indexes = await Automation.collection.indexes();
    const byEnabled = indexes.find((i) => i.key.tenantId === 1 && i.key.enabled === 1);
    const byFlow = indexes.find((i) => i.key.tenantId === 1 && i.key.flowId === 1);
    expect(byEnabled).toBeDefined();
    expect(byFlow).toBeDefined();
  });

  it('persists a Notification with read defaulting to false', async () => {
    const notif = await Notification.create({
      tenantId: 't1',
      userId: 'u1',
      type: 'automation_run',
      title: 'Flow: execução concluída',
      body: 'output summary',
      link: '/d/automacoes/a1/runs/r1',
    });
    const doc = notif.toObject() as Record<string, unknown>;
    expect(doc.read).toBe(false);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeUndefined();
  });

  it('accepts automationId on a flow run and indexes it', async () => {
    const flow = await AgentFlow.create({ tenantId: 't1', name: 'F', nodes: [], edges: [] });
    const automationId = new mongoose.Types.ObjectId();
    const run = await AgentFlowRun.create({
      tenantId: 't1',
      flowId: (flow as { _id: mongoose.Types.ObjectId })._id,
      automationId,
      status: 'running',
      input: 'hello',
      nodeRuns: [],
      context: {},
      flowSnapshot: { name: 'F', nodes: [], edges: [] },
      flowVersion: 1,
      startedAt: new Date(),
    });
    const doc = run.toObject() as Record<string, unknown>;
    expect(String(doc.automationId)).toBe(String(automationId));

    const indexes = await AgentFlowRun.collection.indexes();
    const byAutomation = indexes.find(
      (i) => i.key.tenantId === 1 && i.key.automationId === 1 && i.key._id === -1,
    );
    expect(byAutomation).toBeDefined();
  });
});
