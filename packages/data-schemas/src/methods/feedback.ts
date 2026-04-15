import type { Model, FilterQuery } from 'mongoose';
import logger from '~/config/winston';
import type {
  IFeedback,
  FeedbackCategory,
  FeedbackTrigger,
} from '~/types/feedback';

const RETENTION_DAYS = 90;

export interface CreateFeedbackInput {
  conversationId?: string;
  messageId?: string;
  userMessage?: string;
  assistantMessage?: string;
  trigger: FeedbackTrigger;
  category?: FeedbackCategory;
  reason?: string;
  modelName?: string;
}

export interface ListFeedbacksFilters {
  category?: FeedbackCategory;
  trigger?: FeedbackTrigger;
  modelName?: string;
  from?: Date;
  to?: Date;
}

export interface ListFeedbacksParams {
  filters?: ListFeedbacksFilters;
  limit?: number;
  offset?: number;
}

export interface ListFeedbacksResponse {
  items: IFeedback[];
  total: number;
  limit: number;
  offset: number;
}

function buildFilter(filters: ListFeedbacksFilters = {}): FilterQuery<IFeedback> {
  const query: FilterQuery<IFeedback> = {};
  if (filters.category) query.category = filters.category;
  if (filters.trigger) query.trigger = filters.trigger;
  if (filters.modelName) query.modelName = filters.modelName;
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = filters.from;
    if (filters.to) query.createdAt.$lte = filters.to;
  }
  return query;
}

export function createFeedbackMethods(mongoose: typeof import('mongoose')) {
  async function createFeedback(input: CreateFeedbackInput): Promise<IFeedback> {
    try {
      const Feedback = mongoose.models.Feedback as Model<IFeedback>;
      const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const doc = await Feedback.create({ ...input, expiresAt });
      return doc.toObject() as IFeedback;
    } catch (error) {
      logger.error('[createFeedback] Error creating feedback', error);
      throw new Error('Error creating feedback');
    }
  }

  async function listFeedbacks({
    filters,
    limit = 50,
    offset = 0,
  }: ListFeedbacksParams = {}): Promise<ListFeedbacksResponse> {
    try {
      const Feedback = mongoose.models.Feedback as Model<IFeedback>;
      const query = buildFilter(filters);
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const safeOffset = Math.max(offset, 0);

      const [items, total] = await Promise.all([
        Feedback.find(query)
          .sort({ createdAt: -1 })
          .skip(safeOffset)
          .limit(safeLimit)
          .lean() as Promise<IFeedback[]>,
        Feedback.countDocuments(query),
      ]);

      return { items, total, limit: safeLimit, offset: safeOffset };
    } catch (error) {
      logger.error('[listFeedbacks] Error listing feedbacks', error);
      throw new Error('Error listing feedbacks');
    }
  }

  async function exportFeedbacks(filters: ListFeedbacksFilters = {}): Promise<IFeedback[]> {
    try {
      const Feedback = mongoose.models.Feedback as Model<IFeedback>;
      const query = buildFilter(filters);
      const items = (await Feedback.find(query)
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean()) as IFeedback[];
      return items;
    } catch (error) {
      logger.error('[exportFeedbacks] Error exporting feedbacks', error);
      throw new Error('Error exporting feedbacks');
    }
  }

  return { createFeedback, listFeedbacks, exportFeedbacks };
}

export type FeedbackMethods = ReturnType<typeof createFeedbackMethods>;
