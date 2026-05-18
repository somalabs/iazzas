import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '~/models';

let AgentFlow: mongoose.Model<unknown>;
let AgentFlowRun: mongoose.Model<unknown>;
let mongoServer: MongoMemoryServer;
let modelsToCleanup: string[] = [];

describe('AgentFlow / AgentFlowRun models', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const models = createModels(mongoose);
    modelsToCleanup = Object.keys(models);
    Object.assign(mongoose.models, models);

    AgentFlow = mongoose.models.AgentFlow as mongoose.Model<unknown>;
    AgentFlowRun = mongoose.models.AgentFlowRun as mongoose.Model<unknown>;

    await AgentFlow.init();
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
    await AgentFlow.deleteMany({});
    await AgentFlowRun.deleteMany({});
  });

  it('registers both models', () => {
    expect(AgentFlow).toBeDefined();
    expect(AgentFlowRun).toBeDefined();
  });

  it('persists a flow with nodes/edges and timestamps', async () => {
    const flow = await AgentFlow.create({
      tenantId: 't1',
      name: 'My flow',
      nodes: [{ id: 'n1', type: 'trigger', position: { x: 0, y: 0 }, data: { type: 'trigger' } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'default' }],
    });
    const doc = flow.toObject() as Record<string, unknown>;
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
    expect((doc.nodes as unknown[]).length).toBe(1);
    expect((doc.edges as Array<{ sourceHandle?: string }>)[0].sourceHandle).toBe('default');
  });

  it('persists a run with snapshot, version and context', async () => {
    const flow = await AgentFlow.create({ tenantId: 't1', name: 'F', nodes: [], edges: [] });
    const run = await AgentFlowRun.create({
      tenantId: 't1',
      flowId: (flow as { _id: mongoose.Types.ObjectId })._id,
      status: 'running',
      input: 'hello',
      nodeRuns: [],
      context: { 'trigger.output': 'hello' },
      flowSnapshot: { name: 'F', nodes: [], edges: [] },
      flowVersion: 3,
      startedAt: new Date(),
    });
    const doc = run.toObject() as Record<string, unknown>;
    expect(doc.flowVersion).toBe(3);
    expect((doc.flowSnapshot as { name: string }).name).toBe('F');
    expect((doc.context as Record<string, string>)['trigger.output']).toBe('hello');
  });

  it('rejects an invalid run status (enum)', async () => {
    const flow = await AgentFlow.create({ tenantId: 't1', name: 'F', nodes: [], edges: [] });
    await expect(
      AgentFlowRun.create({
        tenantId: 't1',
        flowId: (flow as { _id: mongoose.Types.ObjectId })._id,
        status: 'bogus',
        flowSnapshot: { name: 'F', nodes: [], edges: [] },
        startedAt: new Date(),
      }),
    ).rejects.toBeTruthy();
  });

  it('creates the partial index on active runs (tenantId, flowId)', async () => {
    const indexes = await AgentFlowRun.collection.indexes();
    const partial = indexes.find(
      (i) => i.partialFilterExpression != null && i.key.tenantId === 1 && i.key.flowId === 1,
    );
    expect(partial).toBeDefined();
    expect(partial?.partialFilterExpression).toEqual({ status: { $in: ['running', 'paused'] } });
  });

  it('creates the history index (tenantId, flowId, startedAt desc)', async () => {
    const indexes = await AgentFlowRun.collection.indexes();
    const hist = indexes.find(
      (i) => i.key.tenantId === 1 && i.key.flowId === 1 && i.key.startedAt === -1,
    );
    expect(hist).toBeDefined();
  });
});
