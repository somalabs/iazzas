import { randomUUID } from 'crypto';
import type { Model } from 'mongoose';
import logger from '~/config/winston';
import type { IBanner, IUser } from '~/types';

export type CreateBannerData = {
  message: string;
  type?: 'banner' | 'popup' | 'inbox';
  displayFrom?: Date | string | null;
  displayTo?: Date | string | null;
  isPublic?: boolean;
  persistable?: boolean;
  tenantId?: string;
  createdBy?: string;
  createdByName?: string;
};

/** A banner as exposed to a user: per-user `seen` flag, without the raw `seenBy` list. */
export type BannerView = Omit<IBanner, 'seenBy'> & { seen: boolean };

function resolveUserId(user?: IUser | null): string | null {
  if (!user) {
    return null;
  }
  const id = (user as { id?: unknown; _id?: unknown }).id ?? (user as { _id?: unknown })._id;
  return id != null ? String(id) : null;
}

export function createBannerMethods(mongoose: typeof import('mongoose')) {
  /**
   * Retrieves the current active top banner (faixa).
   */
  async function getBanner(user?: IUser | null): Promise<IBanner | null> {
    try {
      const Banner = mongoose.models.Banner as Model<IBanner>;
      const now = new Date();
      const banner = (await Banner.findOne({
        displayFrom: { $lte: now },
        $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
        type: 'banner',
      })
        .sort({ createdAt: -1 })
        .lean()) as IBanner | null;

      if (!banner || banner.isPublic || user != null) {
        return banner;
      }

      return null;
    } catch (error) {
      logger.error('[getBanner] Error getting banner', error);
      throw new Error('Error getting banner');
    }
  }

  /**
   * Creates a new recado (broadcast announcement) as its own document.
   * Each recado has a unique bannerId so the same text can be broadcast more than once.
   */
  async function createBanner(data: CreateBannerData): Promise<IBanner> {
    try {
      const Banner = mongoose.models.Banner as Model<IBanner>;
      const bannerId = randomUUID();
      const displayFrom = data.displayFrom ? new Date(data.displayFrom) : new Date();
      const displayTo = data.displayTo ? new Date(data.displayTo) : undefined;

      const created = await Banner.create({
        bannerId,
        message: data.message,
        type: data.type ?? 'banner',
        displayFrom,
        displayTo,
        isPublic: data.isPublic ?? false,
        persistable: data.persistable ?? false,
        tenantId: data.tenantId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
      });

      return created.toObject() as IBanner;
    } catch (error) {
      logger.error('[createBanner] Error creating banner', error);
      throw new Error('Error creating banner');
    }
  }

  /**
   * Lists recados newest-first for the inbox. Honors `isPublic` for anonymous users
   * the same way `getBanner` does.
   */
  async function listBanners({
    user,
    limit = 10,
  }: { user?: IUser | null; limit?: number } = {}): Promise<BannerView[]> {
    try {
      const Banner = mongoose.models.Banner as Model<IBanner>;
      const query = user != null ? {} : { isPublic: true };
      const banners = (await Banner.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()) as Array<IBanner & { seenBy?: string[] }>;

      const userId = resolveUserId(user);
      return banners.map(({ seenBy, ...banner }) => ({
        ...banner,
        seen: userId != null && Array.isArray(seenBy) ? seenBy.includes(userId) : false,
      })) as BannerView[];
    } catch (error) {
      logger.error('[listBanners] Error listing banners', error);
      throw new Error('Error listing banners');
    }
  }

  /**
   * Marks a recado as seen by a specific user (server-side, per-user). Idempotent via
   * `$addToSet`. This replaces the previous per-browser localStorage tracking so the
   * pop-up appears at most once per user, regardless of device or browser.
   */
  async function markBannerSeen(bannerId: string, userId: string): Promise<void> {
    try {
      if (!userId) {
        return;
      }
      const Banner = mongoose.models.Banner as Model<IBanner>;
      await Banner.updateOne({ bannerId }, { $addToSet: { seenBy: String(userId) } });
    } catch (error) {
      logger.error('[markBannerSeen] Error marking banner seen', error);
      throw new Error('Error marking banner seen');
    }
  }

  /**
   * Deletes a recado by its bannerId.
   */
  async function deleteBanner(bannerId: string): Promise<{ deletedCount: number }> {
    try {
      const Banner = mongoose.models.Banner as Model<IBanner>;
      const result = await Banner.deleteOne({ bannerId });
      return { deletedCount: result.deletedCount ?? 0 };
    } catch (error) {
      logger.error('[deleteBanner] Error deleting banner', error);
      throw new Error('Error deleting banner');
    }
  }

  return { getBanner, createBanner, listBanners, markBannerSeen, deleteBanner };
}

export type BannerMethods = ReturnType<typeof createBannerMethods>;
