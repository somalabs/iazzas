import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { AdminUserUsageResponse, AdminAdjustBalanceResponse } from 'librechat-data-provider';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

export interface AdminUsageDeps {
  TransactionModel: Model<mongoose.Document>;
  BalanceModel: Model<mongoose.Document>;
}

export function createAdminUsageHandlers(deps: AdminUsageDeps) {
  const { TransactionModel, BalanceModel } = deps;

  async function getUserUsageHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'startDate and endDate must be valid ISO strings' });
      }

      const rawLimit = req.query.limit;
      const rawOffset = req.query.offset;
      const limit = Math.min(
        Math.max(1, parseInt(typeof rawLimit === 'string' ? rawLimit : '20', 10) || 20),
        100,
      );
      const offset = Math.max(0, parseInt(typeof rawOffset === 'string' ? rawOffset : '0', 10) || 0);

      const userId = new mongoose.Types.ObjectId(id);
      const matchStage = { user: userId, createdAt: { $gte: start, $lte: end } };

      const [byModel, balance, totalCount] = await Promise.all([
        TransactionModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$model',
              tokens: { $sum: { $abs: '$rawAmount' } },
              credits: { $sum: { $abs: '$tokenValue' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { credits: -1 } },
        ]),
        BalanceModel.findOne({ user: userId }).lean(),
        TransactionModel.countDocuments(matchStage),
      ]);

      const transactions = await TransactionModel.find(matchStage)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select('_id createdAt model tokenType rawAmount tokenValue context note')
        .lean();

      const summary = byModel.reduce(
        (acc, row) => ({
          totalTokens: acc.totalTokens + (row.tokens ?? 0),
          totalCreditsSpent: acc.totalCreditsSpent + (row.credits ?? 0),
          transactionCount: acc.transactionCount + (row.count ?? 0),
        }),
        { totalTokens: 0, totalCreditsSpent: 0, transactionCount: 0 },
      );

      const balanceDoc = balance as
        | {
            tokenCredits?: number;
            autoRefillEnabled?: boolean;
            refillAmount?: number;
            refillIntervalValue?: number;
            refillIntervalUnit?: string;
            lastRefill?: Date;
          }
        | null
        | undefined;

      const response: AdminUserUsageResponse = {
        userId: id,
        balance: balanceDoc
          ? {
              tokenCredits: balanceDoc.tokenCredits ?? 0,
              autoRefillEnabled: balanceDoc.autoRefillEnabled,
              refillAmount: balanceDoc.refillAmount,
              refillIntervalValue: balanceDoc.refillIntervalValue,
              refillIntervalUnit: balanceDoc.refillIntervalUnit,
              lastRefill: balanceDoc.lastRefill?.toISOString(),
            }
          : null,
        summary,
        byModel: byModel.map((row) => ({
          model: row._id ?? 'unknown',
          tokens: row.tokens ?? 0,
          credits: row.credits ?? 0,
        })),
        transactions: {
          items: (transactions as mongoose.AnyObject[]).map((t) => ({
            _id: t._id?.toString() ?? '',
            createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
            model: t.model,
            tokenType: t.tokenType,
            rawAmount: t.rawAmount,
            tokenValue: t.tokenValue,
            context: t.context,
            note: t.note,
          })),
          total: totalCount,
          limit,
          offset,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('[adminUsage] getUserUsage error:', error);
      return res.status(500).json({ error: 'Failed to fetch user usage' });
    }
  }

  async function adjustBalanceHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const body = req.body as { amount?: unknown; reason?: unknown };
      const amount = typeof body.amount === 'number' ? body.amount : undefined;
      const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined;

      if (amount === undefined || amount === 0) {
        return res.status(400).json({ error: 'amount must be a non-zero number' });
      }
      if (!reason) {
        return res.status(400).json({ error: 'reason must be a non-empty string' });
      }

      const userId = new mongoose.Types.ObjectId(id);

      const [transaction, updatedBalance] = await Promise.all([
        TransactionModel.create({
          user: userId,
          tokenType: 'credits',
          context: 'admin_adjustment',
          rawAmount: amount,
          tokenValue: amount,
          note: reason,
        }),
        BalanceModel.findOneAndUpdate(
          { user: userId },
          { $inc: { tokenCredits: amount } },
          { upsert: true, new: true },
        ).lean(),
      ]);

      const t = transaction.toObject() as mongoose.AnyObject;
      const bal = updatedBalance as { tokenCredits?: number } | null;

      const response: AdminAdjustBalanceResponse = {
        newBalance: bal?.tokenCredits ?? 0,
        transaction: {
          _id: t._id?.toString() ?? '',
          createdAt:
            t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt ?? ''),
          model: t.model,
          tokenType: t.tokenType,
          rawAmount: t.rawAmount,
          tokenValue: t.tokenValue,
          context: t.context,
          note: t.note,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('[adminUsage] adjustBalance error:', error);
      return res.status(500).json({ error: 'Failed to adjust balance' });
    }
  }

  return {
    getUserUsage: getUserUsageHandler,
    adjustBalance: adjustBalanceHandler,
  };
}
