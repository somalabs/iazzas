import { Schema } from 'mongoose';
import type { IAgentFlowRun } from '~/types/agentFlow';

const agentFlowRunSchema = new Schema<IAgentFlowRun>(
  {
    flowId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentFlow',
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'paused', 'success', 'failed', 'skipped'],
      required: true,
    },
    input: {
      type: String,
      default: '',
    },
    nodeRuns: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
    flowSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    flowVersion: {
      type: Number,
      default: 0,
    },
    pausedNodeId: {
      type: String,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

agentFlowRunSchema.index({ tenantId: 1, flowId: 1, startedAt: -1 });
agentFlowRunSchema.index(
  { tenantId: 1, flowId: 1 },
  { partialFilterExpression: { status: { $in: ['running', 'paused'] } } },
);

export default agentFlowRunSchema;
