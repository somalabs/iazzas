import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createBannerMethods } from './banner';
import bannerSchema from '~/schema/banner';
import type { IBanner, IUser } from '~/types';

let mongoServer: MongoMemoryServer;
let methods: ReturnType<typeof createBannerMethods>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  if (!mongoose.models.Banner) {
    mongoose.model<IBanner>('Banner', bannerSchema);
  }
  methods = createBannerMethods(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.models.Banner.deleteMany({});
});

describe('createBanner', () => {
  it('inserts a new document instead of upserting', async () => {
    await methods.createBanner({ message: 'same text' });
    await methods.createBanner({ message: 'same text' });

    const count = await mongoose.models.Banner.countDocuments({});
    expect(count).toBe(2);
  });

  it('generates a unique bannerId per recado, even for identical messages', async () => {
    const first = await methods.createBanner({ message: 'duplicate' });
    const second = await methods.createBanner({ message: 'duplicate' });

    expect(first.bannerId).toBeTruthy();
    expect(second.bannerId).toBeTruthy();
    expect(first.bannerId).not.toBe(second.bannerId);
  });

  it('defaults type to banner and persists provided fields', async () => {
    const popup = await methods.createBanner({
      message: 'popup recado',
      type: 'popup',
      isPublic: true,
      persistable: true,
    });

    expect(popup.type).toBe('popup');
    expect(popup.isPublic).toBe(true);
    expect(popup.persistable).toBe(true);

    const plain = await methods.createBanner({ message: 'faixa recado' });
    expect(plain.type).toBe('banner');
  });
});

describe('listBanners', () => {
  const user = { id: 'user-1' } as unknown as IUser;

  it('returns recados newest-first', async () => {
    await methods.createBanner({ message: 'first' });
    await methods.createBanner({ message: 'second' });
    await methods.createBanner({ message: 'third' });

    const banners = await methods.listBanners({ user });
    expect(banners).toHaveLength(3);
    expect(banners[0].message).toBe('third');
    expect(banners[2].message).toBe('first');
  });

  it('limits results to 10 by default', async () => {
    for (let i = 0; i < 15; i++) {
      await methods.createBanner({ message: `recado ${i}` });
    }

    const banners = await methods.listBanners({ user });
    expect(banners).toHaveLength(10);
  });

  it('respects an explicit limit', async () => {
    for (let i = 0; i < 5; i++) {
      await methods.createBanner({ message: `recado ${i}` });
    }

    const banners = await methods.listBanners({ user, limit: 3 });
    expect(banners).toHaveLength(3);
  });

  it('only returns public recados for anonymous users', async () => {
    await methods.createBanner({ message: 'public', isPublic: true });
    await methods.createBanner({ message: 'private', isPublic: false });

    const banners = await methods.listBanners({ user: null });
    expect(banners).toHaveLength(1);
    expect(banners[0].message).toBe('public');
  });
});

describe('deleteBanner', () => {
  it('removes a recado by bannerId', async () => {
    const created = await methods.createBanner({ message: 'to delete' });
    const result = await methods.deleteBanner(created.bannerId);

    expect(result.deletedCount).toBe(1);
    const count = await mongoose.models.Banner.countDocuments({});
    expect(count).toBe(0);
  });

  it('is a no-op for an unknown bannerId', async () => {
    await methods.createBanner({ message: 'keep me' });
    const result = await methods.deleteBanner('does-not-exist');

    expect(result.deletedCount).toBe(0);
    const count = await mongoose.models.Banner.countDocuments({});
    expect(count).toBe(1);
  });
});
