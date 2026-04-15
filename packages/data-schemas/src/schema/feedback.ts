import { Schema } from 'mongoose';
import { FEEDBACK_CATEGORIES, FEEDBACK_TRIGGERS, IFeedback } from '~/types/feedback';

const feedbackSchema: Schema<IFeedback> = new Schema(
  {
    conversationId: { type: String, index: true },
    messageId: { type: String, index: true },
    userMessage: { type: String },
    assistantMessage: { type: String },
    trigger: {
      type: String,
      enum: FEEDBACK_TRIGGERS,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: FEEDBACK_CATEGORIES,
      index: true,
    },
    reason: { type: String },
    modelName: { type: String, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

feedbackSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
feedbackSchema.index({ createdAt: -1 });

export default feedbackSchema;
