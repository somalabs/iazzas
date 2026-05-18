import agentFlowSchema from '~/schema/agentFlow';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IAgentFlow } from '~/types/agentFlow';

export function createAgentFlowModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(agentFlowSchema);
  return mongoose.models.AgentFlow || mongoose.model<IAgentFlow>('AgentFlow', agentFlowSchema);
}
