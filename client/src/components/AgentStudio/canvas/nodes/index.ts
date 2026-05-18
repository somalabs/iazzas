import type { NodeTypes } from '@xyflow/react';
import TriggerNode from './TriggerNode';
import AgentNode from './AgentNode';
import ConditionNode from './ConditionNode';
import HttpNode from './HttpNode';
import ApprovalNode from './ApprovalNode';
import OutputNode from './OutputNode';

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  condition: ConditionNode,
  http: HttpNode,
  human_approval: ApprovalNode,
  output: OutputNode,
};
