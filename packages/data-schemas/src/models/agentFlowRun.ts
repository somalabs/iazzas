import agentFlowRunSchema from '~/schema/agentFlowRun';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IAgentFlowRun } from '~/types/agentFlow';

export function createAgentFlowRunModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(agentFlowRunSchema);
  return (
    mongoose.models.AgentFlowRun ||
    mongoose.model<IAgentFlowRun>('AgentFlowRun', agentFlowRunSchema)
  );
}
