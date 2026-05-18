import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runAsSystem } from '~/config/tenantContext';
import { createStudioCreationModel } from './studio';

let mongoServer: InstanceType<typeof MongoMemoryServer>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('StudioCreation model', () => {
  it('persists a creation with images and lineage', async () => {
    const StudioCreation = createStudioCreationModel(mongoose);
    const userId = new mongoose.Types.ObjectId();

    const created = await runAsSystem(() =>
      StudioCreation.create({
        userId,
        useCase: 'color_variants',
        prompt: 'cobalt dress',
        model: 'flux-kontext',
        aspectRatio: '4:5',
        resolution: '2K',
        imageCount: 2,
        images: [
          { id: 'f1', url: 'https://cdn/f1.png', thumbnailUrl: 'https://cdn/f1-t.png' },
          { id: 'f2', url: 'https://cdn/f2.png', thumbnailUrl: 'https://cdn/f2-t.png' },
        ],
        referenceCount: 1,
        status: 'done',
        routerReason: 'Use case default (color_variants)',
        provenance: { claimGenerator: 'LibreChat-Studio/1.0' },
      }),
    );

    expect(created.images).toHaveLength(2);
    expect(created.status).toBe('done');
    expect(created.createdAt).toBeInstanceOf(Date);

    const child = await runAsSystem(() =>
      StudioCreation.create({
        userId,
        useCase: 'color_variants',
        prompt: 'editorial variant',
        model: 'nano-banana-pro',
        aspectRatio: '4:5',
        resolution: '2K',
        imageCount: 1,
        images: [{ id: 'f3', url: 'https://cdn/f3.png', thumbnailUrl: 'https://cdn/f3-t.png' }],
        referenceCount: 1,
        status: 'done',
        parentCreationId: created._id,
      }),
    );
    expect(String(child.parentCreationId)).toBe(String(created._id));
  });

  it('rejects an invalid status', async () => {
    const StudioCreation = createStudioCreationModel(mongoose);
    await expect(
      runAsSystem(() =>
        StudioCreation.create({
          userId: new mongoose.Types.ObjectId(),
          useCase: 'sketch_to_render',
          model: 'nano-banana-pro',
          aspectRatio: '4:5',
          resolution: '1K',
          status: 'bogus',
        }),
      ),
    ).rejects.toThrow();
  });
});
