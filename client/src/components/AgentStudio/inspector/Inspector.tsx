import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import TriggerInspector from './TriggerInspector';
import AgentInspector from './AgentInspector';
import ConditionInspector from './ConditionInspector';
import HttpInspector from './HttpInspector';
import McpInspector from './McpInspector';
import ApprovalInspector from './ApprovalInspector';
import OutputInspector from './OutputInspector';
import type { FlowNodeData } from 'librechat-data-provider';

export default function Inspector() {
  const localize = useLocalize();
  const { state } = useFlowContext();

  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);

  return (
    <aside
      aria-label={localize('com_studio_flow_inspector_title')}
      className="flex h-full w-[280px] flex-shrink-0 flex-col border-l border-border-light bg-surface-secondary"
    >
      <div className="border-b border-border-light px-4 py-3">
        <p className="text-xs font-semibold text-text-primary">
          {localize('com_studio_flow_inspector_title')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode ? (
          <p className="text-xs text-text-tertiary">
            {localize('com_studio_flow_no_node_selected')}
          </p>
        ) : (
          renderInspector(selectedNode.id, selectedNode.data as FlowNodeData)
        )}
      </div>
    </aside>
  );
}

function renderInspector(id: string, data: FlowNodeData) {
  switch (data.type) {
    case 'trigger':
      return <TriggerInspector data={data} />;
    case 'agent':
      return <AgentInspector nodeId={id} data={data} />;
    case 'condition':
      return <ConditionInspector nodeId={id} data={data} />;
    case 'http':
      return <HttpInspector nodeId={id} data={data} />;
    case 'mcp':
      return <McpInspector nodeId={id} data={data} />;
    case 'human_approval':
      return <ApprovalInspector nodeId={id} data={data} />;
    case 'output':
      return <OutputInspector nodeId={id} data={data} />;
  }
}
