import { Schema } from 'mongoose';
import type { IAutomation, INotification } from '~/types/automation';

const automationSchema = new Schema<IAutomation>(
  {
    flowId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentFlow',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    cron: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'America/Sao_Paulo',
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    triggerInput: {
      type: String,
    },
    outputTargets: {
      type: [String],
      default: ['conversation', 'notification'],
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastRunAt: {
      type: Date,
    },
    lastStatus: {
      type: String,
      enum: ['running', 'success', 'failed', 'skipped'],
    },
    nextRunAt: {
      type: Date,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

automationSchema.index({ tenantId: 1, enabled: 1 });
automationSchema.index({ tenantId: 1, flowId: 1 });

export const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
    },
    link: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false,
  },
);

notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export default automationSchema;
