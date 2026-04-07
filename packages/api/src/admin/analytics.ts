import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

export interface AdminAnalyticsDeps {
  TransactionModel: Model<mongoose.Document>;
  UserModel: Model<mongoose.Document>;
}

type GroupBy = 'day' | 'week' | 'month';

const DATE_TRUNC_EXPR: Record<GroupBy, object> = {
  day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  week: {
    $dateToString: {
      format: '%Y-%m-%d',
      date: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'monday' } },
    },
  },
  month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
};

function parseGroupBy(raw: unknown): GroupBy {
  if (raw === 'week' || raw === 'month') return raw;
  return 'day';
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function createAdminAnalyticsHandlers(deps: AdminAnalyticsDeps) {
  const { TransactionModel } = deps;

  async function getDashboard(req: ServerRequest, res: Response) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const startDate = parseDate(q.startDate);
      const endDate = parseDate(q.endDate);

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required ISO strings' });
      }

      const groupBy = parseGroupBy(q.groupBy);

      const matchStage: Record<string, unknown> = { createdAt: { $gte: startDate, $lte: endDate } };
      if (typeof q.userId === 'string' && q.userId) {
        matchStage['user'] = new mongoose.Types.ObjectId(q.userId);
      }
      if (typeof q.model === 'string' && q.model) {
        matchStage['model'] = q.model;
      }

      const dateTruncExpr = DATE_TRUNC_EXPR[groupBy];

      const [facetResult] = await TransactionModel.aggregate([
        { $match: matchStage },
        {
          $facet: {
            kpisRaw: [
              {
                $group: {
                  _id: null,
                  totalTokens: { $sum: { $abs: '$rawAmount' } },
                  totalCreditsSpent: { $sum: { $abs: '$tokenValue' } },
                  userSet: { $addToSet: '$user' },
                },
              },
            ],
            timeSeries: [
              {
                $group: {
                  _id: dateTruncExpr,
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                  userSet: { $addToSet: '$user' },
                },
              },
              {
                $project: {
                  _id: 0,
                  date: '$_id',
                  tokens: 1,
                  credits: 1,
                  activeUsers: { $size: '$userSet' },
                },
              },
              { $sort: { date: 1 } },
            ],
            byModelRaw: [
              {
                $group: {
                  _id: '$model',
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                },
              },
              { $sort: { credits: -1 } },
            ],
            topUsersRaw: [
              {
                $group: {
                  _id: '$user',
                  tokens: { $sum: { $abs: '$rawAmount' } },
                  credits: { $sum: { $abs: '$tokenValue' } },
                },
              },
              { $sort: { credits: -1 } },
              { $limit: 10 },
              {
                $lookup: {
                  from: 'users',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'userDoc',
                  pipeline: [{ $project: { name: 1, email: 1 } }],
                },
              },
            ],
          },
        },
      ]);

      const kpiRaw = facetResult?.kpisRaw?.[0] ?? {
        totalTokens: 0,
        totalCreditsSpent: 0,
        userSet: [],
      };
      const activeUsers: number = (kpiRaw.userSet as unknown[]).length;
      const kpis = {
        totalTokens: kpiRaw.totalTokens ?? 0,
        totalCreditsSpent: kpiRaw.totalCreditsSpent ?? 0,
        activeUsers,
        avgCreditsPerUser: activeUsers > 0 ? Math.round((kpiRaw.totalCreditsSpent ?? 0) / activeUsers) : 0,
      };

      const totalCredits = kpis.totalCreditsSpent;
      const byModel = ((facetResult?.byModelRaw ?? []) as Array<{
        _id: string | null;
        tokens: number;
        credits: number;
      }>).map((row) => ({
        model: row._id ?? 'unknown',
        tokens: row.tokens,
        credits: row.credits,
        percentage: totalCredits > 0 ? Math.round((row.credits / totalCredits) * 1000) / 10 : 0,
      }));

      const topUsers = ((facetResult?.topUsersRaw ?? []) as Array<{
        _id: mongoose.Types.ObjectId;
        tokens: number;
        credits: number;
        userDoc: Array<{ name?: string; email?: string }>;
      }>).map((row) => {
        const doc = row.userDoc[0] ?? {};
        return {
          userId: row._id.toString(),
          name: doc.name ?? '',
          email: doc.email ?? '',
          tokens: row.tokens,
          credits: row.credits,
        };
      });

      return res.status(200).json({
        kpis,
        timeSeries: facetResult?.timeSeries ?? [],
        byModel,
        topUsers,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy,
        },
      });
    } catch (error) {
      logger.error('[adminAnalytics] getDashboard error:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  async function getModels(_req: ServerRequest, res: Response) {
    try {
      const models = await TransactionModel.distinct('model', { model: { $ne: null } });
      return res.status(200).json({ models: (models as string[]).filter(Boolean).sort() });
    } catch (error) {
      logger.error('[adminAnalytics] getModels error:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
  }

  return {
    getDashboard,
    getModels,
  };
}
