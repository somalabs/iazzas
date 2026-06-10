import { Schema } from 'mongoose';
import type { IAgentFlow } from '~/types/agentFlow';

const agentFlowSchema = new Schema<IAgentFlow>(
  {
    name: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nodes: {
      type: Schema.Types.Mixed,
      default: [],
    },
    edges: {
      type: Schema.Types.Mixed,
      default: [],
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

agentFlowSchema.index({ tenantId: 1, author: 1, updatedAt: -1 });

export default agentFlowSchema;
