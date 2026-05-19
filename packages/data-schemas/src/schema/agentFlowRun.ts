import { Schema } from 'mongoose';
import type { IAgentFlowRun } from '~/types/agentFlow';

const agentFlowRunSchema = new Schema<IAgentFlowRun>(
  {
    flowId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentFlow',
      required: true,
    },
    automationId: {
      type: Schema.Types.ObjectId,
      ref: 'Automation',
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
      type: Schema.Types.Mixed,
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
agentFlowRunSchema.index({ tenantId: 1, automationId: 1, _id: -1 });
/**
 * At most one active (`running`|`paused`) run per (tenant, flow). `unique`
 * makes the {@link claimRun} upsert atomic: concurrent dispatches race to
 * insert and the loser gets a duplicate-key error (handled as a skip),
 * instead of both silently inserting.
 */
agentFlowRunSchema.index(
  { tenantId: 1, flowId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['running', 'paused'] } },
  },
);

export default agentFlowRunSchema;
