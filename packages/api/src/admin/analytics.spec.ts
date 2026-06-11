import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { transactionSchema } from '@librechat/data-schemas';
import type { Model } from 'mongoose';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';
import { createAdminAnalyticsHandlers } from './analytics';

jest.mock('@librechat/data-schemas', () => {
  const actual = jest.requireActual('@librechat/data-schemas');
  return {
    ...actual,
    logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  };
});

let mongoServer: MongoMemoryServer;
let Transaction: Model<mongoose.Document>;
let User: Model<mongoose.Document>;
let handlers: ReturnType<typeof createAdminAnalyticsHandlers>;

const userSchema = new mongoose.Schema({ name: String, email: String });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  Transaction = (mongoose.models.Transaction ||
    mongoose.model('Transaction', transactionSchema)) as Model<mongoose.Document>;
  User = (mongoose.models.User || mongoose.model('User', userSchema)) as Model<mongoose.Document>;
  handlers = createAdminAnalyticsHandlers({ TransactionModel: Transaction, UserModel: User });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

function createReqRes(query: Record<string, string> = {}) {
  const req = { query } as unknown as ServerRequest;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { req, res, status, json };
}

const userId = new mongoose.Types.ObjectId();
const day = '2026-06-10T12:00:00.000Z';

/** Spend transactions are stored with negative amounts; grants ('credits') are positive. */
async function seedTransactions() {
  await Transaction.create([
    {
      user: userId,
      conversationId: 'c1',
      tokenType: 'prompt',
      model: 'gemini-2.5-pro',
      rawAmount: -8_000_000,
      rate: 1.25,
      tokenValue: -10_000_000,
      createdAt: new Date(day),
    },
    {
      user: userId,
      conversationId: 'c1',
      tokenType: 'completion',
      model: 'gemini-2.5-pro',
      rawAmount: -100_000,
      rate: 10,
      tokenValue: -1_000_000,
      createdAt: new Date(day),
    },
    {
      user: userId,
      tokenType: 'credits',
      context: 'admin',
      rawAmount: 10_000_000,
      tokenValue: 10_000_000,
      createdAt: new Date(day),
    },
  ]);
}

const period = { startDate: '2026-06-10T00:00:00.000Z', endDate: '2026-06-10T23:59:59.999Z' };

describe('createAdminAnalyticsHandlers - getDashboard', () => {
  it('excludes credit grants from spend KPIs', async () => {
    await seedTransactions();
    const { req, res, status, json } = createReqRes(period);

    await handlers.getDashboard(req, res);

    expect(status).toHaveBeenCalledWith(200);
    const body = json.mock.calls[0][0];
    expect(body.kpis.totalCreditsSpent).toBe(11_000_000);
    expect(body.kpis.totalTokens).toBe(8_100_000);
  });

  it('does not produce an "unknown" model bucket from grants', async () => {
    await seedTransactions();
    const { req, res, json } = createReqRes(period);

    await handlers.getDashboard(req, res);

    const body = json.mock.calls[0][0];
    const models = body.byModel.map((m: { model: string }) => m.model);
    expect(models).not.toContain('unknown');
    expect(models).toEqual(['gemini-2.5-pro']);
  });

  it('attributes only real spend to top users', async () => {
    await seedTransactions();
    const { req, res, json } = createReqRes(period);

    await handlers.getDashboard(req, res);

    const body = json.mock.calls[0][0];
    expect(body.topUsers).toHaveLength(1);
    expect(body.topUsers[0].credits).toBe(11_000_000);
  });

  it('returns 400 when dates are missing', async () => {
    const { req, res, status } = createReqRes({});

    await handlers.getDashboard(req, res);

    expect(status).toHaveBeenCalledWith(400);
  });
});
