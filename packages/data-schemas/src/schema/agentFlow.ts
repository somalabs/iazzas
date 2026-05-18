import { Schema } from 'mongoose';
import type { IAgentFlow } from '~/types/agentFlow';

const agentFlowSchema = new Schema<IAgentFlow>(
  {
    name: {
      type: String,
      required: true,
    },
    nodes: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    edges: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

agentFlowSchema.index({ tenantId: 1, updatedAt: -1 });

export default agentFlowSchema;
