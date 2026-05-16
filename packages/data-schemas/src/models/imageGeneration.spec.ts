import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runAsSystem } from '~/config/tenantContext';
import { _resetStrictCache } from '~/models/plugins/tenantIsolation';
import { createImageGenerationModel } from './imageGeneration';
import type { IImageGeneration } from '~/types';

let mongoServer: InstanceType<typeof MongoMemoryServer>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  delete process.env.TENANT_ISOLATION_STRICT;
  _resetStrictCache();
});

const Model = () => createImageGenerationModel(mongoose) as mongoose.Model<IImageGeneration>;

describe('ImageGeneration model', () => {
  it('persists a generation record with metadata and defaults', async () => {
    await runAsSystem(async () => {
      const doc = await Model().create({
        user: new Types.ObjectId(),
        useCase: 'apply_to_model',
        prompt: 'model wearing red dress',
        model: 'nano_banana_pro',
        overridden: false,
        routerReason: 'Base map',
        params: { numImages: 2, resolution: '2K', aspectRatio: '3:4' },
        outputFileIds: ['out_1', 'out_2'],
      });
      expect(doc.referenceFileIds).toEqual([]);
      expect(doc.params.numImages).toBe(2);
      expect((doc as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
    });
  });

  it('rejects a record missing required fields', async () => {
    await runAsSystem(async () => {
      await expect(
        Model().create({ user: new Types.ObjectId(), prompt: 'x' } as Partial<IImageGeneration>),
      ).rejects.toThrow();
    });
  });

  it('tracks edit lineage via parentGenerationId', async () => {
    await runAsSystem(async () => {
      const user = new Types.ObjectId();
      const parent = await Model().create({
        user,
        useCase: 'color_variants',
        prompt: 'blue colorway',
        model: 'flux_kontext',
        params: { numImages: 1 },
        outputFileIds: ['p1'],
      });
      const child = await Model().create({
        user,
        useCase: 'color_variants',
        prompt: 'make it teal',
        model: 'flux_kontext',
        params: { numImages: 1 },
        outputFileIds: ['c1'],
        parentGenerationId: parent._id,
      });
      expect(String(child.parentGenerationId)).toBe(String(parent._id));
    });
  });
});
