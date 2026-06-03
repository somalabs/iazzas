import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { Bot } from 'lucide-react';
import { BaseNode } from './shared';
import type { AgentNodeData } from 'librechat-data-provider';

export default function AgentNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = (data ?? {}) as AgentNodeData;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada do Agente"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        icon={<Bot className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_agent')}
      >
        {d.agentId ? (
          <p className="truncate font-medium text-text-primary">{d.agentName || d.agentId}</p>
        ) : (
          <p className="italic text-text-tertiary">
            {localize('com_studio_flow_agent_id_placeholder')}
          </p>
        )}
      </BaseNode>
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        aria-label="Saída do Agente"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
    </div>
  );
}
