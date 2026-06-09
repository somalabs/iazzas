import { Plug } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { McpNodeData } from 'librechat-data-provider';

export default function McpNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = (data ?? {}) as McpNodeData;
  const summary = d.label || (d.serverName ? `${d.serverName}:${d.toolName || '…'}` : '');

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada do MCP"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        icon={<Plug className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_mcp')}
      >
        <p className="truncate font-mono text-[10px] text-text-secondary">
          {summary || localize('com_studio_flow_mcp_server_label')}
        </p>
      </BaseNode>
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        aria-label="Saída do MCP"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
    </div>
  );
}
